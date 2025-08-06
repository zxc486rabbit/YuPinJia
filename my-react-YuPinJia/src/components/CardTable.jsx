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
  const handleAddToCart = (product) => {  // 修改為 'product'
    const newProduct = {
      ...product,
      productId: product.productId ?? product.id, // 統一用 productId 作為 key
      quantity: 1,
    };
    addToCart(newProduct);
  };

  const parsePrice = (str) => {
    return typeof str === "number"
      ? str
      : parseFloat(String(str ?? "0").replace(/[^\d.]/g, "")) || 0;
  };

  // 根據會員類型計算價格
  const getMemberPrice = (basePrice) => {
  if (!currentMember) return basePrice;
  return Math.round(basePrice * (currentMember?.discountRate ?? 1));
};

  const checkoutWithDiscount = () => {
    if (!onCheckout) return;

    const totalQuantity = cartItems.reduce(
      (sum, product) => sum + product.quantity,  // 修改為 'product'
      0
    );

    const subtotal = cartItems.reduce((sum, product) => {  // 修改為 'product'
      const price = Number(product.unitPrice ?? 0);
      const discountRate =
        isGuideSelf || currentMember?.subType === "廠商"
          ? (currentMember?.discountRate ?? 1) // 導遊或廠商享有折扣
          : 1;
      const finalPrice = Math.round(price * discountRate); // 折扣後價格

      return sum + finalPrice * product.quantity;  // 修改為 'product'
    }, 0);

    const finalTotal = subtotal - usedPoints; // 扣除點數

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
            products.map((product) => {  // 修改為 'product'
              const originalPrice = parsePrice(product.price); // 解析原價
              const discountedPrice = getMemberPrice(originalPrice); // 計算折扣後價格
             const isDiscounted =
  (currentMember?.discountRate ?? 1) < 1 &&
  discountedPrice !== originalPrice;

              return (
                <div
                  key={product.id}  // 修改為 'product'
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
                  onClick={() => handleAddToCart(product)}  // 修改為 'product'
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
                    {product.name}  {/* 修改為 'product' */}
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
                          product.nowStock > 0 ? "#d4edda" : "#f8d7da",
                        color: product.nowStock > 0 ? "#155724" : "#721c24",
                        padding: "2px 4px",
                        borderRadius: "4px",
                      }}
                    >
                      {product.nowStock > 0 ? `庫存 ${product.nowStock}` : "缺貨"}
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