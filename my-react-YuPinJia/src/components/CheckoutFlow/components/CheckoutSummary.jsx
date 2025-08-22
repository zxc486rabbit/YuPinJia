// Step1：確認商品明細
export default function CheckoutSummary({
  cartItems,
  hasDiscount,
  calcDiscountPrice,
  totalOriginal,
  discountAmount,
  usedPoints,
  finalTotal,
  onNext,
  styles,
}) {

    // 統計贈品數（純顯示用）
  const giftCount = cartItems.filter((i) => {
    const unit = Number(i.unitPrice) || 0;
    const discountedUnit =
      hasDiscount && typeof calcDiscountPrice === "function"
        ? Number(calcDiscountPrice(unit))
        : unit;
    return i.isGift || discountedUnit === 0 || unit === 0;
  }).length;
  return (
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
              cartItems.map((item) => {
                const unit = Number(item.unitPrice) || 0;
                const discountedUnit =
                  hasDiscount && typeof calcDiscountPrice === "function"
                    ? Number(calcDiscountPrice(unit))
                    : unit;

                const isGift =
                  !!item.isGift || discountedUnit === 0 || unit === 0;

                return (
                  <tr
                    key={item.id}
                    style={isGift ? { background: "#fff7e6" } : undefined}
                  >
                    <td style={styles.td}>
                      {item.name}
                      {isGift && (
                        <span
                          style={{
                            display: "inline-block",
                            marginLeft: 8,
                            padding: "0.1rem 0.4rem",
                            fontSize: 12,
                            borderRadius: 6,
                            background: "#17a2b8",
                            color: "#fff",
                            verticalAlign: "middle",
                          }}
                        >
                          贈品
                        </span>
                      )}
                    </td>
                    <td style={styles.td}>{item.quantity}</td>
                    <td style={styles.td}>
                      {isGift ? (
                        <>
                          {unit > 0 && (
                            <div
                              style={{
                                textDecoration: "line-through",
                                color: "#999",
                                fontSize: "0.9rem",
                              }}
                            >
                              ${unit.toLocaleString()}
                            </div>
                          )}
                          <div style={{ color: "#17a2b8", fontWeight: "bold" }}>
                            贈送
                          </div>
                        </>
                      ) : hasDiscount && discountedUnit !== unit ? (
                        <div>
                          <div
                            style={{
                              textDecoration: "line-through",
                              color: "#999",
                              fontSize: "0.9rem",
                            }}
                          >
                            ${unit.toLocaleString()}
                          </div>
                          <div style={{ color: "#dc3545", fontWeight: "bold" }}>
                            ${discountedUnit.toLocaleString()}
                          </div>
                        </div>
                      ) : (
                        `$${unit.toLocaleString()}`
                      )}
                    </td>
                  </tr>
                );
              })
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
            NT$ {Number(usedPoints ?? 0).toLocaleString()}
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

        {giftCount > 0 && (
          <p style={{ marginTop: 4, color: "#6c757d", fontSize: "0.95rem" }}>
            贈品：{giftCount} 項（不計價）
          </p>
        )}
      </div>

      <button style={styles.primaryBtn} onClick={onNext} disabled={cartItems.length === 0}>
        下一步
      </button>
    </>
  );
}
