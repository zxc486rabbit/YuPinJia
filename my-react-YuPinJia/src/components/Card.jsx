import { useState, useEffect } from "react";

export default function CardCategoryPage() {
  const [allProducts, setAllProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [view, setView] = useState("category"); // "category" 或 "products"

  const categories = ["經典台味", "智慧食品", "國際政治零食", "神話與傳說系"];

  useEffect(() => {
    fetch("/product.json")
      .then((res) => res.json())
      .then((data) => setAllProducts(data))
      .catch((err) => console.error("載入失敗:", err));
  }, []);

  const handleCategoryClick = (cat) => {
    setSelectedCategory(cat);
    setView("products");
  };

  const filteredProducts = selectedCategory
    ? allProducts.filter((item) => item.category === selectedCategory)
    : [];

  return (
    <div className="container p-4">
      {view === "category" && (
        <>
          <h3 className="mb-3">請選擇分類</h3>
          <div className="d-flex gap-3 flex-wrap mb-4">
            {categories.map((cat) => (
              <div
                key={cat}
                onClick={() => handleCategoryClick(cat)}
                className="p-3 shadow rounded"
                style={{
                  backgroundColor:
                    selectedCategory === cat ? "#ffc107" : "#f8f9fa",
                  cursor: "pointer",
                  minWidth: "200px",
                  textAlign: "center",
                  fontSize: "1.4rem",
                  fontWeight: "bold",
                  borderRadius: "8px",
                }}
              >
                {cat}
              </div>
            ))}
          </div>
        </>
      )}

      {view === "products" && (
        <>
        <div className="d-flex align-items-center">
          <button
            className="btn btn-secondary mb-3"
            onClick={() => setView("category")}
          >
            ← 返回
          </button>

          <h4 className="mb-3 ms-4">
            分類：<span className="text-primary">{selectedCategory}</span>
          </h4>
          </div>

          <div className="mt-3" style={{ height: "72vh", overflow: "auto" }}>
          {/* 表格 */}
          <table
            className="table mx-auto text-center"
            style={{
              fontSize: "1.3rem",
              border: "1px solid #D7D7D7",
              width: "90%",
            }}
          >
            <thead
              className="table-info"
              style={{
                borderTop: "1px solid #c5c6c7",
                position: "sticky",
                top: 0,
                background: "#d1ecf1",
                zIndex: 1,
              }}
            >
              <tr>
                <th scope="col">商品名稱</th>
                <th scope="col">操作</th>
                <th scope="col">庫存</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length > 0 ? (
                filteredProducts.map((item, index) => (
                  <tr key={index}>
                    <td>{item.name}</td>
                    <td>
                      <button className="add-button me-2">
                        加入
                        {/* <FaShoppingCart className="pb-1 ms-1"
                          style={{ color: "white", fontSize: "1.2rem" }}
                        /> */}
                      </button>
                    </td>
                    <td>{item.stock}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="12">此分類無商品。</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}