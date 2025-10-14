// src/utils/pricing.js
export const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function pickPriceGeneral(p) {
  const candidates = [
    { key: "distributor", value: num(p.distributorPrice) },
    { key: "level", value: num(p.levelPrice) },
    { key: "store", value: num(p.storePrice) },
    { key: "product", value: num(p.price) },
  ];
  const first = candidates.find((c) => c.value > 0) || candidates.at(-1);
  return { price: first.value, source: first.key };
}

export function pickPriceStoreOnly(p) {
  const candidates = [
    { key: "store", value: num(p.storePrice) },
    { key: "product", value: num(p.price) },
  ];
  const first = candidates.find((c) => c.value > 0) || candidates.at(-1);
  return { price: first.value, source: first.key };
}

export function pickPriceForPayer(product, currentMember, isGuideSelf) {
  const isGuideAccount =
    currentMember?.subType === "導遊" || currentMember?.buyerType === 1;
  return isGuideAccount && !isGuideSelf
    ? pickPriceStoreOnly(product)
    : pickPriceGeneral(product);
}

// 折扣後單價（整數），discountRate 預設 1
export function applyDiscountUnit(unitPrice, discountRate = 1) {
  const up = num(unitPrice);
  const r = Number(discountRate) || 1;
  return Math.round(up * r);
}

// 行內折讓（單品）
export function lineDiscount({ origUnit, discUnit, qty }) {
  const uo = num(origUnit), ud = num(discUnit), q = num(qty);
  return Math.max(0, Math.round((uo - ud) * q));
}

// 現金回饋差額（以「門市價 - 經銷價」累加）
export function cashbackDiff({ items, fallbackPickGeneral, fallbackPickStoreOnly }) {
  let sum = 0;
  for (const it of items || []) {
    if (it.isGift) continue;
    const qty = num(it.quantity ?? it.__qty ?? 1);
    const storePrice = num(it.__storePrice ?? fallbackPickStoreOnly(it).price);
    const dealerPrice = num(it.__dealerPrice ?? fallbackPickGeneral(it).price);
    sum += Math.max(0, storePrice - dealerPrice) * qty;
  }
  return Math.round(sum);
}
