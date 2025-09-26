// src/pages/RestockRecordModal.jsx
import { Modal, Button, Table, Form, Offcanvas } from "react-bootstrap";
import { FaEdit, FaTrash, FaCheck, FaEye } from "react-icons/fa";
import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";

// ✅ 共用 api（已含 Token / 600 / 401 自動處理）
import api from "../utils/apiClient";

const STATUS = { DRAFT: 0, POSTED: 1, VOID: 9 };
const normalizeStatus = (s) => ([0, 1, 9].includes(Number(s)) ? Number(s) : 0);
const statusLabel = (s) =>
  s === 0 ? "暫存" : s === 1 ? "已進貨" : s === 9 ? "作廢" : "未知";
const statusBadge = (s) =>
  s === 0
    ? "badge bg-secondary"
    : s === 1
    ? "badge bg-success"
    : s === 9
    ? "badge bg-dark"
    : "badge bg-light text-dark";

export default function RestockRecordModal({ show, onHide, data = [] }) {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    setRows(Array.isArray(data) ? data : []);
  }, [data]);

  const [filter, setFilter] = useState("ALL");
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  const [hints, setHints] = useState({});
  const [hintTimers, setHintTimers] = useState({});

  const [supplierOpts, setSupplierOpts] = useState([]);
  async function loadSuppliers() {
    try {
      const { data } = await api.get("/Dropdown/GetSupplier");
      const arr = Array.isArray(data) ? data : [];
      setSupplierOpts(arr.map((x) => ({ value: x.value, label: x.label })));
    } catch {
      setSupplierOpts([]);
    }
  }
  useEffect(() => {
    if (show) loadSuppliers();
  }, [show]);

  const filtered = useMemo(() => {
    const list = (rows || []).map((x) => ({ ...x, status: normalizeStatus(x.status) }));
    if (filter === "ALL") return list;
    const want = filter === "DRAFT" ? 0 : filter === "POSTED" ? 1 : 9;
    return list.filter((x) => Number(x.status) === want);
  }, [rows, filter]);

  const openDetail = async (record, editable = false) => {
    try {
      setLoading(true);
      const { data } = await api.get(`/t_PurchaseOrder/${record.id}`);
      const rec = {
        ...data,
        status: normalizeStatus(data?.status),
        date: (data?.date || "").toString().slice(0, 10),
      };
      const items = Array.isArray(rec.items) ? rec.items : [];
      setDetail({
        record: rec,
        editable: editable && rec.status === STATUS.DRAFT,
        header: { supplierName: rec.supplierName || "", date: rec.date || "" },
        items: items.map((it) => ({
          id: it.id,
          productId: it.productId ?? 0,
          productName: it.productName ?? "",
          quantity: Number(it.quantity) || 0,
          unit: it.unit || "件",
          unitPrice: Number(it.unitPrice) || 0, // 不顯示
        })),
      });
    } catch (err) {
      Swal.fire(
        "讀取失敗",
        String(err?.response?.data?.message || err?.message || ""),
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // 供應商 inline 更新
  const findValueByLabel = (label) =>
    supplierOpts.find((o) => o.label === label)?.value ?? "";
  const updateDraftSupplier = async (row, newValue) => {
    if (newValue === "__current__") return;
    const newLabel =
      supplierOpts.find((o) => String(o.value) === String(newValue))?.label || "";
    if (!newLabel) return;
    try {
      const { data } = await api.get(`/t_PurchaseOrder/${row.id}`);
      const rec = data || {};
      const body = {
        id: rec.id,
        orderNumber: rec.orderNumber || null,
        supplierName: newLabel,
        date: (rec.date ? String(rec.date).slice(0, 10) : "") + "T00:00:00",
        createdAt: rec.createdAt || null,
        status: STATUS.DRAFT,
        note: rec.note || null,
        items: (rec.items || []).map((it) => ({
          id: it.id ?? 0,
          pickOrderId: rec.id, // 後端仍用此欄位名稱就維持
          productId: it.productId || 0,
          productName: it.productName || "",
          quantity: Number(it.quantity) || 0,
          unit: it.unit || "件",
          unitPrice: Number(it.unitPrice) || 0,
          pickOrder: null,
        })),
      };
      await api.put(`/t_PurchaseOrder/${row.id}`, body);
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, supplierName: newLabel } : r))
      );
      setDetail((d) =>
        d && d.record?.id === row.id
          ? { ...d, header: { ...d.header, supplierName: newLabel } }
          : d
      );
      Swal.fire("已更新", "暫存單供應商已修改", "success");
    } catch (err) {
      Swal.fire(
        "更新失敗",
        String(err?.response?.data?.message || err?.message || ""),
        "error"
      );
    }
  };

  // 模糊查詢
  const fetchProductHints = async (idx, keyword) => {
    try {
      if (!keyword?.trim()) {
        setHints((h) => ({ ...h, [idx]: { open: false, list: [] } }));
        return;
      }
      const { data } = await api.get("/Dropdown/GetProductList", { params: { keyword } });
      const list = Array.isArray(data) ? data : [];
      setHints((h) => ({ ...h, [idx]: { open: true, list } }));
    } catch {
      setHints((h) => ({ ...h, [idx]: { open: true, list: [] } }));
    }
  };
  const debounceFetch = (idx, term) => {
    if (hintTimers[idx]) clearTimeout(hintTimers[idx]);
    const t = setTimeout(() => fetchProductHints(idx, term), 200);
    setHintTimers((m) => ({ ...m, [idx]: t }));
  };
  const chooseHint = async (idx, hint) => {
    const label = hint?.label || "";
    const value = hint?.value;
    setDetail((d) => {
      const items = [...d.items];
      items[idx] = { ...items[idx], productId: value || 0, productName: label };
      return { ...d, items };
    });
    setHints((h) => ({ ...h, [idx]: { open: false, list: [] } }));
    try {
      const { data } = await api.get("/t_Product/QueryProducts", {
        params: { keyword: label, offset: 0, limit: 1 },
      });
      const item = Array.isArray(data?.items) && data.items[0];
      if (item) {
        setDetail((d) => {
          const arr = [...d.items];
          arr[idx] = {
            ...arr[idx],
            unit: item.unit || arr[idx].unit || "件",
            unitPrice: Number(item.price) || 0,
          };
          return { ...d, items: arr };
        });
      }
    } catch {}
  };

  const saveDraft = async () => {
    if (!detail) return;
    const ok = await Swal.fire({
      title: "儲存變更？",
      text: "將更新暫存單的明細與主檔",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "儲存",
      cancelButtonText: "取消",
    }).then((r) => r.isConfirmed);
    if (!ok) return;
    try {
      const rec = detail.record;
      const body = {
        id: rec.id,
        orderNumber: rec.orderNumber || null,
        supplierName: detail.header.supplierName || null,
        date: detail.header.date ? `${detail.header.date}T00:00:00` : null,
        createdAt: rec.createdAt || null,
        status: STATUS.DRAFT,
        note: rec.note || null,
        items: (detail.items || []).map((it) => ({
          id: it.id ?? 0,
          pickOrderId: rec.id,
          productId: it.productId || 0,
          productName: it.productName || "",
          quantity: Number(it.quantity) || 0,
          unit: it.unit || "件",
          unitPrice: Number(it.unitPrice) || 0,
          pickOrder: null,
        })),
      };
      await api.put(`/t_PurchaseOrder/${rec.id}`, body);
      await Swal.fire("已儲存", "暫存單已更新", "success");
      setDetail((d) => ({ ...d, editable: false }));
    } catch (err) {
      Swal.fire(
        "儲存失敗",
        String(err?.response?.data?.message || err?.message || ""),
        "error"
      );
    }
  };

  const postDraft = async (record) => {
    const ok = await Swal.fire({
      title: `將單號「${record.orderNumber || record.id}」進貨？`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "進貨",
      cancelButtonText: "取消",
    }).then((r) => r.isConfirmed);
    if (!ok) return;
    try {
      await api.put(`/t_PurchaseOrder/PutPurchaseStatus/${record.id}`, { status: 1 });
      await Swal.fire("進貨完成", "此暫存單已過帳", "success");
      setDetail(null);
      setRows((prev) => prev.map((r) => (r.id === record.id ? { ...r, status: 1 } : r)));
    } catch (err) {
      Swal.fire(
        "過帳失敗",
        String(err?.response?.data?.message || err?.message || ""),
        "error"
      );
    }
  };

  const deleteDraft = async (record) => {
    const ok = await Swal.fire({
      title: `刪除單號「${record.orderNumber || record.id}」？`,
      text: "此操作無法復原",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "刪除",
      cancelButtonText: "取消",
    }).then((r) => r.isConfirmed);
    if (!ok) return;
    try {
      await api.delete(`/t_PurchaseOrder/${record.id}`);
      await Swal.fire("已刪除", "暫存單已刪除", "success");
      setRows((prev) => prev.filter((r) => r.id !== record.id));
      setDetail(null);
    } catch (err) {
      Swal.fire(
        "刪除失敗",
        String(err?.response?.data?.message || err?.message || ""),
        "error"
      );
    }
  };

  return (
    <>
      <Modal show={show} onHide={onHide} size="xl" centered>
        <Modal.Header closeButton>
          <Modal.Title>進貨紀錄</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-flex align-items-center gap-2 mb-3">
            <span className="text-muted">狀態</span>
            <select
              className="form-select"
              style={{ width: 180 }}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="ALL">全部</option>
              <option value="DRAFT">暫存</option>
              <option value="POSTED">已進貨</option>
              <option value="VOID">作廢</option>
            </select>
          </div>

          <Table bordered responsive className="align-middle">
            <thead className="table-light">
              <tr>
                <th style={{ width: 180 }}>進貨單號</th>
                <th>供應商名稱</th>
                <th style={{ width: 140 }}>狀態</th>
                <th style={{ width: 140 }}>進貨日期</th>
                <th style={{ width: 260 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length ? (
                filtered.map((item) => {
                  const st = normalizeStatus(item.status);
                  const isDraft = st === STATUS.DRAFT;
                  // 供應商 select 的預設值 = 原本值；若不在清單，插入一個 "__current__" 作為顯示
                  const mappedVal = findValueByLabel(item.supplierName);
                  const selectValue = mappedVal || "__current__";
                  return (
                    <tr key={item.id}>
                      <td>{item.orderNumber || item.id}</td>
                      <td>
                        {isDraft ? (
                          <select
                            className="form-select form-select-sm"
                            value={selectValue}
                            onChange={(e) => updateDraftSupplier(item, e.target.value)}
                          >
                            {!mappedVal && (
                              <option value="__current__">
                                {item.supplierName || "—"}
                              </option>
                            )}
                            {supplierOpts.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          item.supplierName || "—"
                        )}
                      </td>
                      <td>
                        <span className={statusBadge(st)}>{statusLabel(st)}</span>
                      </td>
                      <td>{(item.date || "").toString().slice(0, 10)}</td>
                      <td className="text-nowrap">
                        {st === STATUS.POSTED && (
                          <button
                            className="btn btn-sm btn-outline-primary me-1"
                            onClick={() => openDetail(item, false)}
                          >
                            <FaEye className="me-1" /> 檢視
                          </button>
                        )}
                        {isDraft && (
                          <>
                            <button
                              className="btn btn-sm btn-outline-secondary me-1"
                              onClick={() => openDetail(item, true)}
                            >
                              <FaEdit className="me-1" /> 編輯
                            </button>
                            <button
                              className="btn btn-sm btn-success me-1"
                              onClick={() => postDraft(item)}
                            >
                              <FaCheck className="me-1" /> 進貨
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => deleteDraft(item)}
                            >
                              <FaTrash className="me-1" /> 刪除
                            </button>
                          </>
                        )}
                        {st !== STATUS.DRAFT && st !== STATUS.POSTED && (
                          <button className="btn btn-sm btn-outline-secondary" disabled>
                            已鎖定
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="text-center">
                    目前沒有符合條件的紀錄
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

      {/* 右側抽屜（在最上層） */}
      <Offcanvas
        show={!!detail}
        onHide={() => setDetail(null)}
        placement="end"
        backdrop
        scroll={false}
        style={{ width: 720, zIndex: 1065 }}
      >
        <style>{`.offcanvas-backdrop.show{ z-index:1064; opacity:.82 } .hover-bg:hover{ background:#f6f7f9 }`}</style>
        <Offcanvas.Header closeButton>
          <Offcanvas.Title className="w-full">
            進貨明細 — {detail?.record?.orderNumber || detail?.record?.id}{" "}
            <span className={statusBadge(detail?.record?.status)}>
              {statusLabel(detail?.record?.status)}
            </span>
            <div className="text-muted mt-1" style={{ fontSize: ".9rem" }}>
              供應商：{detail?.header?.supplierName || "—"}　日期：
              {detail?.header?.date || "—"}
            </div>
          </Offcanvas.Title>
        </Offcanvas.Header>

        <Offcanvas.Body className="bg-light">
          <div className="p-3 bg-white border rounded">
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
                  <tr>
                    <td colSpan={3}>讀取中…</td>
                  </tr>
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
                              onFocus={() => {
                                if (it.productName) debounceFetch(idx, it.productName);
                              }}
                              onBlur={() => {
                                setTimeout(
                                  () =>
                                    setHints((h) => ({
                                      ...h,
                                      [idx]: {
                                        open: false,
                                        list: h[idx]?.list || [],
                                      },
                                    })),
                                  200
                                );
                              }}
                            />
                            {open && (
                              <div
                                className="border rounded bg-white shadow-sm"
                                style={{
                                  position: "absolute",
                                  zIndex: 1056,
                                  top: "calc(100% - 4px)",
                                  left: 12,
                                  right: 12,
                                  maxHeight: 200,
                                  overflow: "auto",
                                }}
                              >
                                {rowHints.map((h, i) => (
                                  <div
                                    key={i}
                                    className="px-2 py-1 hover-bg"
                                    style={{ cursor: "pointer" }}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      chooseHint(idx, h);
                                    }}
                                  >
                                    {h.label}
                                    <span className="text-muted ms-2">#{h.key}</span>
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
                                  arr[idx] = {
                                    ...arr[idx],
                                    quantity: parseInt(e.target.value || 0, 10) || 0,
                                  };
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
                    <tr>
                      <td colSpan={3}>此暫存單目前沒有明細，可新增</td>
                    </tr>
                  )
                ) : (detail?.items || []).length ? (
                  detail.items.map((it, idx) => (
                    <tr key={idx}>
                      <td style={{ textAlign: "left" }}>
                        {it.productName || it.productId}
                      </td>
                      <td>{it.quantity}</td>
                      <td>{it.unit || "件"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3}>沒有明細資料</td>
                  </tr>
                )}
              </tbody>
            </Table>

            {detail?.editable && (
              <div className="d-flex justify-content-between align-items-center mt-2">
                <div className="text-muted">
                  共 {(detail?.items || []).length} 項；合計數量：
                  {(detail?.items || []).reduce(
                    (s, i) => s + (Number(i.quantity) || 0),
                    0
                  )}
                </div>
                <div className="d-flex gap-2">
                  <Button
                    variant="outline-secondary"
                    onClick={() =>
                      setDetail((d) => ({
                        ...d,
                        items: [
                          ...d.items,
                          {
                            productId: 0,
                            productName: "",
                            quantity: 0,
                            unit: "件",
                            unitPrice: 0,
                          },
                        ],
                      }))
                    }
                  >
                    + 新增商品
                  </Button>
                  <Button
                    style={{ backgroundColor: "#D68E08", border: "none" }}
                    onClick={saveDraft}
                  >
                    儲存
                  </Button>
                </div>
              </div>
            )}

            {detail?.record?.status === STATUS.DRAFT && !detail?.editable && (
              <div className="text-end mt-3">
                <Button variant="success" onClick={() => postDraft(detail.record)}>
                  <FaCheck className="me-1" /> 進貨
                </Button>
              </div>
            )}
          </div>
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
}
