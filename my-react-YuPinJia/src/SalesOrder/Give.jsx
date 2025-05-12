import { useState, useEffect } from "react";
import "../components/Search.css"; // 引入 搜尋框 的 CSS 來調整樣式
import SearchField from "../components/SearchField"; // 引入 搜尋框 模組

export default function Give() {
  const [orderId, setOrderId] = useState("");
  const [pickupTime, setPickupTime] = useState("");

  const [tableData, setTableData] = useState([]); // 存放表格資料

  const handleSearch = () => {
    console.log("搜尋條件：", { orderId, pickupTime });
  };

  useEffect(() => {
    fetch("/SalesTable.json") // 從 public 目錄讀取 JSON
      .then((response) => response.json())
      .then((data) => setTableData(data))
      .catch((error) => console.error("載入失敗:", error));
  }, []);

  return (
    <>
      <div className="search-container d-flex flex-wrap gap-3 px-4 pt-4 pb-3 rounded">
        <SearchField
          label="產品"
          type="text"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
        />
        <SearchField
          label="受贈人"
          type="number"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
        />
        <SearchField
          label="操作人"
          type="number"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
        />
        <SearchField
          label="起"
          type="date"
          value={pickupTime}
          onChange={(e) => setPickupTime(e.target.value)}
        />
        <SearchField
          label="迄"
          type="date"
          value={pickupTime}
          onChange={(e) => setPickupTime(e.target.value)}
        />

        {/* 搜尋按鈕 */}
        <button onClick={handleSearch} className="search-button">
          搜尋
        </button>
      </div>
      {/* 表格 */}
      <div
        className="table-container"
        style={{
          maxHeight: "82vh", // 根據你想要的高度調整
          overflowY: "auto",
        }}
      >
        <table className="table text-center" style={{ fontSize: "1.2rem" }}>
          <thead
            className="table-light"
            style={{
              borderTop: "1px solid #c5c6c7",
              position: "sticky",
              top: 0,
              background: "#d1ecf1",
              zIndex: 1,
            }}
          >
            <tr>
              <th scope="col">商品</th>
              <th scope="col">日期</th>
              <th scope="col">數量</th>
              <th scope="col">銷售價格</th>
              <th scope="col">合計</th>
              <th scope="col">受贈人</th>
              <th scope="col">手機/用戶名</th>
              <th scope="col">操作人</th>
              <th scope="col">操作</th>
            </tr>
          </thead>
          <tbody>
            {tableData.length > 0 ? (
              tableData.map((item, index) => (
                <tr key={index}>
                  <td>{item.product}</td>
                  <td>{item.startDate}</td>
                  <td>2</td>
                  <td>1,234</td>
                  <td>2,468</td>
                  <td>{item.member}</td>
                  <td>0988-588-147</td>
                  <td>{item.name}</td>
                  <td>
                    <button className="edit-button">修改</button>
                  </td>
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
    </>
  );
}
