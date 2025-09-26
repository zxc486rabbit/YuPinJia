import { useState, useEffect, useMemo } from "react";
// ❌ 移除：import axios from "axios";
import Swal from "sweetalert2";
import { FaSearch, FaTimes } from "react-icons/fa";
import SearchField from "../components/SearchField";
import AdjustRecordModal from "./AdjustRecordModal";
import { useEmployee } from "../utils/EmployeeContext";

// ✅ 改用共用 api（內含 Token/600/401 自動處理）
import api from "../utils/apiClient";

// 狀態常數
const TRANSFER_STATUS = { DRAFT: 0, SHIPPING: 1, DONE: 2, VOID: 9 };
const normalizeTransferStatus = (s) =>
  ([0, 1, 2, 9].includes(Number(s)) ? Number(s) : 0);

export default function Adjust() {
  const { user } = useEmployee(); // user.storeId / user.storeName

  // ====== 基本狀態 ======
  const [orderId, setOrderId] = useState("");
  const [products, setProducts] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [inputValues, setInputValues] = useState({});
  const [adjustList, setAdjustList] = useState([]);
  const [showModal, setShowModal] = useState(false);

  // ====== 門市下拉（來源/目標）======
  const [stores, setStores] = useState([]);             
  const [fromStoreId, setFromStoreId] = useState("");   
  const [toStoreId, setToStoreId] = useState("");       

  // 初始化：載入門市清單 & 商品清單
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/Dropdown/GetStoreList");
        const list = Array.isArray(data) ? data : [];
        setStores(list);
      } catch (e) {
        Swal.fire("門市讀取失敗", e?.message || "請稍後再試", "error");
      }
    })();
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ★ 當 stores 或 user 更新時，設定 from/to 預設值
  useEffect(() => {
    const uid =
      user?.storeId != null
        ? String(user.storeId)
        : (localStorage.getItem("storeId") || "");
    if (uid) setFromStoreId(uid);

    if (stores.length) {
      const baseFrom = uid || fromStoreId;
      const firstOther = stores.find(
        (s) => String(s.value) !== String(baseFrom)
      );
      if (firstOther && !toStoreId) setToStoreId(String(firstOther.value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stores, user]);

  // 商品查詢
  const fetchProducts = async () => {
    try {
      const { data } = await api.get(`/t_Product`, {
        params: { keyword, offset: 0, limit: 20 },
      });
      const list = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data)
        ? data
        : [];
      const normalized = list.map((p) => ({
        id: p.id,
        productNumber: p.productNumber || p.number || "",
        name: p.name || p.productName || "",
        unit: p.unit || "件",
        unitPrice: p.unitPrice ?? p.price ?? null,
        cost: p.cost ?? null,
      }));
      setProducts(normalized);
    } catch (e) {
      console.error("載入商品失敗:", e?.message);
      setProducts([]);
    }
  };

  const handleSearch = () => fetchProducts();

  // ====== 左側：加入明細 ======
  const handleAdd = (item) => {
    const raw = inputValues[item.id] ?? "";
    const quantity = parseInt(raw, 10);
    if (isNaN(quantity) || quantity <= 0) return;

    setAdjustList((prev) => {
      const existing = prev.find((p) => p.productId === item.id);
      if (existing) {
        return prev.map((p) =>
          p.productId === item.id
            ? { ...p, quantity: p.quantity + quantity }
            : p
        );
      }
      return [
        ...prev,
        {
          productId: item.id,
          productNumber: item.productNumber,
          productName: item.name,
          unit: item.unit || "件",
          unitPrice: item.unitPrice,
          cost: item.cost,
          quantity,
        },
      ];
    });

    setInputValues((prev) => ({ ...prev, [item.id]: "" }));
  };

  const handleDelete = (productId, productName) => {
    Swal.fire({
      title: `刪除「${productName}」？`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "刪除",
      cancelButtonText: "取消",
    }).then((r) => {
      if (r.isConfirmed) {
        setAdjustList((prev) => prev.filter((x) => x.productId !== productId));
      }
    });
  };

  const totalQty = useMemo(
    () => adjustList.reduce((s, i) => s + (i.quantity || 0), 0),
    [adjustList]
  );

  const findStoreLabel = (id) =>
    stores.find((s) => String(s.value) === String(id))?.label || "";

  // ====== 暫存（status=0）======
  const [savingDraft, setSavingDraft] = useState(false);
  const saveDraft = async () => {
    if (!fromStoreId) return Swal.fire("缺少來源門市", "", "info");
    if (!toStoreId) return Swal.fire("缺少目標門市", "", "info");
    if (String(fromStoreId) === String(toStoreId))
      return Swal.fire("來源與目標不可相同", "", "info");
    if (!adjustList.length) return Swal.fire("無明細", "請先加入商品", "info");
    if (savingDraft) return;

    setSavingDraft(true);
    try {
      const body = {
        fromLocationId: Number(fromStoreId),
        fromLocationName: findStoreLabel(fromStoreId),
        toLocationId: Number(toStoreId),
        toLocationName: findStoreLabel(toStoreId),
        date: new Date().toISOString(),
        status: TRANSFER_STATUS.DRAFT,
        items: adjustList.map((x) => ({
          productId: x.productId,
          productNumber: x.productNumber,
          productName: x.productName,
          quantity: Number(x.quantity),
          unit: x.unit || "件",
          unitPrice: Number(x.unitPrice ?? 0),
          cost: Number(x.cost ?? 0),
        })),
      };
      const { data } = await api.post("/t_TransferOrder", body);
      setAdjustList([]);
      setInputValues({});
      Swal.fire(
        "已暫存",
        `單號：${data?.orderNumber || data?.id || "—"}`,
        "success"
      );
    } catch (e) {
      Swal.fire(
        "暫存失敗",
        e?.response?.data?.message || e?.message || "",
        "error"
      );
    } finally {
      setSavingDraft(false);
    }
  };

  // ====== 送出調貨（status=1 出貨中）======
  const handleSubmitTransfer = async () => {
    if (!fromStoreId) return Swal.fire("缺少來源門市", "", "info");
    if (!toStoreId) return Swal.fire("缺少目標門市", "", "info");
    if (String(fromStoreId) === String(toStoreId))
      return Swal.fire("來源與目標不可相同", "", "info");
    if (!adjustList.length)
      return Swal.fire("沒有明細", "請先加入至少一筆商品。", "info");

    const payload = {
      fromLocationId: Number(fromStoreId),
      fromLocationName: findStoreLabel(fromStoreId),
      toLocationId: Number(toStoreId),
      toLocationName: findStoreLabel(toStoreId),
      date: new Date().toISOString(),
      status: TRANSFER_STATUS.SHIPPING,
      items: adjustList.map((x) => ({
        productId: x.productId,
        productNumber: x.productNumber,
        productName: x.productName,
        quantity: Number(x.quantity),
        unit: x.unit || "件",
        unitPrice: Number(x.unitPrice ?? 0),
        cost: Number(x.cost ?? 0),
      })),
    };
    try {
      const { data } = await api.post("/t_TransferOrder", payload);
      Swal.fire(
        "成功",
        `調貨單已出貨中（${data?.orderNumber || data?.id || "—"}）`,
        "success"
      );
      setAdjustList([]);
      setInputValues({});
    } catch (e) {
      Swal.fire(
        "建立失敗",
        e?.response?.data?.message || e?.message || "請稍後再試",
        "error"
      );
    }
  };

  return (
    <div className="container-fluid">
      <div className="row">
        {/* ===== 左側：調貨明細 ===== */}
        <div className="col-5 d-flex flex-column" style={{ background: "#fff", height: "89vh" }}>
          <div className="flex-grow-1">
            <div className="d-flex justify-content-between align-items-center my-3 mx-4">
              <h4 className="fw-bold m-0">調貨明細</h4>
              <button
                className="add-button"
                style={{ background: "#D68E08" }}
                onClick={() => setShowModal(true)}
              >
                調貨紀錄
              </button>
            </div>

            <table className="table mb-2" style={{ fontSize: "1.1rem" }}>
              <thead className="table-light" style={{ borderTop: "1px solid #c5c6c7" }}>
                <tr>
                  <th className="text-center">商品名稱</th>
                  <th className="text-center">數量</th>
                  <th className="text-center">操作</th>
                </tr>
              </thead>
              <tbody>
                {adjustList.map((item, index) => (
                  <tr key={`${item.productId}-${index}`}>
                    <td className="text-center">{item.productName}</td>
                    <td className="text-center">{item.quantity}</td>
                    <td className="text-center">
                      <FaTimes
                        onClick={() => handleDelete(item.productId, item.productName)}
                        style={{ color: "red", cursor: "pointer", fontSize: "1rem" }}
                        title="刪除"
                      />
                    </td>
                  </tr>
                ))}
                {!adjustList.length && (
                  <tr>
                    <td colSpan={3} className="text-center text-muted">
                      尚未加入任何商品
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <button
              className="clear-button d-flex justify-content-center ms-auto me-2"
              onClick={() => {
                if (!adjustList.length) return;
                Swal.fire({
                  title: "清空明細？",
                  text: "將清空目前所有調貨明細",
                  icon: "warning",
                  showCancelButton: true,
                  confirmButtonText: "清空",
                  cancelButtonText: "取消",
                }).then((r) => r.isConfirmed && setAdjustList([]));
              }}
            >
              清空
            </button>
          </div>

          {/* ★ 主畫面不顯示來源門市；只顯示「目標門市」選擇 */}
          <div className="mx-4 mt-2">
            <div className="row g-2 align-items-center">
              <div className="col-12">
                <label className="form-label fw-bold">要調去哪個門市</label>
                <select
                  className="form-select"
                  value={toStoreId}
                  onChange={(e) => setToStoreId(e.target.value)}
                >
                  <option value="">請選擇</option>
                  {stores
                    .filter((s) => !fromStoreId || String(s.value) !== String(fromStoreId))
                    .map((s) => (
                      <option key={s.value} value={String(s.value)}>
                        {s.label}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          <div
            className="d-flex justify-content-between align-items-center py-3 mx-4"
            style={{
              fontSize: "1.2rem",
              fontWeight: "bold",
              lineHeight: "1.8",
              borderTop: "2px solid #E2E2E2",
            }}
          >
            <span>商品總數 : {totalQty} 件</span>
            <div className="d-flex gap-2">
              <button
                className="btn btn-outline-secondary"
                onClick={saveDraft}
                disabled={savingDraft}
              >
                {savingDraft ? "暫存中…" : "暫存"}
              </button>
              <button className="cargo-button" onClick={handleSubmitTransfer}>
                調貨
              </button>
            </div>
          </div>
        </div>

        {/* ===== 右側：商品清單 ===== */}
        <div className="col-7">
          <div className="search-container d-flex gap-3 px-5 pt-4 pb-3">
            <SearchField
              type="select"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              options={[
                { value: "none", label: "請選擇商品種類" },
                { value: "all", label: "全部" },
                { value: "store", label: "門市熱銷" },
                { value: "delivery", label: "冷凍海鮮" },
                { value: "dry", label: "乾貨" },
              ]}
            />
            <div className="search-bar ms-auto">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="搜尋商品編號 / 名稱..."
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
              style={{
                fontSize: "1.1rem",
                border: "1px solid #D7D7D7",
                width: "90%",
              }}
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
                  <th scope="col" style={{ width: "45%" }}>商品</th>
                  <th scope="col" style={{ width: "25%" }}>數量</th>
                  <th scope="col" style={{ width: "30%" }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {products.length ? (
                  products.map((item) => (
                    <tr key={item.id}>
                      <td className="text-start">
                        <div className="d-flex flex-column">
                          <span className="fw-bold">{item.name}</span>
                          <small className="text-muted">
                            編號：{item.productNumber || "—"}／單位：{item.unit}
                          </small>
                        </div>
                      </td>
                      <td>
                        <input
                          value={inputValues[item.id] || ""}
                          onChange={(e) =>
                            setInputValues((prev) => ({
                              ...prev,
                              [item.id]: e.target.value,
                            }))
                          }
                          style={{
                            height: "40px",
                            padding: "0 8px",
                            border: "1px solid #8C8C8C",
                            borderRadius: "4px",
                            textAlign: "center",
                            width: 100,
                          }}
                          placeholder="輸入數量"
                        />
                      </td>
                      <td>
                        <button
                          className="add-button me-2"
                          onClick={() => handleAdd(item)}
                        >
                          加入
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3">無資料</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 調貨紀錄（走真實 API） */}
      <AdjustRecordModal show={showModal} onHide={() => setShowModal(false)} />
    </div>
  );
}
