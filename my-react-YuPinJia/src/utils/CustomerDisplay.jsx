import React, { useEffect, useMemo, useState } from "react";
import { customerBus } from "../utils/customerBus";

// 簡單客顯樣式（大字、等寬間距）
const styles = {
  wrap: {
    minHeight: "100vh",
    background: "#111",
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    padding: "24px",
  },
  header: { fontSize: "28px", fontWeight: 700, letterSpacing: "2px", marginBottom: "12px" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "22px" },
  th: { textAlign: "left", borderBottom: "2px solid #333", padding: "12px 8px", color: "#bbb" },
  td: { borderBottom: "1px dashed #333", padding: "12px 8px" },
  badgeGift: {
    marginLeft: 8, padding: "2px 8px", fontSize: 14, borderRadius: 6, background: "#17a2b8", color: "#fff",
  },
  footer: { marginTop: "auto", paddingTop: 16, borderTop: "2px solid #333" },
  row: { display: "flex", justifyContent: "space-between", fontSize: "22px", marginTop: 8 },
  total: { fontSize: "36px", fontWeight: 800, marginTop: 8 },
  hint: { marginTop: 16, fontSize: 16, color: "#888" },
  standby: {
    minHeight: "100vh", background: "#111", color: "#666", display: "flex",
    alignItems: "center", justifyContent: "center", fontSize: 22, letterSpacing: 1,
  },
};

export default function CustomerDisplay() {
  const [visible, setVisible] = useState(false);
  const [payload, setPayload] = useState(null);

  // 初始狀態（避免先開客顯看不到明細）
  useEffect(() => {
    const init = customerBus.readInitial();
    setVisible(init.visible);
    setPayload(init.payload);
  }, []);

  // 監聽廣播 + storage（跨分頁/視窗）
  useEffect(() => {
    const ch = customerBus.channel;
    const onMsg = (e) => {
      const { type, payload: p } = e.data || {};
      if (type === "summary_show") { setVisible(true); setPayload(p || null); }
      if (type === "summary_hide") { setVisible(false); setPayload(null); }
      if (type === "checkout_done") { setVisible(false); setPayload(null); }
    };
    ch?.addEventListener("message", onMsg);

    const onStorage = () => {
      const init = customerBus.readInitial();
      setVisible(init.visible);
      setPayload(init.payload);
    };
    window.addEventListener("storage", onStorage);

    return () => {
      ch?.removeEventListener("message", onMsg);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  if (!visible || !payload) {
    return (
      <div style={styles.standby}>
        客顯待命中…<span style={{ marginLeft: 8, color: "#999" }}>等待收銀端傳送明細</span>
      </div>
    );
  }

  const { cartItems = [], hasDiscount, usedPoints = 0, finalTotal = 0, totalOriginal = 0, discountAmount = 0, giftCount = 0, cashbackTotal = 0, shouldShowCashback = false } = payload;

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>購物明細</div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>品名</th>
            <th style={styles.th}>數量</th>
            <th style={styles.th}>單價</th>
          </tr>
        </thead>
        <tbody>
          {cartItems.length === 0 ? (
            <tr>
              <td style={styles.td} colSpan={3}>購物車沒有商品</td>
            </tr>
          ) : cartItems.map((item, idx) => {
            const isGift = !!item.__isGift; // 收銀端已標記
            return (
              <tr key={idx}>
                <td style={styles.td}>
                  {item.name}
                  {isGift && <span style={styles.badgeGift}>贈品</span>}
                </td>
                <td style={styles.td}>{item.quantity}</td>
                <td style={styles.td}>
                  {isGift ? "贈送" : `NT$ ${(Number(item.__displayUnit) || 0).toLocaleString()}`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={styles.footer}>
        <div style={styles.row}>
          <div>原價總計</div>
          <div style={{ textDecoration: hasDiscount ? "line-through" : "none", color: hasDiscount ? "#888" : "#fff" }}>
            NT$ {Number(totalOriginal).toLocaleString()}
          </div>
        </div>

        {hasDiscount && (
          <div style={styles.row}>
            <div>折抵金額</div>
            <div>NT$ {Number(discountAmount).toLocaleString()}</div>
          </div>
        )}

        {shouldShowCashback && (
          <div style={styles.row}>
            <div>本次回扣金額</div>
            <div>NT$ {Number(cashbackTotal).toLocaleString()}</div>
          </div>
        )}

        <div style={styles.row}>
          <div>會員點數折抵</div>
          <div>NT$ {Number(usedPoints).toLocaleString()}</div>
        </div>

        {!!giftCount && (
          <div style={{ ...styles.row, color: "#bbb" }}>
            <div>贈品項目</div>
            <div>{giftCount} 項（不計價）</div>
          </div>
        )}

        <div style={styles.total}>
          應付金額：NT$ {Number(finalTotal).toLocaleString()}
        </div>

        <div style={styles.hint}>* 以上為即時明細，結帳完成後本畫面將自動清空</div>
      </div>
    </div>
  );
}
