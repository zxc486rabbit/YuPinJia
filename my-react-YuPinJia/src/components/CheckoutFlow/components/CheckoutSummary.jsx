import { useEffect, useMemo } from "react";
import { customerBus } from "../../../utils/customerBus"; // 路徑依你的實際目錄調整

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
  onBackToCart, // ★ 新增：返回首頁購物車
  styles,
}) {
  // ── 判斷是否要顯示回扣（導遊帳號 + 客人結帳） ─────────────────────────
  const safeParse = (s, fb = null) => {
    try {
      return JSON.parse(s);
    } catch {
      return fb;
    }
  };
  const currentMember = safeParse(localStorage.getItem("currentMember"), {});
  const payerFlag =
    (safeParse(localStorage.getItem("checkoutData"), {})?.checkoutPayer ||
      localStorage.getItem("checkout_payer")) || "";
  const isGuideAccount =
    currentMember?.subType === "導遊" || currentMember?.buyerType === 1;
  const isCustomerPay =
    payerFlag === "CUSTOMER" || payerFlag === "customer"; // 非導遊本人
  const shouldShowCashback = isGuideAccount && isCustomerPay;

  // ── 計算回扣總額（只在 shouldShowCashback 時才算） ──────────────────
  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const pickDealerPrice = (p) => {
    const cands = [p.distributorPrice, p.levelPrice, p.storePrice, p.price];
    for (const c of cands) {
      const n = num(c);
      if (n > 0) return n;
    }
    return 0;
  };
  const pickStorePrice = (p) => {
    const cands = [p.storePrice, p.price];
    for (const c of cands) {
      const n = num(c);
      if (n > 0) return n;
    }
    return 0;
  };

  const cashbackTotal = shouldShowCashback
    ? cartItems.reduce((sum, i) => {
        const unit = Number(i.unitPrice) || 0;
        const discountedUnit =
          hasDiscount && typeof calcDiscountPrice === "function"
            ? Number(calcDiscountPrice(unit))
            : unit;
        const isGift = !!i.isGift || discountedUnit === 0 || unit === 0;
        if (isGift) return sum;

        const storePrice =
          num(i.__storePrice) ||
          pickStorePrice({
            storePrice: i.storePrice,
            price: i.price,
          });

        const dealerPrice =
          num(i.__dealerPrice) ||
          pickDealerPrice({
            distributorPrice: i.distributorPrice,
            levelPrice: i.levelPrice,
            storePrice: i.storePrice,
            price: i.price,
          });

        const diff = Math.max(storePrice - dealerPrice, 0);
        return sum + diff * (Number(i.quantity) || 0);
      }, 0)
    : 0;

  // 統計贈品數（純顯示用）
  const giftCount = cartItems.filter((i) => {
    const unit = Number(i.unitPrice) || 0;
    const discountedUnit =
      hasDiscount && typeof calcDiscountPrice === "function"
        ? Number(calcDiscountPrice(unit))
        : unit;
    return i.isGift || discountedUnit === 0 || unit === 0;
  }).length;

  // 準備客顯快照
  const snapshot = useMemo(() => {
    const toNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
    const mapped = cartItems.map((i) => {
      const unit = toNum(i.unitPrice);
      const discountedUnit =
        hasDiscount && typeof calcDiscountPrice === "function"
          ? toNum(calcDiscountPrice(unit))
          : unit;
      const isGift = !!i.isGift || discountedUnit === 0 || unit === 0;
      const displayUnit = isGift ? 0 : discountedUnit;

      return {
        name: i.name,
        quantity: toNum(i.quantity) || 0,
        __displayUnit: displayUnit,
        __isGift: isGift,
      };
    });

    return {
      cartItems: mapped,
      hasDiscount,
      totalOriginal,
      discountAmount,
      usedPoints,
      finalTotal,
      giftCount,
      shouldShowCashback,
      cashbackTotal,
    };
  }, [cartItems, hasDiscount, calcDiscountPrice, totalOriginal, discountAmount, usedPoints, finalTotal, giftCount, shouldShowCashback, cashbackTotal]);

  useEffect(() => {
    customerBus.publishSummary(snapshot);
  }, [snapshot]);

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
                    key={item.id ?? item.productId ?? item.name}
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

        {shouldShowCashback && (
          <p>
            本次回扣金額:{" "}
            <span style={{ color: "#0d6efd", fontWeight: "bold" }}>
              NT$ {Number(cashbackTotal).toLocaleString()}
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

      <div style={{ display: "flex", gap: 12 }}>
        {/* ★ 新增：返回購物車修改 */}
        <button
          style={{
            ...styles.primaryBtn,
            background: "#6c757d",
          }}
          onClick={onBackToCart}
        >
          返回購物車修改
        </button>

        <button
          style={styles.primaryBtn}
          onClick={onNext}
          disabled={cartItems.length === 0}
        >
          下一步
        </button>
      </div>
    </>
  );
}
