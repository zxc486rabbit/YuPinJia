import React from "react";

export default function GiftTable({
  products = [],
  addToCart,
  cartItems = [],
  onCheckout,
}) {
  const handleAddToCart = (item) => {
  const product = {
    ...item,
    productId: item.productId ?? item.id, // ⬅️ 統一用 productId 作為 key
    quantity: 1,
    unitPrice: 0,   // 贈品的價格設為 0
    isGift: true,   // 設置 isGift 為 true
  };
  addToCart(product);
};

  // 贈送邏輯：庫存 <= 5
  const giftProducts = products.filter((item) => item.nowStock <= 5);

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
          {giftProducts.length > 0 ? (
            giftProducts.map((item) => (
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
                        item.nowStock > 0 ? "#d4edda" : "#f8d7da",
                      color: item.nowStock > 0 ? "#155724" : "#721c24",
                      padding: "2px 4px",
                      borderRadius: "4px",
                    }}
                  >
                    {item.nowStock > 0 ? `庫存 ${item.nowStock}` : "缺貨"}
                  </span>

                  <div
                    style={{
                      color: "#17a2b8",
                      fontWeight: "700",
                      fontSize: "1rem",
                    }}
                  >
                    免費
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center mt-4">目前沒有贈送商品</div>
          )}
        </div>
      </div>

      <div
        className="d-flex mt-3 mb-2 px-4 w-100"
        style={{ gap: "10px", justifyContent: "flex-start" }}
      >
        <button className="open-button me-3">開錢櫃</button>
        <button className="checkout-button" onClick={onCheckout}>
          結帳
        </button>
      </div>
    </div>
  );
}