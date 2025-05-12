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
      <div className="search-container d-flex gap-3 px-5 pt-4 pb-3 ">
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
        <div className="search-bar ms-auto">
          <FaSearch className="search-icon" />
          <input type="text" placeholder="搜尋..." />
        </div>
        {/* 搜尋按鈕 */}
        <button onClick={handleSearch} className="search-button">
          搜尋
        </button>
      </div>
      {/* 左右邊表格容器 */}
      <div className="d-flex mx-5">
        {/* 左邊表格 */}
        {leftTableData.length > 0 && (
          <div className="col-6" style={{ height: "74vh", overflow: "hidden" }}>
            {/* 表格 */}
            <table
              className="table my-2 mx-auto text-center"
              style={{
                fontSize: "1.3rem",
                border: "1px solid #D7D7D7",
                width: "100%",
              }}
            >
              <thead
                className="table-info"
                style={{ borderTop: "1px solid #c5c6c7" }}
              >
                <tr>
                  <th scope="col">商品編號</th>
                  <th scope="col">商品名稱</th>
                  <th scope="col">庫存數量</th>
                  <th scope="col">盤點數量</th>
                </tr>
              </thead>
              <tbody>
                {tableData.length > 0 ? (
                  // 取出目前頁面中左側表格的資料（每次10筆）
                  tableData
                    .slice(leftTableStart, leftTableStart + 12) // 從目前頁面左表格起始位置，取出 10 筆資料
                    .map((item, index) => (
                      <tr key={index}>
                        <td>{leftTableStart + index + 1}</td>
                        <td>{item.product}</td>
                        <td>{item.stock}</td>
                        <td>
                          <input
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            style={{
                              height: "40px",
                              padding: "0 8px",
                              border: "1px solid #8C8C8C",
                              borderRadius: "4px",
                              textAlign: "center",
                            }}
                          />
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
        )}
        {/* 右邊表格 */}
        {rightTableData.length > 0 && (
          <div className="col-6" style={{ height: "74vh", overflow: "hidden" }}>
            {/* 表格 */}
            <table
              className="table my-2 mx-auto text-center"
              style={{
                fontSize: "1.3rem",
                border: "1px solid #D7D7D7",
                width: "100%",
              }}
            >
              <thead
                className="table-info"
                style={{ borderTop: "1px solid #c5c6c7" }}
              >
                <tr>
                  <th scope="col">商品編號</th>
                  <th scope="col">商品名稱</th>
                  <th scope="col">庫存數量</th>
                  <th scope="col">盤點數量</th>
                </tr>
              </thead>
              <tbody>
                {tableData.length > 0 ? (
                  tableData
                    .slice(rightTableStart, rightTableStart + 12)
                    .map((item, index) => (
                      <tr key={index}>
                        <td>{rightTableStart + index + 1}</td>
                        <td>{item.product}</td>
                        <td>{item.stock}</td>
                        <td>
                          <input
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            style={{
                              height: "40px",
                              padding: "0 8px",
                              border: "1px solid #8C8C8C",
                              borderRadius: "4px",
                              textAlign: "center",
                            }}
                          />
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
        )}
      </div>
      {/* 換頁 */}
      <div className="pagination-controls text-center mt-3">
        <button
          onClick={handlePrevPage}
          disabled={currentPage === 1}
          className="btn btn-secondary mx-2 mb-2"
          style={{fontSize:"1.3rem"}}
        >
          上一頁
        </button>
        <span style={{fontSize:"1.3rem"}}>
          第 {currentPage} 頁 / 共 {totalPages} 頁
        </span>
        <button
          onClick={handleNextPage}
          disabled={currentPage === totalPages}
          className="btn btn-secondary mx-2 mb-2"
          style={{fontSize:"1.3rem"}}
        >
          下一頁
        </button>
      </div>
<div className="d-flex gap-3 me-5" style={{position:"absolute", bottom:"10px", right:"0"}}>
      <button className="cargo-button" style={{background:"#ED7171"}}>一鍵清空</button>
      <button className="cargo-button" style={{background:"#445A61"}}>暫存</button>
      <button className="cargo-button" style={{background:"#337DD1"}}>送出</button>
</div>
    </>
  );
}
