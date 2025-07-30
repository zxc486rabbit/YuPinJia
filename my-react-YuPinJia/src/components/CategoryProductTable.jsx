import React from "react";

export default function CategoryProductTable({
  products = [],
  addToCart,
  cartItems = [],
  onCheckout,
  usedPoints = 0,
  currentMember,
  isGuideSelf = false,
  categories = [],
  selectedCategoryId,
  setSelectedCategoryId,
}) {
  const handleAddToCart = (item) => {
  const product = {
    ...item,
    productId: item.productId ?? item.id, // ⬅️ 統一用 productId 作為 key
    quantity: 1,
  };
  addToCart(product);
};

  const parsePrice = (str) => Number(String(str).replace(/[^0-9.]/g, ""));
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

  const handleCheckout = () => {
    onCheckout?.();
  };

  const currentCategory = categories.find(
    (cat) => cat.id === selectedCategoryId
  );

  return (
    <div className="content-container w-100">
      <div
        className="mt-3 px-3"
        style={{
          height: "75vh",
          overflowY: "auto",
        }}
      >
        {/* 沒選分類時，顯示所有分類清單 */}
        {!selectedCategoryId ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: "20px",
            }}
          >
            {categories.map((cat) => (
              <div
                key={cat.id}
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
                onClick={() => setSelectedCategoryId(cat.id)}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#e9ecef")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "#f8f9fa")
                }
              >
                {cat.name}
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* 上方標題列與返回按鈕 */}
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
                  backgroundColor: "#357ABD", // ✅ 改為單一背景色
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  transition: "all 0.2s ease-in-out",
                }}
                onClick={() => setSelectedCategoryId(null)}
              >
                ← 返回分類
              </button>
              <h4
                style={{
                  borderLeft: "4px solid #adb5bd",
                  paddingLeft: "10px",
                  fontWeight: "700",
                  fontSize: "1.2rem",
                  color: "#495057",
                  margin: 0,
                }}
              >
                {currentCategory?.name || "產品列表"}
              </h4>
            </div>

            {/* 商品清單 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: "20px",
              }}
            >
              {products.map((item) => {
                const originalPrice = parsePrice(item.price);
                const discountedPrice = getMemberPrice(originalPrice);
                const isDiscounted =
                  currentMember?.type === "VIP" &&
                  (isGuideSelf || currentMember?.subType === "廠商") &&
                  discountedPrice !== originalPrice;

                return (
                  <div
                    key={item.productId}
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
                            item.nowStock > 0 ? "#d4edda" : "#f8d7da",
                          color: item.nowStock > 0 ? "#155724" : "#721c24",
                          padding: "2px 4px",
                          borderRadius: "4px",
                        }}
                      >
                        {item.nowStock > 0 ? `庫存 ${item.nowStock}` : "缺貨"}
                      </span>

                      <div style={{ textAlign: "right" }}>
                        {isDiscounted ? (
                          <>
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
                          </>
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
        <button className="checkout-button" onClick={handleCheckout}>
          結帳
        </button>
      </div>
    </div>
  );
}
