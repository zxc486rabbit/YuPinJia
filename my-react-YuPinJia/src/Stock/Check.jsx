import { useState, useEffect } from "react";
import { FaSearch } from "react-icons/fa";
import SearchField from "../components/SearchField"; // 引入 搜尋框 模組

export default function Check() {
  const [orderId, setOrderId] = useState("");
  const [tableData, setTableData] = useState([]); // 存放表格資料
  const [value, setValue] = useState(""); //紀錄表格填入的值(數量)
  const [currentPage, setCurrentPage] = useState(1); // ✅ 分頁狀態

  const itemsPerPage = 24; // 每頁顯示的項目數量（左右表格各10筆）
  const leftTableStart = (currentPage - 1) * itemsPerPage; // 左側表格的起始索引（依據目前頁數計算）
  const rightTableStart = leftTableStart + 12; // 右側表格的起始索引（左表格後再往後10筆）

  const leftTableData = tableData.slice(leftTableStart, leftTableStart + 12); //leftTableData是為了讓左邊表格沒資料就不顯示表頭thead
  const rightTableData = tableData.slice(rightTableStart, rightTableStart + 12); //rightTableData是為了讓右邊表格沒資料就不顯示表頭thead

  const handleSearch = () => {
    console.log("搜尋條件：", { orderId });
  };

  useEffect(() => {
    fetch("/SalesTable.json") // 從 public 目錄讀取 JSON
      .then((response) => response.json())
      .then((data) => setTableData(data))
      .catch((error) => console.error("載入失敗:", error));
  }, []);

  const totalPages = Math.ceil(tableData.length / itemsPerPage); // 總頁數（依據資料總數及每頁筆數計算）

  // 處理上一頁按鈕的事件
  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1)); // 頁數減1，最小為1（不能小於第1頁）
  };

  // 處理下一頁按鈕的事件
  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages)); // 頁數加1，最大不超過 totalPages（避免超出頁數範圍）
  };

  return (
    <>
      <div className="search-container d-flex gap-3 px-5 py-3 ">
        <SearchField
          type="select"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          options={[
            { value: "none", label: "請選擇商品種類" },
            { value: "all", label: "澎湖特色土產海產類" },
            { value: "store", label: "自製糕餅類" },
            { value: "delivery", label: "澎湖冷凍海鮮產品類" },
            { value: "5", label: "澎湖海產(乾貨)類" },
          ]}
        />
        <div className="search-bar">
          <FaSearch className="search-icon" />
          <input type="text" placeholder="搜尋..." />
        </div>
        {/* 搜尋按鈕 */}
        <button onClick={handleSearch} className="search-button">
          搜尋
        </button>

        <button className="ms-auto edit-button" style={{fontSize:"1.2rem" , fontWeight:"bold"}}>盤點紀錄</button>
      </div>
      {/* 表格區域 */}
      <div className="d-flex  px-4">
        {/* 左表格 */}
        {leftTableData.length > 0 && (
          <div style={{ flex: 1, height: "66vh", overflow: "hidden" }}>
            <table className="table text-center" style={{ fontSize: "1.1rem", border: "1px solid #D7D7D7" }}>
              <thead className="table-info">
                <tr>
                  <th>商品編號</th>
                  <th>商品名稱</th>
                  <th>庫存數量</th>
                  <th>盤點數量</th>
                </tr>
              </thead>
              <tbody>
                {leftTableData.map((item, index) => (
                  <tr key={index}>
                    <td>{leftTableStart + index + 1}</td>
                    <td>{item.product}</td>
                    <td>{item.stock}</td>
                    <td>
                      <input
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        style={{
                          height: "5vh",
                          padding: "0 8px",
                          border: "1px solid #8C8C8C",
                          borderRadius: "4px",
                          textAlign: "center",
                          width: "100%",
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 右表格 */}
        {rightTableData.length > 0 && (
          <div style={{ flex: 1, height: "66vh", overflow: "hidden" }}>
            <table className="table text-center" style={{ fontSize: "1.1rem", border: "1px solid #D7D7D7" }}>
              <thead className="table-info">
                <tr>
                  <th>商品編號</th>
                  <th>商品名稱</th>
                  <th>庫存數量</th>
                  <th>盤點數量</th>
                </tr>
              </thead>
              <tbody>
                {rightTableData.map((item, index) => (
                  <tr key={index}>
                    <td>{rightTableStart + index + 1}</td>
                    <td>{item.product}</td>
                    <td>{item.stock}</td>
                    <td>
                      <input
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        style={{
                          height: "5vh",
                          padding: "0 8px",
                          border: "1px solid #8C8C8C",
                          borderRadius: "4px",
                          textAlign: "center",
                          width: "100%",
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* 換頁 */}
      <div className="pagination-controls text-center mt-4">
        <button
          onClick={handlePrevPage}
          disabled={currentPage === 1}
          className="btn btn-secondary mx-2 mb-2"
          style={{ fontSize: "1.3rem" }}
        >
          上一頁
        </button>
        <span style={{ fontSize: "1.3rem" }}>
          第 {currentPage} 頁 / 共 {totalPages} 頁
        </span>
        <button
          onClick={handleNextPage}
          disabled={currentPage === totalPages}
          className="btn btn-secondary mx-2 mb-2"
          style={{ fontSize: "1.3rem" }}
        >
          下一頁
        </button>
      </div>
      <div
        className="d-flex gap-2 me-5"
        style={{ position: "absolute", bottom: "35px", right: "0" }}
      >
        <button className="cargo-button" style={{ background: "#ED7171" }}>
          一鍵清空
        </button>
        <button className="cargo-button" style={{ background: "#445A61" }}>
          暫存
        </button>
        <button className="cargo-button" style={{ background: "#337DD1" }}>
          送出
        </button>
      </div>
    </>
  );
}
