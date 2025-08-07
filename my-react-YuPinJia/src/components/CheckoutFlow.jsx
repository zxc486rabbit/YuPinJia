import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  FaStore,
  FaPlane,
  FaShip,
  FaHome,
  FaBuilding,
  FaClipboard,
} from "react-icons/fa";

export default function CheckoutFlow({
  onComplete,
  cartItems = [],
  currentMember = {},
  usedPoints = 0,
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [delivery, setDelivery] = useState("");
  const [payment, setPayment] = useState("");
  const [carrier, setCarrier] = useState("");
  const [printing, setPrinting] = useState(false);
  const [invoiceTaxId, setInvoiceTaxId] = useState("");

  const [customerName, setCustomerName] = useState(currentMember.name || "");
  const [customerPhone, setCustomerPhone] = useState(
    currentMember.contactPhone || ""
  );
  const [pickupLocation, setPickupLocation] = useState("");
  const [cashReceived, setCashReceived] = useState("");
  const [paymentAmount, setPaymentAmount] = useState(""); // 用來記錄匯款、支票輸入的金額
const [creditCardInfo, setCreditCardInfo] = useState(""); // 用來記錄刷卡信息
  const [pickupTime, setPickupTime] = useState(
    new Date().toISOString().slice(0, 16)
  ); // 預設現在時間
  const [note, setNote] = useState("");

  const deliveryOptions = [
    { label: "現場帶走", icon: <FaStore size={36} /> },
    { label: "機場提貨", icon: <FaPlane size={36} /> },
    { label: "碼頭提貨", icon: <FaShip size={36} /> },
    { label: "宅配到府", icon: <FaHome size={36} /> },
    { label: "店到店", icon: <FaBuilding size={36} /> },
    { label: "訂單自取", icon: <FaClipboard size={36} /> },
  ];

  const paymentOptions = ["現金", "匯款", "支票", "刷卡"];
  const carrierOptions = ["紙本發票", "手機載具", "自然人憑證", "統一編號"];

  const needExtraInfo = [
    "店到店",
    "機場提貨",
    "碼頭提貨",
    "宅配到府",
    "訂單自取",
  ].includes(delivery);

  // 付款方式選擇邏輯
const handlePaymentMethodChange = (method) => {
  if (method === "現金" && Number(cashReceived) < finalTotal) {
    setPayment("賒帳");  // 若現金金額不足，將付款方式設為賒帳
  } else {
    setPayment(method);  // 其他情況，設定為選擇的付款方式
  }
};

const handleFinish = async () => {
 // 如果現金金額不足，將付款方式設為賒帳並繼續處理訂單
if (payment === "現金" && Number(cashReceived) < finalTotal) {
  setPayment("賒帳");
  await Swal.fire({
    icon: "info",
    title: "現金金額不足",
    text: "已自動轉為賒帳付款方式。",
    confirmButtonText: "確定",
  });
}

// 驗證匯款與支票金額
if ((payment === "匯款" || payment === "支票") && (!paymentAmount || Number(paymentAmount) <= 0)) {
  await Swal.fire({
    icon: "warning",
    title: "金額錯誤",
    text: "請輸入正確的匯款或支票金額。",
    confirmButtonText: "確定",
  });
  return;
}
  setPrinting(true);

  // 處理 cartItems，保留原價，並計算折扣價格
  const updatedCartItems = cartItems.map((item) => {
    const discountedPrice = hasDiscount
      ? calcDiscountPrice(item.unitPrice)
      : item.unitPrice; // 如果有折扣則計算折扣價格，否則使用原價

    return {
      ...item,
      originalPrice: item.unitPrice,  // 保留原價
      unitPrice: item.isGift ? 0 : discountedPrice,  // 設置贈品為免費，其他商品則使用折扣後價格
      isGift: item.isGift || false, // 確保贈品標記為 isGift: true
    };
  });

  // 根據付款方式與取貨方式設置訂單狀態
  let orderStatus = 1; // 預設狀態為賒帳 (1)
  let paymentAmountValue = 0;
let creditAmountValue = 0;

  // 現金
if (payment === "現金") {
  paymentAmountValue = Number(cashReceived) || 0;
  if (paymentAmountValue < finalTotal) {
    creditAmountValue = finalTotal - paymentAmountValue; // 不足的部分記為賒帳
  }
}
// 匯款 / 支票
else if (payment === "匯款" || payment === "支票") {
  paymentAmountValue = Number(paymentAmount) || 0;
}
// 刷卡
else if (payment === "刷卡") {
  paymentAmountValue = finalTotal; // 刷卡一次付清
}

const orderPayload = {
  orderNumber: "SO" + Date.now(),
  storeId: 0,
  memberId: currentMember?.id ?? 0,
  totalAmount: finalTotal,
  paymentAmount: paymentAmountValue, // 實收金額
  creditAmount: creditAmountValue,   // 賒帳金額
  totalQuantity: updatedCartItems.reduce((sum, i) => sum + i.quantity, 0),
  status: orderStatus,               // 依你的付款邏輯計算的狀態
  unifiedBusinessNumber: "",
  invoiceNumber: "",
  note,
  deliveryMethod: delivery,
  dealerMemberId: 0,                  // 如果有導遊/廠商才帶
  paymentMethod:
    payment === "現金" ? 0 :
    payment === "匯款" ? 1 :
    payment === "支票" ? 2 :
    payment === "刷卡" ? 3 : 0,
  carrierNumber: carrier,
  createdAt: new Date().toISOString(),
  operatorName: "操作員A",
  pickupInfo: pickupLocation || "",
  signature: "",
  mobile: customerPhone,
  shippingAddress: "",
};

  console.log("訂單 Payload:", orderPayload);
  console.log("商品明細 Payload:", updatedCartItems);

  try {
    const res = await fetch(
      "https://yupinjia.hyjr.com.tw/api/api/t_SalesOrder",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      }
    );

    if (!res.ok) throw new Error("儲存訂單失敗");

    const result = await res.json(); // 假設 result.id 是主訂單 id

    const detailResponses = await Promise.all(
      updatedCartItems.map(async (item) => {
        const payload = {
          salesOrderId: result.id,
          productId: item.id,
          productName: item.name,
          shippingLocation: pickupLocation || "",
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),  // 使用折扣後的 unitPrice
          originalPrice: Number(item.originalPrice),  // 傳送原價
          subtotal: Math.round(item.unitPrice * item.quantity),
          discountedAmount: Math.round(item.originalPrice - item.unitPrice) * item.quantity,  // 計算折扣金額
          status: "正常",
          isGift: item.isGift || false,
        };

        const res = await fetch("https://yupinjia.hyjr.com.tw/api/api/t_SalesOrderItem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        return res;
      })
    );

    const failed = detailResponses.find((r) => !r.ok);
    if (failed) throw new Error("部分商品明細儲存失敗");

    setTimeout(() => {
      setPrinting(false);
      onComplete?.({
        delivery,
        payment,
        carrier,
        customerName,
        customerPhone,
        pickupLocation,
        pickupTime,
        note,
        usedPoints,
        finalTotal,
      });
      navigate("/"); // 導向首頁或其他頁面
    }, 1200);
  } catch (err) {
    setPrinting(false);
    alert("訂單儲存失敗：" + err.message);
  }
};

  const hasDiscount =
    currentMember?.type === "VIP" &&
    (currentMember?.subType === "廠商" || currentMember?.subType === "導遊");

  const calcDiscountPrice = (price) => Math.round(price * 0.9);

  const totalOriginal = cartItems.reduce(
    (sum, i) => sum + i.unitPrice * i.quantity,
    0
  );

  const totalDiscounted = hasDiscount
    ? cartItems.reduce(
        (sum, i) => sum + calcDiscountPrice(i.unitPrice) * i.quantity,
        0
      )
    : totalOriginal;

  const couponDiscount = Number(usedPoints ?? 0);

  const finalTotal = Math.max(0, totalDiscounted - couponDiscount);
  

  const discountAmount = totalOriginal - totalDiscounted;

  // 放在 useState 後面
  useEffect(() => {
    // console.log("currentMember.contactPhone:", currentMember.contactPhone); // ← 加這行看有沒有資料
    setCustomerName(currentMember.fullName || "");
    setCustomerPhone(currentMember.contactPhone || "");
  }, [currentMember]);

  return (
    <div style={styles.container}>
      {/* Step 1: 明細 */}
      {step === 1 && (
        <>
          <h2 style={styles.title}>確認商品明細</h2>
          <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>商品名稱</th>
                <th style={styles.th}>數量</th>
                <th style={styles.th}>單價</th>
              </tr>
            </thead>
            <tbody>
              {cartItems.length === 0 ? (
                <tr>
                  <td colSpan="3" style={{ textAlign: "center" }}>
                    購物車沒有商品
                  </td>
                </tr>
              ) : (
                cartItems.map((item) => (
                  
                  <tr key={item.id}>
                    <td style={styles.td}>{item.name}</td>
                    <td style={styles.td}>{item.quantity}</td>
                    <td style={styles.td}>
                      {hasDiscount ? (
                        <div>
                          <div
                            style={{
                              textDecoration: "line-through",
                              color: "#999",
                              fontSize: "0.9rem",
                            }}
                          >
                            ${item.unitPrice}
                          </div>
                          <div style={{ color: "#dc3545", fontWeight: "bold" }}>
                            ${calcDiscountPrice(item.unitPrice)}
                          </div>
                        </div>
                      ) : (
                        `$${item.unitPrice}`
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
          <div style={{ marginTop: "20px", textAlign: "right" }}>
            <p>
              原價總計:{" "}
              <span
                style={{
                  textDecoration: hasDiscount ? "line-through" : "none",
                  color: hasDiscount ? "#999" : "#000",
                }}
              >
                NT$ {totalOriginal.toLocaleString()}
              </span>
            </p>

            {/* {hasDiscount && (
    <p>
      折扣後總計:{" "}
      <span style={{ color: "#dc3545", fontWeight: "bold" }}>
        NT$ {totalDiscounted.toLocaleString()}
      </span>
    </p>
  )} */}

            {hasDiscount && (
              <p>
                折抵金額:{" "}
                <span style={{ color: "#dc3545", fontWeight: "bold" }}>
                  NT$ {discountAmount.toLocaleString()}
                </span>
              </p>
            )}

            <p>
              會員點數折抵金額:{" "}
              <span style={{ color: "#28a745", fontWeight: "bold" }}>
                NT$ {usedPoints.toLocaleString()}
              </span>
            </p>

            <p
              style={{
                marginTop: "10px",
                fontWeight: "bold",
                fontSize: "1.2rem",
              }}
            >
              總計金額: NT$ {finalTotal.toLocaleString()}
            </p>
          </div>

          <button
            style={styles.primaryBtn}
            onClick={() => {
              setDelivery("現場帶走"); // 預設配送方式
              setStep(2);
            }}
            disabled={cartItems.length === 0}
          >
            下一步
          </button>
        </>
      )}

      {/* Step 2: 配送 */}
      {step === 2 && (
        <>
          <div style={styles.headerRow}>
            <h2 style={styles.title}>選擇配送方式</h2>
            <button style={styles.backBtn} onClick={() => setStep(1)}>
              ← 返回明細
            </button>
          </div>
          <div style={styles.cardGrid3}>
            {deliveryOptions.map((opt) => (
              <div
                key={opt.label}
                style={{
                  ...styles.card,
                  ...(delivery === opt.label
                    ? styles.cardSelected
                    : styles.cardDefault),
                }}
                onClick={() => setDelivery(opt.label)}
              >
                <div>{opt.icon}</div>
                <div style={{ fontSize: "1.1rem", marginTop: "8px" }}>
                  {opt.label}
                </div>
              </div>
            ))}
          </div>

          {needExtraInfo && (
            <div style={styles.extraInfo}>
              <div style={styles.inputRow}>
                <input
                  style={styles.halfInput}
                  placeholder="姓名"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
                <input
                  style={styles.halfInput}
                  placeholder="聯絡電話"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>

              <div style={styles.inputRow}>
                <input
                  style={styles.halfInput}
                  placeholder="出貨點"
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                />
                <input
                  style={styles.halfInput}
                  type="datetime-local"
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                />
              </div>

              <textarea
                style={styles.textarea}
                placeholder="備註"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          )}

          <button
            style={styles.primaryBtn}
            disabled={!delivery}
            onClick={() => {
              setPayment("現金"); // 預設現金
              setStep(3);
            }}
          >
            下一步
          </button>
        </>
      )}

      {/* Step 3: 付款/發票 */}
      {step === 3 && (
        <>
          <div style={styles.headerRow}>
            <h2 style={styles.title}>選擇付款與發票</h2>
            <button style={styles.backBtn} onClick={() => setStep(2)}>
              ← 返回配送
            </button>
          </div>

          <h4 style={styles.subtitle}>
            總金額:{" "}
            <span style={{ color: "#dc3545", fontWeight: "bold" }}>
              NT$ {finalTotal.toLocaleString()}
            </span>
          </h4>

          <h4 style={styles.subtitle}>付款方式</h4>
          <div style={styles.cardGrid4}>
            {paymentOptions.map((opt) => (
              <div
                key={opt}
                style={{
                  ...styles.card,
                  ...(payment === opt
                    ? styles.cardSelected
                    : styles.cardDefault),
                }}
                onClick={() => setPayment(opt)}
              >
                {opt}
              </div>
            ))}
          </div>

          {/* 顯示金額輸入框 */}
        {(payment === "現金" || payment === "刷卡") && (
          <div style={styles.cashSection}>
            <label style={styles.label}>收現金額</label>
            <input
              style={styles.input}
              type="number"
              min="0"
              placeholder="請輸入收現金額"
              value={cashReceived}
              onChange={(e) => setCashReceived(e.target.value)}
            />
            <p style={{ marginTop: "5px", color: "#555" }}>
              {Number(cashReceived) >= finalTotal ? (
                <span style={{ fontWeight: "bold", color: "#28a745" }}>
                  找零: NT$ {(Number(cashReceived) - finalTotal).toLocaleString()}
                </span>
              ) : (
                <span style={{ fontWeight: "bold", color: "#dc3545" }}>
                  賒帳: NT${" "}
                  {(Number(cashReceived || 0) - finalTotal).toLocaleString()}
                </span>
              )}
            </p>
          </div>
        )}

        {/* 如果是匯款或支票 */}
        {(payment === "匯款" || payment === "支票") && (
          <div style={styles.cashSection}>
            <label style={styles.label}>付款金額</label>
            <input
              style={styles.input}
              type="number"
              min="0"
              placeholder="請輸入付款金額"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
            />
          </div>
        )}

        {/* 發票資訊 */}
        <h4 style={styles.subtitle}>發票資訊</h4>
        <div style={styles.invoiceRow}>
          <div style={styles.invoiceItem}>
            <label style={styles.label}>載具號碼</label>
            <input
              style={styles.input}
              placeholder="請輸入載具號碼"
              value={carrier}
              onChange={(e) =>
                setCarrier(
                  e.target.value.startsWith("/")
                    ? e.target.value
                    : "/" + e.target.value
                )
              }
            />
          </div>
          <div style={styles.invoiceItem}>
            <label style={styles.label}>統一編號</label>
            <input
              style={styles.input}
              placeholder="請輸入8碼統編"
              maxLength={8}
              value={invoiceTaxId}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
          </div>
        </div>

        <button
          style={{ ...styles.primaryBtn, background: "#28a745" }}
          onClick={handleFinish}
        >
          確認結帳
        </button>
      </>
    )}
    {printing && (
      <div style={styles.printingOverlay}>
        <div style={styles.printingContent}>
          <div style={styles.spinner}></div>
          <p>列印發票中…</p>
          </div>
        </div>
      )}
      {/* 列印動畫 keyframes */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}

const styles = {
  container: {
    padding: "20px",
    fontFamily: "'Segoe UI', sans-serif",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
  },
  title: {
    fontSize: "1.8rem",
    margin: 0,
    marginBottom: "15px",
  },
  subtitle: {
    marginTop: "20px",
    fontSize: "1.2rem",
    color: "#555",
  },
  cardGrid3: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "20px",
    marginBottom: "25px",
  },
  cardGrid4: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "15px",
    marginBottom: "20px",
  },
  card: {
    background: "#fff",
    borderWidth: "2px",
    borderStyle: "solid",
    borderColor: "#ddd",
    borderRadius: "8px",
    padding: "18px",
    textAlign: "center",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "1.1rem",
    transition: "all 0.2s",
  },
  cardSelected: {
    borderColor: "#007bff",
    boxShadow: "0 0 6px rgba(0,123,255,0.5)",
  },
  cardDefault: {
    borderColor: "#ddd",
  },
  primaryBtn: {
    display: "block",
    padding: "12px",
    background: "#007bff",
    color: "#fff",
    fontSize: "1rem",
    fontWeight: "bold",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    width: "100%",
    maxWidth: "300px",
    margin: "20px auto 0",
  },
  backBtn: {
    backgroundColor: "#f1f1f1",
    border: "1px solid #ccc",
    borderRadius: "4px",
    padding: "6px 12px",
    cursor: "pointer",
    fontWeight: "bold",
    color: "#333",
  },
  extraInfo: {
    marginTop: "20px",
    background: "#f9f9f9",
    padding: "15px",
    borderRadius: "6px",
    border: "1px solid #ddd",
  },
  input: {
    width: "100%",
    padding: "10px",
    marginBottom: "10px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    fontSize: "1rem",
  },
  textarea: {
    width: "100%",
    padding: "10px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    fontSize: "1rem",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    margin: "20px 0",
  },
  th: {
    textAlign: "left",
    padding: "8px",
    background: "#eee",
    borderBottom: "1px solid #ccc",
  },
  td: {
    padding: "8px",
    borderBottom: "1px solid #eee",
  },
  inputRow: {
    display: "flex",
    gap: "10px",
    marginBottom: "10px",
  },
  halfInput: {
    flex: 1,
    padding: "10px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    fontSize: "1rem",
  },
  cashSection: {
    margin: "20px 0",
  },
  printingOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  printingContent: {
    background: "#fff",
    padding: "30px",
    borderRadius: "8px",
    textAlign: "center",
    boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
  },
  spinner: {
    width: "50px",
    height: "50px",
    border: "6px solid #ccc",
    borderTop: "6px solid #007bff",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    margin: "0 auto 15px",
  },
  tableContainer: {
    maxHeight: "50vh",  // 設定最大高度
    overflowY: "auto",   // 開啟垂直滾動
  },
};
