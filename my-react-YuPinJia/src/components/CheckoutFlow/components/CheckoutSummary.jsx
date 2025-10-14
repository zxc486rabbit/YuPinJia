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
  onBackToCart, // ★ 返回首頁購物車
  styles,
}) {
  /* ──────────────────────────────────────────────────────────────
   * 計算工具：原價 / 售價 / 價源標籤 / 折抵
   * ──────────────────────────────────────────────────────────── */
  const toNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

  const getOriginalUnit = (i) =>
    toNum(i.originalPrice ?? i.price ?? i.msrp ?? 0);

  const getChosenUnit = (i) => {
    // 非贈送：以 unitPrice（或 calculatedPrice / storePrice / price）作為「售價」
    if (i.isGift) return 0;
    return toNum(i.unitPrice ?? i.calculatedPrice ?? i.storePrice ?? i.price ?? 0);
  };

  const getPriceSource = (i, chosen) => {
    // 依優先序比對所選售價來源，僅作為售價後的小標籤
    const d = toNum(i.distributorPrice);
    const l = toNum(i.levelPrice);
    const s = toNum(i.storePrice);
    const p = toNum(i.price);
    if (chosen === d && d > 0) return "經銷價格";
    if (chosen === l && l > 0) return "等級價格";
    if (chosen === s && s > 0) return "門市售價";
    if (chosen === p && p > 0) return "商品原價";
    return i._priceSource
      ? (
          { distributor: "經銷價格", level: "等級價格", store: "門市售價", product: "商品原價" }[
            i._priceSource
          ] || "售價"
        )
      : "售價";
  };

  const getPerUnitDiscount = (orig, chosen, isGift) =>
    isGift ? orig : Math.max(0, orig - chosen);

  /* ──────────────────────────────────────────────────────────────
   * 回扣（導遊帳號 + 客人結帳）顯示邏輯
   * ──────────────────────────────────────────────────────────── */
  const safeParse = (s, fb = null) => {
    try {
      return JSON.parse(s);
    } catch {
      return fb;
    }
  };
  const currentMember = safeParse(localStorage.getItem("currentMember"), {});
  const payerFlag =
    safeParse(localStorage.getItem("checkoutData"), {})?.checkoutPayer ||
    localStorage.getItem("checkout_payer") ||
    "";
  const isGuideAccount =
    currentMember?.subType === "導遊" || currentMember?.buyerType === 1;
  const isCustomerPay = payerFlag === "CUSTOMER" || payerFlag === "customer"; // 非導遊本人
  const shouldShowCashback = isGuideAccount && isCustomerPay;

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

  /* ──────────────────────────────────────────────────────────────
   * 客顯快照：包含每品小計/折抵等資料
   * ──────────────────────────────────────────────────────────── */
  const snapshot = useMemo(() => {
    const mapped = cartItems.map((i) => {
      const orig = getOriginalUnit(i);
      const chosen = getChosenUnit(i);
      const isGift = !!i.isGift || chosen === 0;
      const perDisc = getPerUnitDiscount(orig, chosen, isGift);
      const qty = toNum(i.quantity) || 0;

      return {
        name: i.name,
        quantity: qty,
        originalUnit: orig,
        chosenUnit: chosen,
        priceSource: getPriceSource(i, chosen),
        perUnitDiscount: perDisc,
        lineSubtotal: Math.round(chosen * qty),
        lineDiscountedAmount: Math.round((isGift ? orig : perDisc) * qty),
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
  }, [
    cartItems,
    hasDiscount,
    calcDiscountPrice,
    totalOriginal,
    discountAmount,
    usedPoints,
    finalTotal,
    giftCount,
    shouldShowCashback,
    cashbackTotal,
  ]);

  useEffect(() => {
    customerBus.publishSummary(snapshot);
  }, [snapshot]);

  /* ──────────────────────────────────────────────────────────────
   * UI helpers（局部樣式）
   * ──────────────────────────────────────────────────────────── */
  const badge = {
    base: {
      display: "inline-block",
      padding: "0.1rem 0.5rem",
      fontSize: 12,
      borderRadius: 999,
      whiteSpace: "nowrap",
      lineHeight: 1.2,
      verticalAlign: "middle",
    },
    gray: { background: "#e9ecef", color: "#333" },
    cyan: { background: "#17a2b8", color: "#fff" },
    red: { background: "#fee2e2", color: "#b91c1c" },
  };

  const mono = { fontFeatureSettings: "'tnum' on, 'lnum' on", fontVariantNumeric: "tabular-nums" };

  return (
    <>
      <h2 style={styles.title}>確認商品明細</h2>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>商品名稱</th>
              <th style={styles.th}>數量</th>
              <th style={styles.th}>售價</th>
              <th style={styles.th}>折抵</th>
            </tr>
          </thead>
          <tbody>
            {cartItems.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: "center" }}>
                  購物車沒有商品
                </td>
              </tr>
            ) : (
              cartItems.map((item) => {
                const orig = getOriginalUnit(item);
                const chosen = getChosenUnit(item);
                const isGift = !!item.isGift || chosen === 0;
                const src = getPriceSource(item, chosen);
                const perDisc = getPerUnitDiscount(orig, chosen, isGift);

                return (
                  <tr
                    key={item.id ?? item.productId ?? item.name}
                    style={isGift ? { background: "#fff7e6" } : undefined}
                  >
                    {/* 商品名稱 */}
                    <td style={styles.td}>
                      {item.name}
                      {isGift && (
                        <span
                          style={{ ...badge.base, ...badge.cyan, marginLeft: 8 }}
                        >
                          贈品
                        </span>
                      )}
                    </td>

                    {/* 數量 */}
                    <td style={{ ...styles.td, ...mono }}>
                      {Number(item.quantity) || 0}
                    </td>

                    {/* 售價（單行：原價可能劃掉 + 新價 + 價源小標籤） */}
                    <td style={styles.td}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        {/* 左：價格區（單行） */}
                        <span style={mono}>
                          {isGift ? (
                            <>
                              {orig > 0 && (
                                <span
                                  style={{
                                    textDecoration: "line-through",
                                    color: "#999",
                                    fontSize: 13,
                                    marginRight: 6,
                                  }}
                                >
                                  ${orig.toLocaleString()}
                                </span>
                              )}
                              <span style={{ color: "#17a2b8", fontWeight: 700 }}>
                                贈送
                              </span>
                            </>
                          ) : (
                            <>
                              {/* 價格沒變就不劃掉；有變才顯示劃掉原價，與新價並排（單行） */}
                              {orig > 0 && chosen > 0 && orig !== chosen && (
                                <span
                                  style={{
                                    textDecoration: "line-through",
                                    color: "#999",
                                    fontSize: 13,
                                    marginRight: 6,
                                  }}
                                >
                                  ${orig.toLocaleString()}
                                </span>
                              )}
                              <span style={{ color: "#dc3545", fontWeight: 700 }}>
                                ${chosen.toLocaleString()}
                              </span>
                            </>
                          )}
                        </span>

                        {/* 右：來源小標籤（非贈品才顯示） */}
                        {!isGift && (
                          <span style={{ ...badge.base, ...badge.gray }}>{src}</span>
                        )}
                      </span>
                    </td>

                    {/* 折抵（每件折多少 → 顯示為徽章；無折抵顯示「-」） */}
                    <td style={styles.td}>
                      {perDisc > 0 || isGift ? (
                        <span style={{ ...badge.base, ...badge.red, ...mono }}>
                          -$
                          {isGift
                            ? orig.toLocaleString()
                            : perDisc.toLocaleString()}
                        </span>
                      ) : (
                        <span style={{ color: "#999" }}>-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 16, textAlign: "right" }}>
        <p>
          原價總計:{" "}
          <span
            style={{
              textDecoration: hasDiscount ? "line-through" : "none",
              color: hasDiscount ? "#999" : "#000",
              ...mono,
            }}
          >
            NT$ {totalOriginal.toLocaleString()}
          </span>
        </p>

        {hasDiscount && (
          <p>
            折抵金額:{" "}
            <span style={{ color: "#dc3545", fontWeight: 700, ...mono }}>
              NT$ {discountAmount.toLocaleString()}
            </span>
          </p>
        )}

        {shouldShowCashback && (
          <p>
            本次回扣金額:{" "}
            <span style={{ color: "#0d6efd", fontWeight: 700, ...mono }}>
              NT$ {Number(cashbackTotal).toLocaleString()}
            </span>
          </p>
        )}

        <p>
          會員點數折抵金額:{" "}
          <span style={{ color: "#28a745", fontWeight: 700, ...mono }}>
            NT$ {Number(usedPoints ?? 0).toLocaleString()}
          </span>
        </p>

        <p style={{ marginTop: 10, fontWeight: 700, fontSize: "1.2rem" }}>
          總計金額: <span style={mono}>NT$ {finalTotal.toLocaleString()}</span>
        </p>

        {giftCount > 0 && (
          <p style={{ marginTop: 4, color: "#6c757d", fontSize: "0.95rem" }}>
            贈品：{giftCount} 項（不計價）
          </p>
        )}
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        {/* 返回購物車修改 */}
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
