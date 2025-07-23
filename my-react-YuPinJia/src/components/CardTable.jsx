import React from "react";

export default function CardTable({
  products = [],
  addToCart,
  cartItems = [],
  onCheckout,
  usedPoints = 0,
  currentMember,
  isGuideSelf = false,
}) {
  const handleAddToCart = (item) => {
    addToCart({ ...item, quantity: 1 });
  };

  const parsePrice = (str) => Number(str.replace(/[^0-9.]/g, ""));

  const getMemberPrice = (basePrice) => {
    const discountRate =
      isGuideSelf || currentMember?.subType === "廠商"
        ? (currentMember?.discountRate ?? 1)
        : 1;

    if (currentMember?.type === "VIP") {
      return Math.round(basePrice * discountRate);
    }
    return basePrice;
  };

  const checkoutWithDiscount = () => {
    if (!onCheckout) return;

    const totalQuantity = cartItems.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    const subtotal = cartItems.reduce((sum, item) => {
      const price = Number(item.unitPrice ?? 0);
      const discountRate =
        isGuideSelf || currentMember?.subType === "廠商"
          ? (currentMember?.discountRate ?? 1)
          : 1;
      const finalPrice = Math.round(price * discountRate);

      return sum + finalPrice * item.quantity;
    }, 0);

    const finalTotal = subtotal - usedPoints;

    onCheckout?.({
      items: cartItems,
      totalQuantity,
      subtotal,
      pointDiscount: usedPoints,
      finalTotal,
      usedPoints,
    });
  };

  return (
    <div className="content-container w-100">
      <div
        className="mt-3 px-3"
        style={{
          height: "75vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: "20px",
          }}
        >
          {products.length > 0 ? (
            products.map((item) => {
              const originalPrice = parsePrice(item.price);
              const discountedPrice = getMemberPrice(originalPrice);
              const isDiscounted =
                currentMember?.type === "VIP" &&
                (isGuideSelf || currentMember?.subType === "廠商") &&
                discountedPrice !== originalPrice;

              return (
                <div
                  key={item.id}
                  style={{
                    height: "140px",
                    border: "1px solid #dee2e6",
                    borderRadius: "10px",
                    background: "#fff",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
                    cursor: "pointer",
                    padding: "10px",
                    transition: "all 0.2s",
                  }}
                  onClick={() => handleAddToCart(item)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.03)";
                    e.currentTarget.style.boxShadow =
                      "0 4px 8px rgba(0,0,0,0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.boxShadow =
                      "0 2px 4px rgba(0,0,0,0.08)";
                  }}
                >
                  <div
                    style={{
                      fontWeight: "600",
                      fontSize: "1rem",
                      color: "#495057",
                      minHeight: "48px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      textAlign: "center",
                    }}
                  >
                    {item.name}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "0 2px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.75rem",
                        backgroundColor:
                          item.stock > 0 ? "#d4edda" : "#f8d7da",
                        color: item.stock > 0 ? "#155724" : "#721c24",
                        padding: "2px 4px",
                        borderRadius: "4px",
                      }}
                    >
                      {item.stock > 0 ? `庫存 ${item.stock}` : "缺貨"}
                    </span>

                    <div style={{ textAlign: "right" }}>
                      {isDiscounted ? (
                        <div>
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: "#868e96",
                              textDecoration: "line-through",
                            }}
                          >
                            ${originalPrice.toLocaleString()}
                          </div>
                          <div
                            style={{
                              color: "#e83e8c",
                              fontWeight: "700",
                              fontSize: "1rem",
                            }}
                          >
                            ${discountedPrice.toLocaleString()}
                            <span
                              style={{
                                fontSize: "0.65rem",
                                color: "#28a745",
                                marginLeft: "3px",
                              }}
                            >
                              會員價
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div
                          style={{
                            color: "#e83e8c",
                            fontWeight: "700",
                            fontSize: "1rem",
                          }}
                        >
                          ${originalPrice.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center mt-4">無商品資料</div>
          )}
        </div>
      </div>

      <div
        className="d-flex mt-3 mb-2 px-4 w-100"
        style={{ gap: "10px", justifyContent: "flex-start" }}
      >
        <button className="open-button me-3">開錢櫃</button>
        <button className="checkout-button" onClick={checkoutWithDiscount}>
          結帳
        </button>
      </div>
    </div>
  );
}