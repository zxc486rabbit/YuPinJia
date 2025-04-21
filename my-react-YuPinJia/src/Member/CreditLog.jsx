import { useState, useEffect } from "react";
import "../components/Search.css"; // 引入 搜尋框 的 CSS 來調整樣式
import SearchField from "../components/SearchField"; // 引入 搜尋框 模組

export default function CreditLog() {
  const [orderId, setOrderId] = useState("");
  const [status, setStatus] = useState("all");
  const [pickupTime, setPickupTime] = useState("");
  const [tableData, setTableData] = useState([]); // 存放表格資料

  const handleSearch = () => {
    console.log("搜尋條件：", { orderId, status, pickupTime });
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
          label="會員編號"
          type="text"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
        />
        <SearchField
          label="日期"
          type="date"
          value={pickupTime}
          onChange={(e) => setPickupTime(e.target.value)}
        />
        <SearchField
          label="狀態"
          type="select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[
            { value: "all", label: "全部" },
            { value: "pending", label: "未還款" },
            { value: "completed", label: "已還款" },
          ]}
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
          maxHeight: "79vh", // 根據你想要的高度調整
          overflowY: "auto",
          overflowX: "auto", /* 避免邊框被剪掉 */
        }}
      >
        <table className="table text-center" style={{ fontSize: "1.2rem"}}>
          <thead
            className="table-light"
            style={{
              
              position: "sticky",
              top: 0,
              background: "#d1ecf1",
              zIndex: 1,
              borderBlock: "1px solid #c5c6c7",
            }}
          >
            <tr>
              <th scope="col">
                {" "}
                <input type="checkbox" className="w-5 h-5 text-gray-600" />
              </th>
              <th scope="col">會員編號</th>
              <th scope="col">會員名稱</th>
              <th scope="col">聯絡人</th>
              <th scope="col">帳單日期</th>
              <th scope="col">訂單編號</th>
              <th scope="col">賒帳金額</th>
              <th scope="col">還款日期</th>
              <th scope="col">狀態</th>
              <th scope="col">提醒次數</th>
              <th scope="col">備註</th>
              <th scope="col">操作</th>
            </tr>
          </thead>
          <tbody>
            {tableData.length > 0 ? (
              tableData.map((item, index) => (
                <tr key={index}>
                  <td>
                    {" "}
                    <input type="checkbox" className="w-5 h-5 text-gray-600" />
                  </td>
                  <td>{item.orderId}</td>
                  <td>{item.member}</td>
                  <td>{item.name}</td>
                  <td>2025-04-18</td>
                  <td>{item.orderId}</td>
                  <td>{item.totalAmount}</td>
                  <td></td>
                  <td>未還款</td>
                  <td>1</td>
                  <td>關稅太高了</td>
                  <td>
                    <button className="edit-button">提醒</button>
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
