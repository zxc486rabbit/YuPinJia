import { useState, useEffect } from "react";
import "../components/Search.css"; // 引入 搜尋框 的 CSS 來調整樣式
import SearchField from "../components/SearchField"; // 引入 搜尋框 模組

export default function Blacklist() {
  const [orderId, setOrderId] = useState("");
  const [tableData, setTableData] = useState([]); // 存放表格資料

  const handleSearch = () => {
    console.log("搜尋條件：", { orderId});
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
          label="會員名稱"
          type="text"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
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
              <th scope="col">聯絡電話</th>
              <th scope="col">最後結款日期</th>
              <th scope="col">信用額度</th>
              <th scope="col">賒帳總金額</th>
              <th scope="col">通知紀錄</th>
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
                  <td>{item.phone}</td>
                  <td>2024-12-25</td>
                  <td>-{item.totalAmount}</td>
                  <td>{item.totalAmount}</td>
                  <td>10</td>
                  <td> <button className="check-button">檢視</button></td>
                  <td>
                    <button className="edit-button">移出</button>
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
