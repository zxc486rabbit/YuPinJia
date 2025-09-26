import React from "react";

const SOURCE_LABEL = {
  distributor: "經銷",
  level: "等級",
  store: "門市",
  product: "售價",
};

export default function CardTable({
  products = [],
  addToCart,
  cartItems = [],
  onCheckout,
}) {
  const handleAddToCart = (product) => {
    // 保留最小必要欄位，Home 的 addToCart 會處理 price/quantity
    const payload = {
      ...product,
      productId: product.productId ?? product.id,
      quantity: 1,
    };
    addToCart(payload);
  };

  return (
    <div className="content-container w-100">
      <div
        className="mt-3 px-3"
        style={{ height: "75vh", overflowY: "auto" }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: "20px",
          }}
        >
          {products.length > 0 ? (
            products.map((p) => {
              const id = p.productId ?? p.id;
              const inCartQty =
                cartItems?.find(
                  (c) => (c.productId ?? c.id) === id && !c.isGift
                )?.quantity ?? 0;

              const showPrice = Number(p.calculatedPrice ?? p.price ?? 0);
              const showOriginal =
                Number(p.price ?? 0) > 0 &&
                Number(p.price) !== Number(p.calculatedPrice ?? p.price);

              return (
                <div
                  key={id}
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
                  onClick={() => handleAddToCart(p)}
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
                    {p.name}
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
                          Number(p.nowStock ?? 0) > 0 ? "#d4edda" : "#f8d7da",
                        color:
                          Number(p.nowStock ?? 0) > 0 ? "#155724" : "#721c24",
                        padding: "2px 4px",
                        borderRadius: "4px",
                      }}
                    >
                      {Number(p.nowStock ?? 0) > 0
                        ? `庫存 ${p.nowStock}`
                        : "缺貨"}
                    </span>

                    <div style={{ textAlign: "right" }}>
                      {showOriginal && (
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "#868e96",
                            textDecoration: "line-through",
                          }}
                        >
                          ${Number(p.price).toLocaleString()}
                        </div>
                      )}

                      <div
                        style={{
                          color: "#e83e8c",
                          fontWeight: "700",
                          fontSize: "1rem",
                        }}
                      >
                        ${showPrice.toLocaleString()}
                        <span
                          className="badge rounded-pill text-bg-secondary ms-2"
                          style={{ fontSize: "0.7rem" }}
                          title={`價格來源：${p._priceSource}`}
                        >
                          {SOURCE_LABEL[p._priceSource] ?? p._priceSource}
                        </span>
                      </div>

                      <div className="text-muted small">已在購物車：{inCartQty}</div>
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
        <button className="checkout-button" onClick={onCheckout}>
          結帳
        </button>
      </div>
    </div>
  );
}
