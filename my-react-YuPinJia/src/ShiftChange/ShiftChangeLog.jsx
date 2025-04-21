import { useState, useEffect } from "react";
import SearchField from "../components/SearchField"; // 引入 搜尋框 模組

export default function ShiftChangeLog() {
  const [tableData, setTableData] = useState([]); // 存放表格資料
  const [pickupTime, setPickupTime] = useState("");
  const handleSearch = () => {
    console.log("搜尋條件：", { pickupTime });
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
          label="日期"
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
          maxHeight: "79vh", // 根據你想要的高度調整
          overflowY: "auto",
          border: "1px solid #c5c6c7"
        }}
      >
        <table className="table text-center" style={{ fontSize: "1.2rem" }}>
          <thead
            className="table-light"
            style={{
              position: "sticky",
              top: 0,
              background: "#d1ecf1",
              zIndex: 1,
            }}
          >
            <tr>
              <th scope="col">日期</th>
              <th scope="col">時間</th>
              <th scope="col">門市</th>
              <th scope="col">POS機號</th>
              <th scope="col">操作員</th>
              <th scope="col">收款總金額</th>
              <th scope="col">結帳明細</th>
              <th scope="col">操作</th>
            </tr>
          </thead>
          <tbody>
            {tableData.length > 0 ? (
              tableData.map((item, index) => (
                <tr key={index}>
                  <td className="text-center">
                    {new Date(
                      item.startDate.replace(" ", "T")
                    ).toLocaleDateString("zh-TW", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                    })}
                  </td>
                  <td className="text-center">
                    {new Date(
                      item.startDate.replace(" ", "T")
                    ).toLocaleTimeString("zh-TW", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: false,
                    })}
                  </td>
                  <td>{item.store}</td>
                  <td>A01</td>
                  <td>{item.name}</td>
                  <td>{item.totalAmount}</td>
                  <td>
                    <button className="check-button">列印</button>
                  </td>
                  <td>
                    <button className="edit-button mx-2">移出</button>
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
