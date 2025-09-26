import React from "react";

const SOURCE_LABEL = {
  distributor: "經銷",
  level: "等級",
  store: "門市",
  product: "售價",
};

export default function CategoryProductTable({
  products = [],
  addToCart,
  cartItems = [],
  onCheckout,
  categories = [],
  selectedCategoryId,
  setSelectedCategoryId,
}) {
  const handleAddToCart = (item) => {
    const payload = {
      ...item,
      productId: item.productId ?? item.id,
      quantity: 1,
    };
    addToCart(payload);
  };

  const currentCategory = categories.find(
    (cat) => (cat.id ?? cat.value) === selectedCategoryId
  );

  return (
    <div className="content-container w-100">
      <div
        className="mt-3 px-3"
        style={{ height: "75vh", overflowY: "auto" }}
      >
        {/* 沒選分類 → 顯示分類清單 */}
        {!selectedCategoryId ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: "20px",
            }}
          >
            {categories.map((cat) => {
              const id = cat.id ?? cat.value;
              const name = cat.name ?? cat.label;
              return (
                <div
                  key={id}
                  style={{
                    height: "100px",
                    border: "1px solid #dee2e6",
                    borderRadius: "8px",
                    background: "#f8f9fa",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "600",
                    fontSize: "1.05rem",
                    color: "#007bff",
                    cursor: "pointer",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                    transition: "all 0.2s",
                  }}
                  onClick={() => setSelectedCategoryId(id)}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "#e9ecef")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "#f8f9fa")
                  }
                >
                  {name}
                </div>
              );
            })}
          </div>
        ) : (
          <>
            {/* 標題列 */}
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
                  backgroundColor: "#357ABD",
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
                {currentCategory?.name ?? currentCategory?.label ?? "產品列表"}
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
              {products.map((p) => {
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

                        <div className="text-muted small">
                          已在購物車：{inCartQty}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {products.length === 0 && (
                <div className="text-center mt-4">此分類目前無商品</div>
              )}
            </div>
          </>
        )}
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
