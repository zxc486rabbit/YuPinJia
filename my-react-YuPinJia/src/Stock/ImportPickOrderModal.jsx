// src/pages/ImportPickOrderModal.jsx
import { useEffect, useState } from "react";
import { Modal, Button, Table, Collapse, Spinner } from "react-bootstrap";
import Swal from "sweetalert2";
import api from "../utils/apiClient";

/** 狀態常數 */
const PURCHASE_STATUS = { DRAFT: 0, POSTED: 1, VOID: 9 };
const TRANSFER_STATUS = { DRAFT: 0, SHIPPING: 1, DONE: 2, VOID: 9 };

export default function ImportPickOrderModal({
  show,
  onHide,
  onImport,
  currentStoreId, // 只撈「目標=目前門市」的調貨單
}) {
  const [sourceType, setSourceType] = useState("purchase"); // "purchase" | "transfer"
  const [list, setList] = useState([]);
  const [openRow, setOpenRow] = useState(null);
  const [loading, setLoading] = useState(false);

  // 門市名稱對照
  const [stores, setStores] = useState([]);
  const storeLabel = (id) =>
    stores.find((s) => String(s.value) === String(id))?.label ||
    String(id ?? "");

  // 讀門市清單
  const loadStores = async () => {
    try {
      const { data } = await api.get("/Dropdown/GetStoreList");
      setStores(Array.isArray(data) ? data : []);
    } catch (e) {
      setStores([]);
      console.warn("讀取門市失敗:", e);
    }
  };

  // 讀來源清單
  const load = async () => {
    setLoading(true);
    try {
      if (sourceType === "purchase") {
        const { data } = await api.get("/t_PurchaseOrder", {
          params: { offset: 0, limit: 50 },
        });
        const items = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data)
          ? data
          : [];
        setList(items.map((x) => ({ ...x, __source: "purchase" })));
      } else {
        // 調貨：只顯示「出貨中」且「目標=目前門市」
        const params = {
          offset: 0,
          limit: 50,
          toLocationId: currentStoreId,
          status: TRANSFER_STATUS.SHIPPING,
        };
        const { data } = await api.get("/t_TransferOrder", { params });
        const items = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data)
          ? data
          : [];
        setList(items.map((x) => ({ ...x, __source: "transfer" })));
      }
    } catch (e) {
      console.error("來源載入失敗:", e);
      Swal.fire("載入失敗", String(e?.response?.data?.message || e?.message || ""), "error");
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!show) return;
    loadStores();
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, sourceType, currentStoreId]);

  // 補抓某筆的「完整明細」
  const ensureFullDetail = async (row) => {
    const src = row.__source;
    const path = src === "purchase" ? "/t_PurchaseOrder" : "/t_TransferOrder";

    // 先抓單頭（通常包含 items）
    const { data } = await api.get(`${path}/${row.id}`);
    let items = Array.isArray(data?.items) ? data.items : [];

    // transfer 若仍空 → 補打一趟 item API 過濾
    if (src === "transfer" && (!items || items.length === 0)) {
      try {
        const r = await api.get("/t_TransferOrderItem");
        const all = Array.isArray(r?.data) ? r.data : [];
        items = all.filter(
          (it) => Number(it.transferOrderId) === Number(row.id)
        );
      } catch (e) {
        // ignore
      }
    }
    return { ...row, ...data, items: items || [] };
  };

  // 展開/收合明細
  const onToggleDetail = async (o) => {
    if (openRow === o.id) {
      setOpenRow(null);
      return;
    }
    try {
      const full = await ensureFullDetail(o);
      setList((prev) => prev.map((x) => (x.id === o.id ? full : x)));
      setOpenRow(o.id);
    } catch (e) {
      Swal.fire("讀取明細失敗", String(e?.response?.data?.message || e?.message || ""), "error");
    }
  };

  // 導入左側清單
  const handleImport = async (o) => {
    try {
      const current = list.find((x) => x.id === o.id) || o;
      const ready =
        current.items && current.items.length
          ? current
          : await ensureFullDetail(current);

      if (o.__source === "purchase") {
        onImport?.({
          source: "purchase",
          id: o.id,
          supplierName: ready.supplierName || "",
          items: ready.items || [],
        });
      } else {
        onImport?.({
          source: "transfer",
          id: o.id,
          toLocationId: ready.toLocationId,
          toLocationName: storeLabel(ready.toLocationId), // 供應商要帶這個名稱並鎖定
          items: ready.items || [],
        });
      }
      Swal.fire("已導入", "明細已加入左側清單", "success");
    } catch (e) {
      Swal.fire("導入失敗", String(e?.response?.data?.message || e?.message || ""), "error");
    }
  };

  // 狀態顯示
  const renderStatus = (o) => {
    if (o.__source === "purchase") {
      const s = Number(o.status);
      return s === PURCHASE_STATUS.DRAFT
        ? "暫存"
        : s === PURCHASE_STATUS.POSTED
        ? "已進貨"
        : s === PURCHASE_STATUS.VOID
        ? "作廢"
        : "未知";
    } else {
      const s = Number(o.status);
      return s === TRANSFER_STATUS.SHIPPING
        ? "出貨中"
        : s === TRANSFER_STATUS.DONE
        ? "完成"
        : s === TRANSFER_STATUS.VOID
        ? "作廢"
        : "暫存";
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>匯入進貨來源</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
          <span className="text-muted">資料來源</span>
          <select
            className="form-select"
            style={{ width: 240 }}
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value)}
          >
            <option value="purchase">進貨單（/t_PurchaseOrder）</option>
            <option value="transfer">調貨單（僅顯示：目標=目前門市 且 出貨中）</option>
          </select>

          {sourceType === "purchase" && (
            <span className="text-muted ms-2">可於列表右側檢視/導入</span>
          )}
          {sourceType === "transfer" && (
            <span className="text-muted ms-2">
              僅顯示目標=目前門市且狀態=出貨中
            </span>
          )}
        </div>

        <Table bordered responsive className="align-middle">
          <thead className="table-light">
            <tr>
              <th style={{ width: 180 }}>單號</th>
              <th>{sourceType === "purchase" ? "供應商" : "來源 → 目標"}</th>
              <th style={{ width: 140 }}>狀態</th>
              <th style={{ width: 140 }}>日期</th>
              <th style={{ width: 220 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-4">
                  <Spinner animation="border" size="sm" className="me-2" />
                  載入中…
                </td>
              </tr>
            ) : list.length ? (
              list.map((o) => (
                <FragmentRow
                  key={`${o.__source}-${o.id}`}
                  row={o}
                  open={openRow === o.id}
                  onToggle={() => onToggleDetail(o)}
                  onImport={() => handleImport(o)}
                  renderStatus={renderStatus}
                  storeLabel={storeLabel}
                />
              ))
            ) : (
              <tr>
                <td colSpan={5} className="text-center">
                  無資料
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          關閉
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

/** 抽出一列 + 可展開明細的組件，讓主體更乾淨 */
function FragmentRow({
  row,
  open,
  onToggle,
  onImport,
  renderStatus,
  storeLabel,
}) {
  return (
    <>
      <tr>
        <td>{row.orderNumber || row.id}</td>
        <td>
          {row.__source === "purchase"
            ? row.supplierName || "—"
            : `${storeLabel(row.fromLocationId)} → ${storeLabel(row.toLocationId)}`}
        </td>
        <td>{renderStatus(row)}</td>
        <td>{(row.date || "").toString().slice(0, 10)}</td>
        <td className="text-nowrap">
          <Button
            size="sm"
            variant="outline-secondary"
            className="me-2"
            onClick={onToggle}
          >
            {open ? "收合明細" : "展開明細"}
          </Button>
          <Button size="sm" variant="primary" onClick={onImport}>
            導入
          </Button>
        </td>
      </tr>

      <tr>
        <td colSpan={5} style={{ padding: 0, border: 0 }}>
          <Collapse in={open}>
            <div className="p-3 border-top bg-light">
              <div className="fw-bold mb-2">明細</div>
              <Table size="sm" bordered className="text-center mb-0">
                <thead className="table-info">
                  <tr>
                    <th>商品名稱</th>
                    <th style={{ width: 100 }}>數量</th>
                    <th style={{ width: 100 }}>單位</th>
                    <th style={{ width: 120 }}>價格</th>
                  </tr>
                </thead>
                <tbody>
                  {(row.items || []).length ? (
                    row.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="text-start">
                          {it.productName || it.productId}
                        </td>
                        <td>{it.quantity}</td>
                        <td>{it.unit || "件"}</td>
                        <td>{Number(it.unitPrice || 0).toLocaleString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4}>無明細</td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          </Collapse>
        </td>
      </tr>
    </>
  );
}
