// ./PickupOrders.jsx
import { useEffect, useMemo, useState, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import "../components/Search.css";
import SearchField from "../components/SearchField";
import { Pagination } from "react-bootstrap";
import Swal from "sweetalert2";
import axios from "axios";

const API_BASE = "https://yupinjia.hyjr.com.tw/api/api";

const ISO_DATETIME_RE =
  /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?\b/g;

const pad2 = (n) => String(n).padStart(2, "0");
const fmtLocal = (s) => {
  const d = new Date(s);
  if (isNaN(d)) return s;
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const da = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mm = pad2(d.getMinutes());
  return `${y}-${m}-${da} ${hh}:${mm}`;
};

// 會把字串中的所有 ISO 日期時間替換成本地友善格式
const prettifyDateTimeInText = (text) =>
  String(text ?? "").replace(ISO_DATETIME_RE, (m) => fmtLocal(m));

const parsePickupInfo = (pickupInfo, shippingAddress) => {
  const raw = String(pickupInfo ?? shippingAddress ?? "").trim();
  const pretty = prettifyDateTimeInText(raw);
  return pretty || "-";
};

const toYMD = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const da = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
};

// 狀態碼轉中文（可依你的系統調整）
const statusToLabel = (s) => {
  switch (Number(s)) {
    case 0: return "已取消";
    case 1: return "未付款／賒帳";
    case 2: return "已付款";
    case 3: return "已出貨";
    case 4: return "配送中";
    case 5: return "已完成";
    case 6: return "退貨";
    default: return String(s ?? "");
  }
};

// 將 PendingOrder 回傳正規化成畫面欄位
const normalizeOrder = (raw) => {
  const items = Array.isArray(raw?.orderItems) ? raw.orderItems : [];
  return {
    id: raw?.id,
    orderNumber: raw?.orderNumber ?? "",
    createdAt: raw?.createdAt ?? null,
    orderDate: toYMD(raw?.createdAt ?? new Date()),
    orderStoreName: raw?.storeName ?? "-", // 下單門市
    pickupStoreName: parsePickupInfo(raw?.pickupInfo, raw?.shippingAddress), // 取貨資訊
    customerName: raw?.memberName ?? "-",
    phone: raw?.mobile ?? "",
    totalAmount: Number(raw?.totalAmount ?? 0),
    paymentAmount: Number(raw?.paymentAmount ?? 0),
    creditAmount: Number(raw?.creditAmount ?? 0),
    totalQuantity: Number(raw?.totalQuantity ?? 0),
    statusCode: Number(raw?.status ?? 0),
    statusLabel: statusToLabel(raw?.status),
    memberId: Number(raw?.memberId ?? 0),
    deliveryMethod: raw?.deliveryMethod,
    paymentMethodLabel: raw?.paymentMethod ?? "",
    carrierNumber: raw?.carrierNumber ?? "",
    operatorName: raw?.operatorName ?? "",
    pickupInfo: raw?.pickupInfo ?? "",
    signature: raw?.signature ?? "",
    shippingAddress: raw?.shippingAddress ?? "",
    note: raw?.note ?? "",
    storeId: raw?.storeId ?? "",

    // 明細
    items: items.map((it) => ({
      id: it?.id,
      salesOrderId: it?.salesOrderId,
      productId: it?.productId,
      name: it?.productName ?? "-",
      unitPrice: Number(it?.unitPrice ?? 0),
      quantity: Number(it?.quantity ?? 0),
      subtotal: Number(
        it?.subtotal ?? Number(it?.unitPrice ?? 0) * Number(it?.quantity ?? 0)
      ),
      discountedAmount: Number(it?.discountedAmount ?? 0),
      status: it?.status ?? "正常",
      isGift: !!it?.isGift,
      staffId: Number(it?.staffId ?? 0),
      shippingLocation: it?.shippingLocation ?? "",
      returnQuantity: it?.returnQuantity,
    })),
  };
};

export default function PickupOrders() {
  const navigate = useNavigate();

  // ===== 查詢欄位（全部後端查詢）=====
  const [date, setDate] = useState(toYMD(new Date())); // createdAt
  const [orderNumber, setOrderNumber] = useState("");
  const [memberName, setMemberName] = useState("");
  const [mobile, setMobile] = useState("");
  const [storeId, setStoreId] = useState("all");

  // 門市下拉資料
  const [stores, setStores] = useState([]);

  // ===== 清單 / 載入 =====
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  // ===== 分頁狀態 =====
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [page, setPage] = useState(1); // 1-based
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit)));

  // 記住最後一次查詢參數（翻頁共用）
  const lastQueryRef = useMemo(() => ({ current: {} }), []);
  const setLastQuery = (obj) => (lastQueryRef.current = obj);
  const getLastQuery = () => lastQueryRef.current || {};

  // 取 Bearer（若 API 不驗證可拿掉）
  const authHeader = () => {
    const t = localStorage.getItem("accessToken");
    return t ? { Authorization: `Bearer ${t}` } : {};
  };

  // 直接用 query 帶 status=5，body 為 null
  async function updateOrderStatusToDone(orderId) {
    const url = `${API_BASE}/t_SalesOrder/UpdateStatus/${orderId}?status=5`;
    const res = await axios.put(url, null, { headers: { ...authHeader() } });
    return res?.status;
  }

  // ===== 取得門市清單（載入一次）=====
  useEffect(() => {
    let mounted = true;
    axios
      .get(`${API_BASE}/Dropdown/GetStoreList`)
      .then((res) => {
        if (!mounted) return;
        const arr = Array.isArray(res.data) ? res.data : [];
        // 轉成 {value,label}
        setStores(arr.map((s) => ({ value: String(s.value), label: s.label })));
      })
      .catch((err) => {
        console.error("載入門市清單失敗：", err);
        setStores([]); // 失敗就給空陣列
      });
    return () => (mounted = false);
  }, []);

  // ===== 後端查詢（支援分頁）=====
  const fetchPending = async (query, _page = 1, _limit = limit) => {
    setLoading(true);
    try {
      const offset = (_page - 1) * _limit;
      const rawParams = {
        createdAt: query.createdAt || undefined,      // YYYY-MM-DD
        orderNumber: query.orderNumber || undefined,
        memberName: query.memberName || undefined,
        mobile: query.mobile || undefined,
        storeId: query.storeId && query.storeId !== "all" ? query.storeId : undefined,
        offset,
        limit: _limit,
      };
      const params = Object.fromEntries(
        Object.entries(rawParams).filter(([, v]) => v !== undefined && v !== "")
      );

      const res = await axios.get(`${API_BASE}/t_SalesOrder/PendingOrder`, { params });

      // 相容：可能回傳 array 或 { total, limit, items }
      let list = [];
      let newTotal = 0;
      let newLimit = _limit;

      if (Array.isArray(res.data)) {
        list = res.data;
        newTotal = list.length; // 舊格式沒有 total，只能估
      } else if (res.data && typeof res.data === "object") {
        const { total: t, limit: l, items } = res.data;
        newTotal = typeof t === "number" ? t : 0;
        newLimit = typeof l === "number" && l > 0 ? l : _limit;

        if (Array.isArray(items)) {
          list = items;
        } else if (Array.isArray(items?.[0])) {
          list = items[0];
        } else {
          list = [];
        }
      }

      const rows = list.map(normalizeOrder);
      rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setOrders(rows);
      setTotal(newTotal);
      setLimit(newLimit);
    } catch (err) {
      console.error("取得待取訂單失敗：", err);
      Swal.fire("載入失敗", "無法取得待取訂單，請稍後再試。", "error");
    } finally {
      setLoading(false);
    }
  };

  // ===== 初次載入：帶 URL 初值 =====
  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    const init = {
      createdAt: qs.get("createdAt") || toYMD(new Date()),
      orderNumber: qs.get("orderNumber") || "",
      memberName: qs.get("memberName") || "",
      mobile: qs.get("mobile") || "",
      storeId: qs.get("storeId") || "all",
    };

    setDate(init.createdAt);
    setOrderNumber(init.orderNumber);
    setMemberName(init.memberName);
    setMobile(init.mobile);
    setStoreId(init.storeId || "all");

    setLastQuery(init);
    setPage(1);
    fetchPending(init, 1, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== 條件變動 -> 自動搜尋（debounce 350ms）=====
  useEffect(() => {
    const query = {
      createdAt: date || "",
      orderNumber: orderNumber || "",
      memberName: memberName || "",
      mobile: mobile || "",
      storeId: storeId || "all",
    };

    // 同步 URL
    const qs = new URLSearchParams({
      ...(query.createdAt ? { createdAt: query.createdAt } : {}),
      ...(query.orderNumber ? { orderNumber: query.orderNumber } : {}),
      ...(query.memberName ? { memberName: query.memberName } : {}),
      ...(query.mobile ? { mobile: query.mobile } : {}),
      ...(query.storeId ? { storeId: query.storeId } : {}),
    }).toString();
    window.history.pushState({}, "", `?${qs}`);

    setLastQuery(query);
    setPage(1);

    const t = setTimeout(() => fetchPending(query, 1, limit), 350);
    return () => clearTimeout(t);
    // 不含 page/limit（翻頁另處理）
  }, [date, orderNumber, memberName, mobile, storeId]);

  // ===== 分頁動作 =====
  const totalPagesMemo = useMemo(
    () => Math.max(1, Math.ceil(total / Math.max(1, limit))),
    [total, limit]
  );
  const goPage = (p) => {
    const safe = Math.min(Math.max(1, p), totalPagesMemo);
    setPage(safe);
    fetchPending(getLastQuery(), safe, limit);
  };
  const handleChangePageSize = (e) => {
    const newLimit = Number(e.target.value) || 20;
    setLimit(newLimit);
    setPage(1);
    fetchPending(getLastQuery(), 1, newLimit);
  };

  const formatMoney = (n) =>
    Number(n || 0).toLocaleString("zh-TW", { minimumFractionDigits: 0 });

  const toggleExpand = (id) => setExpandedId((prev) => (prev === id ? null : id));

  // 已付款 → 手動完成
  const markDone = async (order) => {
    const res = await Swal.fire({
      icon: "question",
      title: `完成訂單 ${order.orderNumber}？`,
      text: "此動作會將狀態改為「已完成」。",
      confirmButtonText: "確定",
      cancelButtonText: "取消",
      showCancelButton: true,
      reverseButtons: true,
      focusCancel: true,
    });
    if (!res.isConfirmed) return;

    try {
      setUpdatingId(order.id);
      await updateOrderStatusToDone(order.id);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id ? { ...o, statusCode: 5, statusLabel: "已完成" } : o
        )
      );
      await Swal.fire({ icon: "success", title: "已完成", text: "狀態已更新為已完成。" });
    } catch (err) {
      console.error("更新狀態失敗：", err?.response || err);
      const msg =
        err?.response?.data?.title ||
        err?.response?.data?.message ||
        err?.message ||
        "更新失敗，請稍後再試。";
      await Swal.fire({ icon: "error", title: "更新失敗", text: msg });
    } finally {
      setUpdatingId(null);
    }
  };

  // 未付款 → 帶商品去結帳
  const navigateToCheckout = (order) => {
    const cartItems = order.items.map((i) => ({
      id: i.productId ?? i.id,
      name: i.name,
      unitPrice: Number(i.unitPrice) || 0,
      quantity: Number(i.quantity) || 0,
      isGift: !!i.isGift,
      subtotal: Number(i.subtotal) || 0,
    }));

    const currentMember = {
      id: order.memberId ?? 0,
      fullName: order.customerName,
      contactPhone: order.phone,
      discountRate: 1,
    };

    const subtotal = cartItems.reduce(
      (sum, i) => sum + (i.isGift ? 0 : Number(i.unitPrice) * Number(i.quantity)),
      0
    );
    const finalTotal = Number(order.totalAmount ?? subtotal) || 0;

    const payload = {
      fromPickup: true,

      // 主檔關鍵
      id: order.id,
      salesOrderId: order.id,
      orderId: order.id,
      pickupSalesOrderId: order.id,
      orderNumber: order.orderNumber,

      storeName: order.orderStoreName,
      memberId: order.memberId ?? 0,
      memberName: order.customerName,
      mobile: order.phone,
      totalAmount: order.totalAmount,
      paymentAmount: order.paymentAmount,
      creditAmount: order.creditAmount,
      totalQuantity: order.totalQuantity,
      status: order.statusCode,
      unifiedBusinessNumber: "",
      invoiceNumber: order.invoiceNumber ?? "",
      note: order.note ?? "",
      deliveryMethod: order.deliveryMethod,
      paymentMethodLabel: order.paymentMethodLabel ?? "",

      createdAt: order.createdAt,
      operatorName: order.operatorName,
      pickupInfo: order.pickupInfo,
      signature: order.signature,
      shippingAddress: order.shippingAddress,

      // 結帳頁要用
      items: cartItems,
      member: currentMember,
      usedPoints: 0,
      subtotal,
      finalTotal,
      delivery: "訂單自取",
      pickupLocation: order.pickupStoreName || order.orderStoreName || "",
      customerName: order.customerName || "",
      customerPhone: order.phone || "",

      prefillDelivery: "訂單自取",
    };

    localStorage.setItem("checkoutData", JSON.stringify(payload));
    localStorage.removeItem("checkoutFlags");
    navigate("/checkout");
  };

  // 判斷按鈕顯示
  const isPaid = (o) => o.statusCode === 2;
  const isCompleted = (o) => o.statusCode === 5;
  const isUnpaid = (o) => o.statusCode === 1 || o.paymentAmount === 0;

  return (
    <>
      {/* 上方搜尋：輸入/選擇即自動查詢（無搜尋按鈕） */}
      <div className="search-container d-flex flex-wrap gap-3 px-4 py-3 rounded">
        <SearchField
          label="日期"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <SearchField
          label="訂單編號"
          type="text"
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
        />
        <SearchField
          label="會員姓名"
          type="text"
          value={memberName}
          onChange={(e) => setMemberName(e.target.value)}
        />
        <SearchField
          label="手機"
          type="text"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
        />

        {/* 門市：從後端下拉，含「全部」 */}
        <SearchField
          label="門市"
          type="select"
          value={storeId}
          onChange={(e) => setStoreId(e.target.value)}
          options={[
            { value: "all", label: "全部" },
            ...stores.map((s) => ({ value: s.value, label: s.label })),
          ]}
        />

        {/* 右側：清除搜尋 */}
        <div className="d-flex align-items-center ms-auto gap-2">
          <button
            className="btn btn-outline-secondary"
            onClick={() => {
              setDate(toYMD(new Date()));
              setOrderNumber("");
              setMemberName("");
              setMobile("");
              setStoreId("all");
              setPage(1);
              setTotal(0);
              window.history.pushState({}, "", window.location.pathname);
              const empty = {};
              setLastQuery(empty);
              fetchPending(empty, 1, limit);
            }}
          >
            清除搜尋
          </button>
        </div>
      </div>

      {/* 表格 */}
      <div className="table-container" style={{ maxHeight: "73vh", overflowY: "auto" }}>
        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center" }}>載入中…</div>
        ) : (
          <table className="table text-center" style={{ fontSize: "1.05rem" }}>
            <thead
              className="table-light"
              style={{
                position: "sticky",
                top: 0,
                background: "#d1ecf1",
                zIndex: 1,
                borderTop: "1px solid #c5c6c7",
              }}
            >
              <tr>
                <th style={{ width: 60 }}>明細</th>
                <th>訂單編號</th>
                <th>下單門市</th>
                <th>取貨資訊</th>
                <th>取貨人</th>
                <th>電話</th>
                <th>金額</th>
                <th>狀態</th>
                <th style={{ width: 220 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {orders.length > 0 ? (
                orders.map((o) => (
                  <Fragment key={o.id}>
                    <tr>
                      <td>
                        <button
                          className="check-button"
                          onClick={() => setExpandedId((prev) => (prev === o.id ? null : o.id))}
                        >
                          {expandedId === o.id ? "收合" : "展開"}
                        </button>
                      </td>
                      <td>{o.orderNumber}</td>
                      <td>{o.orderStoreName}</td>
                      <td>{o.pickupStoreName}</td>
                      <td>{o.customerName}</td>
                      <td>{o.phone}</td>
                      <td>{formatMoney(o.totalAmount)}</td>
                      <td>{o.statusLabel}</td>
                      <td>
                        {isPaid(o) && !isCompleted(o) && (
                          <button
                            className="edit-button"
                            onClick={() => markDone(o)}
                            disabled={updatingId === o.id}
                            title={updatingId === o.id ? "送出中…" : undefined}
                          >
                            {updatingId === o.id ? "送出中…" : "完成訂單"}
                          </button>
                        )}
                        {isUnpaid(o) && !isCompleted(o) && (
                          <button
                            className="check-button ms-2"
                            style={{
                              backgroundColor: "#E02900",
                              borderColor: "#E02900",
                              color: "#fff",
                              padding: "6px 12px",
                              borderRadius: "8px",
                            }}
                            onClick={() => navigateToCheckout(o)}
                          >
                            去結帳
                          </button>
                        )}
                        {isCompleted(o) && <span className="text-muted">—</span>}
                      </td>
                    </tr>

                    {expandedId === o.id && (
                      <tr>
                        <td colSpan={9} style={{ background: "#fafafa" }}>
                          <div className="px-3 py-2 text-start">
                            <strong>訂單明細：</strong>
                            <table className="table table-sm mt-2">
                              <thead>
                                <tr>
                                  <th>品名</th>
                                  <th>單價</th>
                                  <th>數量</th>
                                  <th>小計</th>
                                  <th>備註</th>
                                </tr>
                              </thead>
                              <tbody>
                                {o.items.map((it) => (
                                  <tr key={it.id}>
                                    <td>{it.name}</td>
                                    <td>{formatMoney(it.unitPrice)}</td>
                                    <td>{it.quantity}</td>
                                    <td>{formatMoney(it.subtotal)}</td>
                                    <td>{it.isGift ? "贈品" : "-"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan="9">沒有符合條件的待取訂單</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* 表格底部：每頁筆數 + 分頁器 */}
      <div className="d-flex align-items-center justify-content-end mt-2 ps-3 pe-3 mb-3">
        <div className="d-flex align-items-center flex-wrap gap-2 justify-content-end">
          {/* 每頁筆數 */}
          <div className="d-flex align-items-center">
            <span className="me-2">每頁</span>
            <select
              className="form-select form-select-sm"
              style={{ width: 100 }}
              value={limit}
              onChange={handleChangePageSize}
            >
              {[10, 20, 30, 50, 100].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span className="ms-2">筆</span>
          </div>

          {/* 分頁器 */}
          <span className="ms-3 me-2">
            共 <strong>{total}</strong> 筆，第 <strong>{page}</strong> / {totalPages} 頁
          </span>
          <Pagination className="mb-0">
            <Pagination.First disabled={page <= 1} onClick={() => goPage(1)} />
            <Pagination.Prev disabled={page <= 1} onClick={() => goPage(page - 1)} />
            {(() => {
              const pages = [];
              const start = Math.max(1, page - 2);
              const end = Math.min(totalPages, start + 4);
              for (let p = start; p <= end; p++) {
                pages.push(
                  <Pagination.Item key={p} active={p === page} onClick={() => goPage(p)}>
                    {p}
                  </Pagination.Item>
                );
              }
              return pages;
            })()}
            <Pagination.Next disabled={page >= totalPages} onClick={() => goPage(page + 1)} />
            <Pagination.Last disabled={page >= totalPages} onClick={() => goPage(totalPages)} />
          </Pagination>
        </div>
      </div>
    </>
  );
}
