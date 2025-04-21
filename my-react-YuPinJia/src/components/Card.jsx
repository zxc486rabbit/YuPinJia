import Navbar from "./Navbar";

import { FaShoppingCart } from "react-icons/fa";

export default function Card({ products = [] }) {
  return (
    <>
      {/* 主要內容區域 */}
      <div className="content-container w-100">
        <Navbar />
        <div
          className="pt-4 d-flex flex-wrap justify-content-center"
          style={{ gap: "1.5rem 3rem", height: "78%", overflow: "auto" }}
        >
          {products.length > 0 ? (
            products.map((product) => (
              <div
                key={product.id}
                className="card m-2 shadow"
                style={{ width: "14rem", height: "auto", cursor: "pointer" }}
              >
                <img
                  src={product.image}
                  className="card-img-top"
                  style={{
                    borderBottom: "1px solid #ebebeb",
                    minHeight: "150px", // 限制圖片高度
                    maxHeight: "150px", // 限制圖片高度
                    objectFit: "cover", // 保持比例並填滿
                  }}
                  alt={product.name}
                />
                <div className="card-body p-2">
                  <p className="card-text text-center fw-bold fs-5">
                    {product.name}
                  </p>
                  <div className="d-flex justify-content-between align-items-center">
                    <p className="mb-0">庫存 : {product.stock}</p>
                    {/* 價錢與增減 */}
                    <div className="d-flex align-items-center">
                      <p
                        className="mb-0 fw-bold me-2"
                        style={{ color: "#D27B02" }}
                      >
                        本店 :{" "}
                        <span style={{ fontSize: "1.1rem" }}>
                          {product.price}
                        </span>
                      </p>
                      <FaShoppingCart
                        style={{ color: "#545454", fontSize: "1.1rem" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center fw-bold fs-5">沒有產品資料</p> // 當 products 為空時顯示
          )}
        </div>
        <div className="d-flex mt-4 mx-auto">
          <button className="open-button me-3">開錢櫃</button>
          <button className="checkout-button">結帳</button>
        </div>
      </div>
    </>
  );
}
