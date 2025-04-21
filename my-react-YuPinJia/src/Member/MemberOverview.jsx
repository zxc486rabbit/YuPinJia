import { useState, useEffect } from "react";
import "../components/Search.css"; // 引入 搜尋框 的 CSS 來調整樣式
import SearchField from "../components/SearchField"; // 引入 搜尋框 模組

export default function MemberOverview() {
  const [orderId, setOrderId] = useState("");
  const [status, setStatus] = useState("all");

  const [tableData, setTableData] = useState([]); // 存放表格資料

  const handleSearch = () => {
    console.log("搜尋條件：", { orderId, status });
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
          label="聯絡電話"
          type="text"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
        />
        <SearchField
          label="會員類型"
          type="select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[
            { value: "all", label: "全部" },
            { value: "pending", label: "一般會員" },
            { value: "completed", label: "經銷會員" },
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
              <th scope="col">會員編號</th>
              <th scope="col">會員名稱</th>
              <th scope="col">聯絡電話</th>
              <th scope="col">地址</th>
              <th scope="col">建立日期</th>
              <th scope="col">等級</th>
              <th scope="col">點數</th>
              <th scope="col">消費情形</th>
              <th scope="col">推薦者</th>
              <th scope="col">運費</th>
              <th scope="col">會員類型</th>
              <th scope="col">操作</th>
            </tr>
          </thead>
          <tbody>
            {tableData.length > 0 ? (
              tableData.map((item, index) => (
                <tr key={index}>
                  <td>{item.orderId}</td>
                  <td>{item.member}</td>
                  <td>{item.phone}</td>
                  <td>新北市...</td>
                  <td>2025-04-18</td>
                  <td>白銀</td>
                  <td>10</td>
                  <td>
                    <button className="check-button">檢視</button>
                  </td>
                  <td>{item.name}</td>
                  <td>免運費</td>
                  <td>
                    {" "}
                    <button className="sales-button">經銷A</button>
                  </td>
                  <td>
                    <button className="edit-button">編輯</button>
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
