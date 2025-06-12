import { useState } from "react";

export default function CardTable({ products = [], addToCart }) {
  return (
    <>
      {/* 主要內容區域 */}
      <div className="content-container w-100">
        {/* 右邊 */}
        <div className="mt-3" style={{ height: "75vh", overflow: "auto" }}>
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
                <th scope="col">價格</th>
                <th scope="col">操作</th>
                <th scope="col">庫存</th>
              </tr>
            </thead>
            <tbody>
              {products.length > 0 ? (
                products.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td className=" text-nowrap">
                      {" "}
                      {Number(
                        item.price.replace(/[^0-9.]/g, "")
                      ).toLocaleString()}
                    </td>
                    <td>
                      <button
                        onClick={() => addToCart(item)}
                        className="add-button me-2"
                      >
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
                  <td colSpan="12">無資料</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="d-flex mt-3 mb-2 px-4 w-100">
          <button className="open-button me-3">開錢櫃</button>
          <button className="checkout-button">結帳</button>
        </div>
      </div>
    </>
  );
}
