export default function CardTable({
  products = [],
  addToCart,
  cartItems = [],
  onCheckout,
  usedPoints = 0,
  currentMember,
}) {
  const handleAddToCart = (item) => {
    addToCart({ ...item, quantity: 1 });
  };

  const handleCheckout = () => {
    if (onCheckout) {
      const totalQuantity = cartItems.reduce(
        (sum, item) => sum + item.quantity,
        0
      );
      const subtotal = cartItems.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0
      );
      const finalTotal = subtotal - usedPoints;

      onCheckout({
        items: cartItems,
        totalQuantity,
        subtotal,
        pointDiscount: usedPoints,
        finalTotal,
        usedPoints,
      });
    }
  };

  // 會員打折計算
  const getMemberPrice = (basePrice) => {
    if (currentMember?.type === "VIP" && currentMember?.subType === "廠商") {
      return Math.round(basePrice * 0.9);
    }
    return basePrice;
  };

  return (
    <div className="content-container w-100">
      <div
        className="mt-3 px-2"
        style={{
          height: "75vh",
          overflow: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          {products.length > 0 ? (
            products.map((item) => (
              <div
                key={item.id}
                style={{
                  width: "160px",
                  height: "120px",
                  border: "1px solid #cce5ff",
                  borderRadius: "10px",
                  background: "#fff",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  cursor: "pointer",
                  padding: "8px",
                  transition: "all 0.2s",
                }}
                onClick={() => handleAddToCart(item)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.02)";
                  e.currentTarget.style.backgroundColor = "#e9f7fe";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.backgroundColor = "#fff";
                }}
              >
                {/* 商品名稱 */}
                <div
                  style={{
                    fontWeight: "600",
                    fontSize: "1.2rem",
                    color: "#333",
                    minHeight: "60px",
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

                {/* 底部庫存 + 按鈕 */}
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
                      color: item.stock > 0 ? "#155724" : "#721c24",
                    }}
                  >
                    {item.stock > 0 ? `庫存 ${item.stock}` : "缺貨"}
                  </span>

                  {/* 價格 */}
                  <div
  style={{
    textAlign: "right",
  }}
>
  {currentMember?.type === "VIP" && currentMember?.subType === "廠商" ? (
    <div>
      <div
        style={{
          fontSize: "0.8rem",
          color: "#888",
          textDecoration: "line-through",
        }}
      >
        ${Number(item.price.replace(/[^0-9.]/g, "")).toLocaleString()}
      </div>
      <div
        style={{
          color: "#ff5722",
          fontWeight: "700",
          fontSize: "1.1rem",
        }}
      >
        ${getMemberPrice(Number(item.price.replace(/[^0-9.]/g, ""))).toLocaleString()}
        <span
          style={{
            fontSize: "0.7rem",
            color: "#28a745",
            marginLeft: "4px",
          }}
        >
          會員價
        </span>
      </div>
    </div>
  ) : (
    <div
      style={{
        color: "#ff5722",
        fontWeight: "700",
        fontSize: "1.1rem",
      }}
    >
      ${Number(item.price.replace(/[^0-9.]/g, "")).toLocaleString()}
    </div>
  )}
</div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center mt-4">無商品資料</div>
          )}
        </div>
      </div>
      {/* 底部操作按鈕 */}{" "}
      <div className="d-flex mt-3 mb-2 px-4 w-100">
        {" "}
        <button className="open-button me-3">開錢櫃</button>{" "}
        <button className="checkout-button" onClick={handleCheckout}>
          {" "}
          結帳{" "}
        </button>{" "}
      </div>
    </div>
  );
}
