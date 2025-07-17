export const getMemberPrice = (basePrice, member) => {
  if (member?.type === "VIP" && member?.subType === "廠商") {
    return Math.round(basePrice * 0.9);
  }
  return basePrice;
};

export const isDealer = (member) =>
  member?.type === "VIP" && member?.subType === "廠商";