import Navbar from "./Navbar";
import { useState, useEffect } from "react";
import { FaShoppingCart } from "react-icons/fa";

export default function CardTable({ products = [] }) {
  const [tableData, setTableData] = useState([]); // 存放表格資料

  useEffect(() => {
    fetch("/SalesTable.json") // 從 public 目錄讀取 JSON
      .then((response) => response.json())
      .then((data) => setTableData(data))
      .catch((error) => console.error("載入失敗:", error));
  }, []);

  return (
    <>
      {/* 主要內容區域 */}
      <div className="content-container w-100">
        <Navbar />

        {/* 左邊 */}
        <div className="mt-3" style={{ height: "100vh", overflow: "auto" }}>
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
              {tableData.length > 0 ? (
                tableData.map((item, index) => (
                  <tr key={index}>
                    <td>{item.product}</td>
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
                  <td colSpan="12">無資料</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="d-flex mt-4 mx-auto">
          <button className="open-button me-3">開錢櫃</button>
          <button className="checkout-button">結帳</button>
        </div>
      </div>
    </>
  );
}
