// src/pages/Restock.jsx
import { useState, useEffect } from "react";
import { FaSearch, FaTimes } from "react-icons/fa";
import SearchField from "../components/SearchField";
import RestockRecordModal from "./RestockRecordModal";
import ImportPickOrderModal from "./ImportPickOrderModal";
import Swal from "sweetalert2";
import { useEmployee } from "../utils/EmployeeContext"; // ★ 取得目前門市

// ✅ 改用共用 api（已含 Token / 600 / 401 自動處理）
import api from "../utils/apiClient";

const STATUS = { DRAFT: 0, POSTED: 1, VOID: 9 };
const normalizeStatus = (s) => ([0, 1, 9].includes(Number(s)) ? Number(s) : 0);

export default function Restock() {
  const { user } = useEmployee(); // ★ user.storeId 即目前門市
  const currentStoreId =
    user?.storeId != null ? user.storeId : Number(localStorage.getItem("storeId")) || 0;

  const [orderId, setOrderId] = useState("none");
  const [keyword, setKeyword] = useState("");
  const [tableData, setTableData] = useState([]);
  const [inputValues, setInputValues] = useState({}); // { [productName]: { qty } }

  const [restockList, setRestockList] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [supplierId, setSupplierId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierLocked, setSupplierLocked] = useState(false); // ★ 來源為調貨時鎖定

  const [docDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [showRecordModal, setShowRecordModal] = useState(false);
  const [restockRecords, setRestockRecords] = useState([]);
  const [showImportModal, setShowImportModal] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  // ★ 記住這次導入的來源（若為調貨，進貨完成後要把調貨改成 2=完成）
  const [importedSource, setImportedSource] = useState(null); // { type: "transfer"|"purchase", id }

  async function loadProducts() {
    try {
      const params = { offset: 0, limit: 50 };
      if (keyword?.trim()) params.keyword = keyword.trim();
      const categoryId = parseInt(orderId, 10);
      if (!isNaN(categoryId)) params.categoryId = categoryId;
      const { data } = await api.get("/t_Product/QueryProducts", { params });
      const items = Array.isArray(data?.items) ? data.items : [];
      setTableData(
        items.map((x) => ({
          id: x.id,
          product: x.name,
          unit: x.unit || "件",
          price: Number(x.price) || 0,
        }))
      );
    } catch {
      setTableData([]);
    }
  }

  async function loadSuppliers() {
    try {
      const { data } = await api.get("/Dropdown/GetSupplier");
      const arr = Array.isArray(data) ? data : [];
      setSuppliers(arr.map((x) => ({ id: x.value, name: x.label })));
    } catch {
      setSuppliers([]);
    }
  }

  useEffect(() => {
    loadProducts();
    loadSuppliers();
  }, []);

  const handleSearch = () => loadProducts();

  const handleAdd = (item) => {
    const row = inputValues[item.product] || {};
    const quantity = parseInt(row.qty, 10);
    if (isNaN(quantity) || quantity <= 0) return;
    const unit = item.unit || "件";

    setRestockList((prev) => {
      const hit = prev.find((p) => p.product === item.product && p.unit === unit);
      if (hit) {
        return prev.map((p) =>
          p.product === item.product && p.unit === unit
            ? { ...p, quantity: p.quantity + quantity }
            : p
        );
      }
      return [
        ...prev,
        {
          productId: item.id,
          product: item.product,
          quantity,
          unit,
          unitPrice: Number(item.price) || 0,
          supplier: supplierName || "-",
        },
      ];
    });

    setInputValues((prev) => ({ ...prev, [item.product]: { qty: "" } }));
  };

  const handleDelete = (product, unit) => {
    Swal.fire({
      title: `確定刪除「${product}（${unit}）」？`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "刪除",
      cancelButtonText: "取消",
    }).then((res) => {
      if (res.isConfirmed) {
        setRestockList((prev) => prev.filter((x) => !(x.product === product && x.unit === unit)));
      }
    });
  };

  async function fetchRecords(params = {}) {
    try {
      const { data } = await api.get("/t_PurchaseOrder", {
        params: { offset: 0, limit: 50, ...params },
      });
      const items = Array.isArray(data?.items) ? data.items : [];
      setRestockRecords(items.map((x) => ({ ...x, status: normalizeStatus(x.status) })));
    } catch {
      setRestockRecords([]);
    }
  }

  const totalQty = restockList.reduce((s, it) => s + (Number(it.quantity) || 0), 0);

  const saveDraft = async () => {
    if (!supplierName) return Swal.fire("請先選擇供應商", "", "info");
    if (!restockList.length) return Swal.fire("無資料", "請先加入商品後再暫存", "info");
    if (savingDraft) return;
    setSavingDraft(true);
    try {
      const items = restockList.map((x) => ({
        productId: x.productId || 0,
        productName: x.product,
        quantity: Number(x.quantity) || 0,
        unit: x.unit || "件",
        unitPrice: Number(x.unitPrice) || 0,
      }));
      const body = { supplierName, date: `${docDate}T00:00:00`, status: 0, items };
      const { data } = await api.post("/t_PurchaseOrder", body);
      setRestockList([]);
      setImportedSource(null);
      setSupplierLocked(false);
      Swal.fire("已暫存", `單號：${data?.orderNumber || data?.id || "—"}`, "success");
      await fetchRecords();
    } catch (e) {
      Swal.fire("暫存失敗", String(e?.response?.data?.message || e?.message || ""), "error");
    } finally {
      setSavingDraft(false);
    }
  };

  const submitPickOrder = async () => {
    if (!supplierName) return Swal.fire("請先選擇供應商", "", "info");
    if (!restockList.length) return Swal.fire("無進貨資料", "請先添加進貨明細後再進貨", "info");

    const ok = await Swal.fire({
      title: "確認進貨？",
      html: `供應商：<b>${supplierName}</b><br/>共 <b>${totalQty}</b> 件商品`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "進貨",
      cancelButtonText: "取消",
    }).then((r) => r.isConfirmed);
    if (!ok) return;

    if (submitting) return;
    setSubmitting(true);
    try {
      // 1) 產生進貨單
      const items = restockList.map((x) => ({
        productId: x.productId || 0,
        productName: x.product,
        quantity: Number(x.quantity) || 0,
        unit: x.unit || "件",
        unitPrice: Number(x.unitPrice) || 0,
      }));
      const body = { supplierName, date: `${docDate}T00:00:00`, status: 0, items };
      const { data: created } = await api.post("/t_PurchaseOrder", body);
      // 2) 過帳（已進貨）
      await api.put(`/t_PurchaseOrder/PutPurchaseStatus/${created.id}`, { status: 1 });

      // 3) 若來源是「調貨」，把原調貨單狀態改為 2=完成
      if (importedSource?.type === "transfer" && importedSource?.id) {
        try {
          await api.put(`/t_TransferOrder/PutTransferStatus/${importedSource.id}`, {
            status: 2,
          });
        } catch {
          await api.put(`/t_TransferOrder/PutPickStatus/${importedSource.id}`, {
            status: 2,
          });
        }
      }

      setRestockList([]);
      setImportedSource(null);
      setSupplierLocked(false);

      Swal.fire("進貨完成", `單號：${created?.orderNumber || created?.id || "—"}`, "success");
      await fetchRecords();
    } catch (e) {
      Swal.fire("送出失敗", String(e?.response?.data?.message || e?.message || ""), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const openRecordModal = async () => {
    await fetchRecords();
    setShowRecordModal(true);
  };

  // ★ 從「匯入進貨來源」導入
  const importToLeft = async (payload) => {
    const {
      source,
      id,
      supplierName: fromSupplierName,
      items,
      toLocationId,
      toLocationName,
    } = payload || {};
    const importedItems = Array.isArray(items) ? items : [];
    if (!importedItems.length) {
      return Swal.fire("無明細可導入", "此單沒有可用明細", "info");
    }

    // 若來源為調貨：供應商 = 目標門市，且鎖定
    if (source === "transfer") {
      setImportedSource({ type: "transfer", id });
      const name = toLocationName || "—";
      setSupplierName(name);
      setSupplierLocked(true);

      // 供應商下拉帶入該名稱（若清單裡有）
      const match = suppliers.find((s) => s.name === name);
      setSupplierId(match ? String(match.id) : "");
    } else {
      // 來源為進貨單：不鎖供應商
      setImportedSource({ type: "purchase", id });
      if (fromSupplierName) {
        setSupplierName(fromSupplierName);
        const match = suppliers.find((s) => s.name === fromSupplierName);
        setSupplierId(match ? String(match.id) : "");
      }
      setSupplierLocked(false);
    }

    // 導入明細
    setRestockList((prev) => {
      const next = [...prev];
      importedItems.forEach((it) => {
        const name = it.productName || `#${it.productId || ""}`;
        const unit = (it.unit || "件").trim();
        const qty = Number(it.quantity) || 0;
        const price = Number(it.unitPrice) || 0;
        if (qty <= 0) return;
        const hit = next.find((p) => p.product === name && p.unit === unit);
        if (hit) hit.quantity += qty;
        else
          next.push({
            productId: it.productId || 0,
            product: name,
            quantity: qty,
            unit,
            unitPrice: price,
            supplier: supplierName || fromSupplierName || toLocationName || "-",
          });
      });
      return next;
    });

    Swal.fire("已導入", "明細已加入左側進貨清單", "success");
    setShowImportModal(false);
  };

  const onSupplierChange = (e) => {
    if (supplierLocked) return; // ★ 鎖定時不可改
    const id = e.target.value;
    setSupplierId(id);
    const pick = suppliers.find((s) => String(s.id) === String(id));
    setSupplierName(pick?.name || "");
    setRestockList((prev) => prev.map((x) => ({ ...x, supplier: pick?.name || "-" })));
  };

  return (
    <div className="container-fluid">
      <div className="row">
        {/* 左側 */}
        <div className="col-4 d-flex flex-column" style={{ background: "#fff", height: "89vh" }}>
          <div className="flex-grow-1">
            <div className="d-flex justify-content-between align-items-center my-3 mx-4">
              <h4 className="fw-bold m-0">進貨明細</h4>
              <div className="d-flex gap-2">
                <button className="add-button" onClick={() => setShowImportModal(true)}>
                  匯入進貨單
                </button>
                <button
                  className="add-button"
                  style={{ background: "#D68E08" }}
                  onClick={openRecordModal}
                >
                  進貨紀錄
                </button>
              </div>
            </div>

            <table className="table mb-2" style={{ fontSize: "1.1rem" }}>
              <thead className="table-light" style={{ borderTop: "1px solid #c5c6c7" }}>
                <tr>
                  <th className="text-center">商品名稱</th>
                  <th className="text-center" style={{ width: 90 }}>
                    數量
                  </th>
                  <th className="text-center" style={{ width: 80 }}>
                    單位
                  </th>
                  <th className="text-center" style={{ width: 70 }}>
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {restockList.length ? (
                  restockList.map((item, idx) => (
                    <tr key={`${item.product}-${item.unit}-${idx}`}>
                      <td className="text-center">{item.product}</td>
                      <td className="text-center">{item.quantity}</td>
                      <td className="text-center">{item.unit || "件"}</td>
                      <td className="text-center">
                        <FaTimes
                          onClick={() => handleDelete(item.product, item.unit)}
                          style={{ color: "red", cursor: "pointer", fontSize: "1rem" }}
                          title="刪除"
                        />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="text-center text-muted" colSpan={4}>
                      尚未加入任何商品
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mx-4 mb-2">
            <label className="form-label mb-1">供應商</label>
            <select
              className="form-select"
              value={supplierId}
              onChange={onSupplierChange}
              disabled={supplierLocked} // ★ 來源為調貨時鎖定
              title={supplierLocked ? "已由調貨目標門市鎖定" : ""}
            >
              {!supplierId && supplierLocked && supplierName && (
                <option value="__locked__">{supplierName}</option>
              )}
              <option value="">請選擇供應商</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div
            className="d-flex justify-content-between gap-2 mx-4 align-items-center py-3"
            style={{
              fontSize: "1.2rem",
              fontWeight: "bold",
              lineHeight: "1.8",
              borderTop: "2px solid #E2E2E2",
            }}
          >
            <span>商品總數 : {totalQty} 件</span>
            <div className="d-flex gap-2">
              <button className="btn btn-outline-secondary" onClick={saveDraft} disabled={savingDraft}>
                {savingDraft ? "暫存中…" : "暫存"}
              </button>
              <button className="cargo-button" onClick={submitPickOrder} disabled={submitting}>
                {submitting ? "送出中…" : "進貨"}
              </button>
            </div>
          </div>
        </div>

        {/* 右側 商品列表 */}
        <div className="col-8">
          <div className="search-container d-flex gap-3 px-5 pt-4 pb-3">
            <SearchField
              type="select"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              options={[
                { value: "none", label: "請選擇商品種類" },
                { value: "1", label: "澎湖特色土產海產類" },
                { value: "2", label: "自製糕餅類" },
                { value: "3", label: "澎湖冷凍海鮮產品類" },
                { value: "4", label: "澎湖海產(乾貨)類" },
              ]}
            />
            <div className="search-bar ms-auto">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="搜尋..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
            <button onClick={handleSearch} className="search-button">
              搜尋
            </button>
          </div>

          <div style={{ height: "76vh", overflow: "auto" }}>
            <table
              className="table mx-auto text-center"
              style={{ fontSize: "1.2rem", border: "1px solid #D7D7D7", width: "90%" }}
            >
              <thead
                className="table-info"
                style={{
                  borderTop: "1px solid #c5c6c7",
                  position: "sticky",
                  top: 0,
                  background: "#d1ecf1",
                  zIndex: 1,
                }}
              >
                <tr>
                  <th>商品名稱</th>
                  <th style={{ width: 120 }}>數量</th>
                  <th style={{ width: 120 }}>單位</th>
                  <th style={{ width: 120 }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {tableData.length ? (
                  tableData.map((item, i) => {
                    const val = inputValues[item.product] || { qty: "" };
                    return (
                      <tr key={i}>
                        <td>{item.product}</td>
                        <td>
                          <input
                            className="text-center form-control"
                            type="number"
                            value={val.qty}
                            onChange={(e) =>
                              setInputValues((prev) => ({
                                ...prev,
                                [item.product]: { qty: e.target.value },
                              }))
                            }
                          />
                        </td>
                        <td>{item.unit || "件"}</td>
                        <td>
                          <button className="add-button me-2" onClick={() => handleAdd(item)}>
                            加入
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="12">無資料</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <RestockRecordModal
        show={showRecordModal}
        onHide={() => setShowRecordModal(false)}
        data={restockRecords}
      />

      {/* ★ 傳入 currentStoreId，調貨僅列出：目標=目前門市 & 出貨中 */}
      <ImportPickOrderModal
        show={showImportModal}
        onHide={() => setShowImportModal(false)}
        onImport={importToLeft}
        currentStoreId={currentStoreId}
      />
    </div>
  );
}
