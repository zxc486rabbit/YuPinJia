export const getMemberPrice = (basePrice, member) => {
  if (!member) return basePrice;
  // 直接依 discountRate 計算
  return Math.round(basePrice * (member.discountRate ?? 1));
};

export const isDealer = (member) =>
  member?.type === "VIP" && member?.subType === "廠商";