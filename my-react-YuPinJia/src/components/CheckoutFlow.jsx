import { useState } from "react";
import {
  FaStore,
  FaPlane,
  FaShip,
  FaHome,
  FaBuilding,
  FaClipboard,
} from "react-icons/fa";

export default function CheckoutFlow({ onComplete, cartItems = [] }) {
  const [step, setStep] = useState(1);
  const [delivery, setDelivery] = useState("");
  const [payment, setPayment] = useState("");
  const [carrier, setCarrier] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [note, setNote] = useState("");

  const deliveryOptions = [
    { label: "現場帶走", icon: <FaStore size={36} /> },
    { label: "機場提貨", icon: <FaPlane size={36} /> },
    { label: "碼頭提貨", icon: <FaShip size={36} /> },
    { label: "宅配到府", icon: <FaHome size={36} /> },
    { label: "店到店", icon: <FaBuilding size={36} /> },
    { label: "訂單自取", icon: <FaClipboard size={36} /> },
  ];

  const paymentOptions = ["現金", "刷卡", "行動支付", "賒帳"];
  const carrierOptions = ["紙本發票", "手機載具", "自然人憑證", "統一編號"];

  const needExtraInfo = [
    "店到店",
    "機場提貨",
    "碼頭提貨",
    "宅配到府",
    "訂單自取",
  ].includes(delivery);

  const handleFinish = () => {
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
  };

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
                    <td style={styles.td}>${item.unitPrice}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <button
            style={styles.primaryBtn}
            onClick={() => setStep(2)}
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
              <input
                style={styles.input}
                placeholder="姓名"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
              <input
                style={styles.input}
                placeholder="聯絡電話"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
              <input
                style={styles.input}
                placeholder="出貨點"
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
              />
              <input
                style={styles.input}
                type="datetime-local"
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
              />
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
            onClick={() => setStep(3)}
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

          <h4 style={styles.subtitle}>發票載具</h4>
          <div style={styles.cardGrid4}>
            {carrierOptions.map((opt) => (
              <div
                key={opt}
                style={{
                  ...styles.card,
                  ...(carrier === opt
                    ? styles.cardSelected
                    : styles.cardDefault),
                }}
                onClick={() => setCarrier(opt)}
              >
                {opt}
              </div>
            ))}
          </div>

          <button
            style={{ ...styles.primaryBtn, background: "#28a745" }}
            disabled={!payment || !carrier}
            onClick={handleFinish}
          >
            確認結帳
          </button>
        </>
      )}
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
    padding: "15px",
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
};