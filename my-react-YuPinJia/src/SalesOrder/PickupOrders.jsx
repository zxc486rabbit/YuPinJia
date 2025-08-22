// ./PickupOrders.jsx
import { useEffect, useMemo, useState, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import "../components/Search.css";
import SearchField from "../components/SearchField";
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
    case 0:
      return "已取消";
    case 1:
      return "未付款／賒帳";
    case 2:
      return "已付款";
    case 3:
      return "已出貨";
    case 4:
      return "配送中";
    case 5:
      return "已完成";
    case 6:
      return "退貨";
    default:
      return String(s ?? "");
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
    memberId: Number(raw?.memberId ?? 0), // 可能後端沒回，沒有就 0
    deliveryMethod: Number(raw?.deliveryMethod ?? 0),
    paymentMethodLabel: raw?.paymentMethod ?? "", // PendingOrder 這裡多半是字串（如「現金」）
    carrierNumber: raw?.carrierNumber ?? "",
    operatorName: raw?.operatorName ?? "",
    pickupInfo: raw?.pickupInfo ?? "",
    signature: raw?.signature ?? "",
    shippingAddress: raw?.shippingAddress ?? "",
    note: raw?.note ?? "",

    // 明細（優先採用後端 subtotal）
    items: items.map((it) => ({
      id: it?.id, // orderItemId
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

  const [date, setDate] = useState(toYMD(new Date())); // 預設今天
  const [orders, setOrders] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  // 取 Bearer（若 API 不驗證可拿掉這行 header）
  const authHeader = () => {
    const t = localStorage.getItem("accessToken");
    return t ? { Authorization: `Bearer ${t}` } : {};
  };

  // 直接用 query 帶 status=5，body 為 null
  async function updateOrderStatusToDone(orderId) {
    const url = `${API_BASE}/t_SalesOrder/UpdateStatus/${orderId}?status=5`;
    const res = await axios.put(url, null, {
      headers: { ...authHeader() },
    });
    // 後端通常回 200/204，這裡簡單視為成功
    return res?.status;
  }

  // 載入待取訂單
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(
          `${API_BASE}/t_SalesOrder/PendingOrder`
        );
        const rows = Array.isArray(data) ? data.map(normalizeOrder) : [];
        // 偵錯
        console.log("[PendingOrder] count =", rows.length);
        rows.forEach((o) =>
          console.log(
            `[Order] id=${o.id} number=${o.orderNumber} items=${
              o.items?.length ?? 0
            }`
          )
        );
        setOrders(rows);
      } catch (err) {
        console.error("取得待取訂單失敗：", err);
        Swal.fire("載入失敗", "無法取得待取訂單，請稍後再試。", "error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const currentStoreId = ""; // 如需依門市過濾可放 storeId，先保留空字串=不過濾

  // 依日期（createdAt→orderDate）與門市過濾
  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const isDate = String(o.orderDate).startsWith(date);
      const isPickupHere =
        !currentStoreId ||
        String(o.pickupStoreId || "") === String(currentStoreId);
      return isDate && (isPickupHere || !currentStoreId);
    });
  }, [orders, date, currentStoreId]);

  const formatMoney = (n) =>
    Number(n || 0).toLocaleString("zh-TW", { minimumFractionDigits: 0 });

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // 已付款 → 手動完成（此處僅前端更新；若有正式 API 可在這裡串接更新）
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
      await Swal.fire({
        icon: "success",
        title: "已完成",
        text: "狀態已更新為已完成。",
      });
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

  // 未付款 → 帶商品去結帳（直接到結帳頁，並鎖定為訂單自取）
  const goCheckout = (order) => {
    // 轉成 CheckoutFlow 期望的欄位（這裡帶完整一點，結帳頁會沿用）
    const cartItems = order.items.map((i) => ({
      id: i.productId ?? i.id, // 優先產品 id
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
      (sum, i) =>
        sum + (i.isGift ? 0 : Number(i.unitPrice) * Number(i.quantity)),
      0
    );

    const finalTotal = Number(order.totalAmount ?? subtotal) || 0;

    // 寫入 localStorage，讓 /checkout 讀得到
    const payload = {
      fromPickup: true,

      // 主檔關鍵
      id: order.id,
      salesOrderId: order.id,
      orderId: order.id,
      pickupSalesOrderId: order.id,
      orderNumber: order.orderNumber,

      // 其餘欄位（盡量帶齊）
      storeName: order.orderStoreName,
      memberId: order.memberId ?? 0,
      memberName: order.customerName,
      mobile: order.phone,
      totalAmount: order.totalAmount,
      paymentAmount: order.paymentAmount,
      creditAmount: order.creditAmount,
      totalQuantity: order.totalQuantity,
      status: order.statusCode,
      unifiedBusinessNumber: "", // 待取回傳多半為 null，留空字串
      invoiceNumber: order.invoiceNumber ?? "",
      note: order.note ?? "",
      deliveryMethod: order.deliveryMethod, // 數字碼（5=訂單自取）
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
      delivery: "訂單自取", // UI 顯示
      pickupLocation: order.pickupStoreName || order.orderStoreName || "",
      customerName: order.customerName || "",
      customerPhone: order.phone || "",

      // UI 行為
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
      <div className="search-container d-flex flex-wrap gap-3 px-4 py-3 rounded">
        <SearchField
          label="日期"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div
        className="table-container"
        style={{ maxHeight: "79vh", overflowY: "auto" }}
      >
        {loading ? (
          <div>載入中…</div>
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
              {filtered.length > 0 ? (
                filtered.map((o) => (
                  <Fragment key={o.id}>
                    <tr>
                      <td>
                        <button
                          className="check-button"
                          onClick={() => toggleExpand(o.id)}
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
                            onClick={() => goCheckout(o)}
                          >
                            去結帳
                          </button>
                        )}
                        {isCompleted(o) && (
                          <span className="text-muted">—</span>
                        )}
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
                  <td colSpan="9">此日期沒有待取訂單</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
