import React, { useState } from "react";

export default function CategoryProductTable({
  products = [],
  addToCart,
  cartItems = [],
  onCheckout,
  usedPoints = 0,
  currentMember,
  isGuideSelf = false,
}) {
  const [selectedCategory, setSelectedCategory] = useState(null);

  const handleAddToCart = (item) => {
    addToCart({ ...item, quantity: 1 });
  };

  const parsePrice = (str) => Number(str.replace(/[^0-9.]/g, ""));

  const getMemberPrice = (basePrice) => {
    const discountRate =
      isGuideSelf || currentMember?.subType === "廠商"
        ? currentMember?.discountRate ?? 1
        : 1;

    if (currentMember?.type === "VIP") {
      return Math.round(basePrice * discountRate);
    }
    return basePrice;
  };

  const categoryGroups = products.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const checkoutWithDiscount = () => {
    if (!onCheckout) return;

    const subtotal = cartItems.reduce((sum, item) => {
      const price = Number(item.unitPrice ?? 0);
      const discountRate =
        isGuideSelf || currentMember?.subType === "廠商"
          ? currentMember?.discountRate ?? 1
          : 1;
      const finalPrice = Math.round(price * discountRate);

      return sum + finalPrice * item.quantity;
    }, 0);

    const finalTotal = subtotal - usedPoints;

    onCheckout?.({
      items: cartItems,
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
        {!selectedCategory ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: "20px",
            }}
          >
            {Object.keys(categoryGroups).map((category) => (
              <div
                key={category}
                style={{
                  height: "100px",
                  border: "1px solid #dee2e6",
                  borderRadius: "8px",
                  background: "#f8f9fa",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "600",
                  fontSize: "1.1rem",
                  color: "#007bff",
                  cursor: "pointer",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                  transition: "all 0.2s",
                }}
                onClick={() => setSelectedCategory(category)}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#e9ecef")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "#f8f9fa")
                }
              >
                {category}
              </div>
            ))}
          </div>
        ) : (
          <>
            <div
  style={{
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "16px",
  }}
>
  <button
  style={{
    padding: "8px 20px",
    fontSize: "0.95rem",
    fontWeight: "600",
    background: "linear-gradient(90deg, #4a90e2, #357ABD)",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    transition: "all 0.2s ease-in-out",
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.background =
      "linear-gradient(90deg, #357ABD, #2a65a0)";
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.background =
      "linear-gradient(90deg, #4a90e2, #357ABD)";
  }}
  onMouseDown={(e) => {
    e.currentTarget.style.transform = "scale(0.97)";
  }}
  onMouseUp={(e) => {
    e.currentTarget.style.transform = "scale(1)";
  }}
  onClick={() => setSelectedCategory(null)}
>
  ← 返回分類
</button>

  <h4
    style={{
      borderLeft: "4px solid #adb5bd", // 灰色邊條
      paddingLeft: "10px",
      fontWeight: "700",
      fontSize: "1.2rem",
      color: "#495057", // 深灰文字
      margin: 0,
    }}
  >
    {selectedCategory}
  </h4>
</div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: "20px",
              }}
            >
              {categoryGroups[selectedCategory].map((item) => {
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
              })}
            </div>
          </>
        )}
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