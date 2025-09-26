import { Modal, Button, Table, Form, Offcanvas } from "react-bootstrap";
import { FaEdit, FaTrash, FaCheck, FaEye } from "react-icons/fa";
import { useEffect, useMemo, useState } from "react";
// ❌ 移除：import axios from "axios";
import Swal from "sweetalert2";

// ✅ 改用共用 api（有 Token/refresh/600 處理）
import api from "../utils/apiClient";

/** 調貨狀態：0=暫存, 1=出貨中, 2=完成, 9=作廢 */
const STATUS = {
  0: { text: "暫存" },
  1: { text: "出貨中" },
  2: { text: "完成" },
  9: { text: "作廢" },
};
const normalize = (s) => ([0, 1, 2, 9].includes(Number(s)) ? Number(s) : 0);
const statusBadge = (s) =>
  (s === 0 && "badge bg-secondary") ||
  (s === 1 && "badge bg-warning text-dark") ||
  (s === 2 && "badge bg-success") ||
  (s === 9 && "badge bg-dark") ||
  "badge bg-light text-dark";

/** 讓 SweetAlert2 永遠在最上層 */
const swalTop = (options = {}) =>
  Swal.fire({
    ...options,
    customClass: {
      ...(options.customClass || {}),
      container: `swal2-ontop ${options.customClass?.container || ""}`,
    },
  });

/** 嘗試新舊兩種狀態更新端點 */
async function updateTransferStatus(id, status) {
  try {
    await api.put(`/t_TransferOrder/PutTransferStatus/${id}`, { status });
  } catch {
    await api.put(`/t_TransferOrder/PutPickStatus/${id}`, { status });
  }
}

export default function AdjustRecordModal({ show, onHide }) {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [detail, setDetail] = useState(null);   // { record, editable, header, items }
  const [loading, setLoading] = useState(false);

  // 門市清單（顯示與下拉）
  const [stores, setStores] = useState([]);
  const storeLabel = (id) =>
    stores.find((s) => String(s.value) === String(id))?.label || String(id ?? "");

  useEffect(() => {
    if (show) {
      fetchList();
      loadStores();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  async function loadStores() {
    try {
      const { data } = await api.get("/Dropdown/GetStoreList");
      setStores(Array.isArray(data) ? data : []);
    } catch {
      setStores([]);
    }
  }

  async function fetchList() {
    try {
      const { data } = await api.get("/t_TransferOrder", {
        params: { offset: 0, limit: 50 },
      });
      const items = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data)
        ? data
        : [];
      setRows(items.map((r) => ({ ...r, status: normalize(r.status) })));
    } catch (e) {
      console.error(e);
      setRows([]);
    }
  }

  const filtered = useMemo(() => {
    if (filter === "ALL") return rows;
    const want =
      filter === "DRAFT" ? 0 : filter === "SHIPPING" ? 1 : filter === "DONE" ? 2 : 9;
    return rows.filter((x) => normalize(x.status) === want);
  }, [rows, filter]);

  /** 可靠讀取單頭 + 明細 */
  const loadDetail = async (id, editable = false) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/t_TransferOrder/${id}`);
      const rec = {
        ...data,
        status: normalize(data?.status),
        date: (data?.date || "").toString().slice(0, 10),
      };

      let items = Array.isArray(rec.items) ? rec.items : [];
      if (!items.length) {
        try {
          const respItems = await api.get(`/t_TransferOrderItem`);
          const all = Array.isArray(respItems?.data) ? respItems.data : [];
          items = all.filter((x) => Number(x.transferOrderId) === Number(id));
        } catch {
          // ignore
        }
      }

      setDetail({
        record: rec,
        editable: editable && rec.status === 0, // 只有暫存可編輯
        header: {
          from: rec.fromLocationId,
          to: rec.toLocationId,
          date: rec.date || "",
          note: rec.note || "",
        },
        items: (items || []).map((it) => ({
          id: it.id,
          productId: it.productId ?? 0,
          productNumber: it.productNumber ?? "",
          productName: it.productName ?? "",
          quantity: Number(it.quantity) || 0,
          unit: it.unit || "件",
          unitPrice: Number(it.unitPrice) || 0,
          cost: Number(it.cost) || 0,
        })),
      });
    } catch (err) {
      await swalTop({
        title: "讀取失敗",
        text: String(err?.response?.data?.message || err?.message || ""),
        icon: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (row, editable = false) => {
    await loadDetail(row.id, editable);
  };

  // 刪除草稿
  const deleteDraft = async (row) => {
    const ok = await swalTop({
      title: `刪除「${row.orderNumber || row.id}」？`,
      text: "此操作無法復原",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "刪除",
      cancelButtonText: "取消",
    }).then((r) => r.isConfirmed);
    if (!ok) return;

    try {
      await api.delete(`/t_TransferOrder/${row.id}`);
      await swalTop({ title: "已刪除", icon: "success" });
      setRows((prev) => prev.filter((x) => x.id !== row.id));
      if (detail?.record?.id === row.id) setDetail(null);
    } catch (e) {
      await swalTop({
        title: "刪除失敗",
        text: String(e?.response?.data?.message || e?.message || ""),
        icon: "error",
      });
    }
  };

  // 暫存 → 出貨中
  const postDraft = async (record) => {
    const ok = await swalTop({
      title: `將單號「${record.orderNumber || record.id}」設定為出貨中？`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "出貨中",
      cancelButtonText: "取消",
    }).then((r) => r.isConfirmed);
    if (!ok) return;

    try {
      await updateTransferStatus(record.id, 1);
      await swalTop({ title: "已更新", text: "狀態：出貨中", icon: "success" });
      setDetail(null);
      setRows((prev) =>
        prev.map((r) => (r.id === record.id ? { ...r, status: 1 } : r))
      );
    } catch (err) {
      await swalTop({
        title: "更新失敗",
        text: String(err?.response?.data?.message || err?.message || ""),
        icon: "error",
      });
    }
  };

  // 暫存單：inline 更新「目標門市」
  const updateDraftTargetStore = async (row, newToId) => {
    if (!newToId) return;
    try {
      const { data: rec } = await api.get(`/t_TransferOrder/${row.id}`);

      const body = {
        id: rec.id,
        orderNumber: rec.orderNumber || null,
        fromLocationId: rec.fromLocationId,
        toLocationId: Number(newToId),
        date: (rec.date ? String(rec.date).slice(0, 10) : "") + "T00:00:00",
        status: 0,
        note: rec.note || null,
        items: (rec.items || []).map((it) => ({
          id: it.id ?? 0,
          transferOrderId: rec.id,
          productId: it.productId || 0,
          productNumber: it.productNumber || "",
          productName: it.productName || "",
          quantity: Number(it.quantity) || 0,
          unit: it.unit || "件",
          cost: Number(it.cost) || 0,
          unitPrice: Number(it.unitPrice) || 0,
          note: it.note || null,
        })),
      };

      await api.put(`/t_TransferOrder/${row.id}`, body);

      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id ? { ...r, toLocationId: Number(newToId) } : r
        )
      );
      setDetail((d) =>
        d && d.record?.id === row.id
          ? { ...d, header: { ...d.header, to: Number(newToId) } }
          : d
      );

      await swalTop({ title: "已更新", text: "暫存單目標門市已修改", icon: "success" });
    } catch (err) {
      await swalTop({
        title: "更新失敗",
        text: String(err?.response?.data?.message || err?.message || ""),
        icon: "error",
      });
    }
  };

  return (
    <>
      {/* 讓 SweetAlert 在最上層 */}
      <style>{`.swal2-container.swal2-ontop{ z-index:200000 !important }`}</style>

      {/* 列表 Modal */}
      <Modal show={show} onHide={onHide} size="xl" centered>
        <Modal.Header closeButton><Modal.Title>調貨紀錄</Modal.Title></Modal.Header>
        <Modal.Body>
          <div className="d-flex align-items-center gap-2 mb-3">
            <span className="text-muted">狀態</span>
            <select
              className="form-select"
              style={{ width: 200 }}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="ALL">全部</option>
              <option value="DRAFT">暫存</option>
              <option value="SHIPPING">出貨中</option>
              <option value="DONE">完成</option>
              <option value="VOID">作廢</option>
            </select>
          </div>

          <Table bordered responsive className="align-middle">
            <thead className="table-light">
              <tr>
                <th style={{ width: 180 }}>調貨單號</th>
                <th>來源 → 目標</th>
                <th style={{ width: 140 }}>狀態</th>
                <th style={{ width: 140 }}>日期</th>
                <th style={{ width: 260 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length ? filtered.map((item) => {
                const st = normalize(item.status);
                const isDraft = st === 0;
                return (
                  <tr key={item.id}>
                    <td>{item.orderNumber || item.id}</td>
                    <td className="text-nowrap">
                      {storeLabel(item.fromLocationId)} →
                      {" "}
                      {isDraft ? (
                        <select
                          className="form-select form-select-sm d-inline-block ms-2"
                          style={{ width: 180 }}
                          value={item.toLocationId ?? ""}
                          onChange={(e) => updateDraftTargetStore(item, e.target.value)}
                        >
                          {stores
                            .filter((s) => String(s.value) !== String(item.fromLocationId))
                            .map((s) => (
                              <option key={s.value} value={String(s.value)}>
                                {s.label}
                              </option>
                            ))}
                        </select>
                      ) : (
                        <span className="ms-2">{storeLabel(item.toLocationId)}</span>
                      )}
                    </td>
                    <td><span className={statusBadge(st)}>{STATUS[st]?.text || "—"}</span></td>
                    <td>{(item.date || "").toString().slice(0, 10)}</td>
                    <td className="text-nowrap">
                      {isDraft ? (
                        <>
                          <button className="btn btn-sm btn-outline-secondary me-1" onClick={() => openDetail(item, true)}>
                            <FaEdit className="me-1" /> 編輯
                          </button>
                          <button className="btn btn-sm btn-success me-1" onClick={() => postDraft(item)}>
                            <FaCheck className="me-1" /> 出貨中
                          </button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => deleteDraft(item)}>
                            <FaTrash className="me-1" /> 刪除
                          </button>
                        </>
                      ) : (
                        <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openDetail(item, false)}>
                          <FaEye className="me-1" /> 檢視
                        </button>
                      )}
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={5} className="text-center">目前沒有符合條件的紀錄</td></tr>
              )}
            </tbody>
          </Table>
        </Modal.Body>
        <Modal.Footer><Button variant="secondary" onClick={onHide}>關閉</Button></Modal.Footer>
      </Modal>

      {/* 右側抽屜 */}
      <Offcanvas
        show={!!detail}
        onHide={() => setDetail(null)}
        placement="end"
        backdrop
        scroll={false}
        style={{ width: 760, zIndex: 1065 }}
      >
        <style>{`.offcanvas-backdrop.show{ z-index:1064; opacity:.82 } .hover-bg:hover{ background:#f6f7f9 }`}</style>
        <Offcanvas.Header closeButton>
          <Offcanvas.Title className="w-full">
            調貨明細 — {detail?.record?.orderNumber || detail?.record?.id}{" "}
            <span className={statusBadge(detail?.record?.status)}>{STATUS[detail?.record?.status]?.text}</span>
            <div className="text-muted mt-1" style={{ fontSize: ".9rem" }}>
              來源：{storeLabel(detail?.header?.from)}　→　目標：{storeLabel(detail?.header?.to)}　　日期：{detail?.header?.date || "—"}
            </div>
          </Offcanvas.Title>
        </Offcanvas.Header>

        <Offcanvas.Body className="bg-light">
          <div className="p-3 bg-white border rounded">
            <div className="row g-3 mb-2">
              <div className="col-12">
                <Form.Label>備註</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={detail?.header?.note || ""}
                  onChange={(e) =>
                    setDetail((d) => ({ ...d, header: { ...d.header, note: e.target.value } }))
                  }
                  disabled={!detail?.editable}
                />
              </div>
            </div>

            <Table bordered className="align-middle text-center">
              <thead className="table-info">
                <tr>
                  <th>商品名稱（可模糊查詢）</th>
                  <th style={{ width: 140 }}>數量</th>
                  <th style={{ width: 140 }}>單位</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={3}>讀取中…</td></tr>
                ) : detail?.editable ? (
                  (detail?.items || []).length ? (
                    detail.items.map((it, idx) => {
                      const rowHints = hints[idx]?.list || [];
                      const open = hints[idx]?.open && rowHints.length > 0;
                      return (
                        <tr key={idx} style={{ position: "relative" }}>
                          <td style={{ textAlign: "left" }}>
                            <Form.Control
                              type="text"
                              value={it.productName}
                              placeholder="輸入商品名稱（支援模糊查詢）"
                              onChange={(e) => {
                                const v = e.target.value;
                                setDetail((d) => {
                                  const arr = [...d.items];
                                  arr[idx] = { ...arr[idx], productName: v };
                                  return { ...d, items: arr };
                                });
                                if (v) debounceFetch(idx, v);
                              }}
                              onFocus={() => { if (it.productName) debounceFetch(idx, it.productName); }}
                              onBlur={() => { setTimeout(() => setHints((h) => ({ ...h, [idx]: { open: false, list: h[idx]?.list || [] } })), 200); }}
                            />
                            {open && (
                              <div className="border rounded bg-white shadow-sm" style={{ position:"absolute", zIndex:1056, top:"calc(100% - 4px)", left:12, right:12, maxHeight:200, overflow:"auto" }}>
                                {rowHints.map((h, i) => (
                                  <div
                                    key={i}
                                    className="px-2 py-1 hover-bg"
                                    style={{ cursor:"pointer" }}
                                    onMouseDown={(e) => { e.preventDefault(); chooseHint(idx, h); }}
                                  >
                                    {h.label}<span className="text-muted ms-2">#{h.key}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td>
                            <Form.Control
                              type="number"
                              value={it.quantity}
                              onChange={(e) =>
                                setDetail((d) => {
                                  const arr = [...d.items];
                                  arr[idx] = { ...arr[idx], quantity: parseInt(e.target.value || 0, 10) || 0 };
                                  return { ...d, items: arr };
                                })
                              }
                            />
                          </td>
                          <td>
                            <Form.Control
                              type="text"
                              value={it.unit}
                              placeholder="件 / 箱 / 包"
                              onChange={(e) =>
                                setDetail((d) => {
                                  const arr = [...d.items];
                                  arr[idx] = { ...arr[idx], unit: e.target.value || "件" };
                                  return { ...d, items: arr };
                                })
                              }
                            />
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr><td colSpan={3}>此暫存單目前沒有明細，可新增</td></tr>
                  )
                ) : (detail?.items || []).length ? (
                  detail.items.map((it, idx) => (
                    <tr key={idx}>
                      <td style={{ textAlign: "left" }}>{it.productName || it.productId}</td>
                      <td>{it.quantity}</td>
                      <td>{it.unit || "件"}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={3}>沒有明細資料</td></tr>
                )}
              </tbody>
            </Table>

            {detail?.editable && (
              <div className="d-flex justify-content-between align-items-center mt-2">
                <div className="text-muted">
                  共 {(detail?.items || []).length} 項；合計數量：
                  {(detail?.items || []).reduce((s, i) => s + (Number(i.quantity) || 0), 0)}
                </div>
                <div className="d-flex gap-2">
                  <Button
                    variant="outline-secondary"
                    onClick={() =>
                      setDetail((d) => ({
                        ...d,
                        items: [
                          ...d.items,
                          { productId: 0, productName: "", productNumber: "", quantity: 0, unit: "件", unitPrice: 0, cost: 0 },
                        ],
                      }))
                    }
                  >
                    + 新增商品
                  </Button>
                  <Button style={{ backgroundColor: "#D68E08", border: "none" }} onClick={saveDraft}>
                    儲存
                  </Button>
                </div>
              </div>
            )}

            {detail?.record?.status === 0 && !detail?.editable && (
              <div className="text-end mt-3">
                <Button variant="success" onClick={() => postDraft(detail.record)}>
                  <FaCheck className="me-1" /> 出貨中
                </Button>
              </div>
            )}
          </div>
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
}
