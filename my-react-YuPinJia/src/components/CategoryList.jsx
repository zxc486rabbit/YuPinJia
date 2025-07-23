import React, { useState } from "react";

function CategoryList({ categories, onSelect }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
        gap: "20px",
      }}
    >
      {categories.map((category) => (
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
          onClick={() => onSelect(category)}
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
  );
}

function ProductGrid({ products, onAddToCart, getPrice }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
        gap: "20px",
      }}
    >
      {products.map((item) => {
        const originalPrice = parsePrice(item.price);
        const discountedPrice = getPrice(originalPrice);
        const isDiscounted = discountedPrice !== originalPrice;

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
            onClick={() => onAddToCart(item)}
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
                  backgroundColor: item.stock > 0 ? "#d4edda" : "#f8d7da",
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
  );
}

function parsePrice(str) {
  return Number(str.replace(/[^0-9.]/g, ""));
}

export default function CategoryPage({
  products = [],
  addToCart,
  cartItems,
  onCheckout,
  usedPoints = 0,
  currentMember,
  isGuideSelf = false,
}) {
  const [selectedCategory, setSelectedCategory] = useState(null);

  const categoryGroups = products.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const getPrice = (basePrice) => {
    const discountRate =
      isGuideSelf || currentMember?.subType === "廠商"
        ? currentMember?.discountRate ?? 1
        : 1;
    if (currentMember?.type === "VIP") {
      return Math.round(basePrice * discountRate);
    }
    return basePrice;
  };

  return (
    <div className="content-container w-100">
      <div className="mt-3 px-3" style={{ height: "75vh", overflowY: "auto" }}>
        {!selectedCategory ? (
          <CategoryList
            categories={Object.keys(categoryGroups)}
            onSelect={setSelectedCategory}
          />
        ) : (
          <>
            <button
              onClick={() => setSelectedCategory(null)}
              style={{
                marginBottom: "10px",
                background: "#6c757d",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                padding: "6px 12px",
                cursor: "pointer",
              }}
            >
              ← 返回分類
            </button>

            <h4
              style={{
                borderLeft: "4px solid #007bff",
                paddingLeft: "10px",
                fontWeight: "700",
                fontSize: "1.2rem",
                color: "#007bff",
                marginBottom: "12px",
              }}
            >
              {selectedCategory}
            </h4>

            <ProductGrid
              products={categoryGroups[selectedCategory]}
              onAddToCart={handleAddToCart}
              getPrice={getPrice}
            />
          </>
        )}
      </div>
    </div>
  );
}
