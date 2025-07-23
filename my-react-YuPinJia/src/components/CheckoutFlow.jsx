import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [delivery, setDelivery] = useState("");
  const [payment, setPayment] = useState("");
  const [carrier, setCarrier] = useState("");
  const [printing, setPrinting] = useState(false);

  const [customerName, setCustomerName] = useState(currentMember.name || "");
  const [customerPhone, setCustomerPhone] = useState(currentMember.phone || "");
  const [pickupLocation, setPickupLocation] = useState("");
  const [cashReceived, setCashReceived] = useState("");
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

  const paymentOptions = ["現金", "匯款", "支票", "賒帳"];
  const carrierOptions = ["紙本發票", "手機載具", "自然人憑證", "統一編號"];

  const needExtraInfo = [
    "店到店",
    "機場提貨",
    "碼頭提貨",
    "宅配到府",
    "訂單自取",
  ].includes(delivery);

  const handleFinish = () => {
    setPrinting(true);

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
      });
      navigate("/"); // ✅ 回首頁
    }, 1500);
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

  const couponDiscount = currentMember?.couponDiscount ?? 0;

  const finalTotal = Math.max(0, totalDiscounted - couponDiscount);

  const discountAmount = totalOriginal - totalDiscounted;

  return (
    <div style={styles.container}>
      {/* Step 1: 明細 */}
      {step === 1 && (
        <>
          <h2 style={styles.title}>確認商品明細</h2>
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
              優惠券折抵金額:{" "}
              <span style={{ color: "#28a745", fontWeight: "bold" }}>
                NT$ {couponDiscount.toLocaleString()}
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
              NT${" "}
              {cartItems
                .reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
                .toLocaleString()}
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

          {/* 如果選現金 */}
          {payment === "現金" && (
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
                差額:{" "}
                <span style={{ fontWeight: "bold" }}>
                  NT${" "}
                  {Math.max(
                    0,
                    cartItems.reduce(
                      (sum, i) => sum + i.unitPrice * i.quantity,
                      0
                    ) - Number(cashReceived || 0)
                  )}
                </span>
              </p>
            </div>
          )}

          <h4 style={styles.subtitle}>發票資訊</h4>
          <div style={styles.invoiceRow}>
            <div style={styles.invoiceItem}>
              <label style={styles.label}>載具號碼</label>
              <input
                style={styles.input}
                placeholder="/請輸入載具號碼"
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
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
          </div>

          <button
            style={{ ...styles.primaryBtn, background: "#28a745" }}
            disabled={!payment}
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
};
