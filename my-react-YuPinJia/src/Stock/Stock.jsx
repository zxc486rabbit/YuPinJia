import { useState, useEffect } from "react";
import "../components/Search.css"; // 引入搜尋框的 CSS
import SearchField from "../components/SearchField"; // 搜尋框模組
import { FaSearch } from "react-icons/fa";

export default function Stock() {
  const [category, setCategory] = useState(""); // 分類篩選
  const [keyword, setKeyword] = useState(""); // 商品名稱搜尋
  const [tableData, setTableData] = useState([]); // API 原始資料

  // 從 API 取得資料
  useEffect(() => {
    fetch("https://yupinjia.hyjr.com.tw/api/api/t_Stock")
      .then((response) => response.json())
      .then((data) => setTableData(data))
      .catch((error) => console.error("載入失敗:", error));
  }, []);

  // 預警產品
  const noSafeData = tableData.filter((v) => v.quantity < v.safetyStock);

  // 篩選後的資料
  const filteredData = tableData.filter((item) => {
    const matchCategory = category ? String(item.locationType) === String(category) : true;
    const matchKeyword = keyword ? item.productName.includes(keyword) : true;
    return matchCategory && matchKeyword;
  });

  return (
    <div className="container-fluid">
      <div className="row">
        {/* 搜尋區 */}
        <div className="search-container d-flex flex-wrap gap-3 px-5 pt-4 pb-3 rounded">
          {/* 分類下拉 */}
          <SearchField
            type="select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={[
              { value: "", label: "全部分類" },
              { value: "0", label: "澎湖特色土產海產類" },
              { value: "1", label: "自製糕餅類" },
              { value: "2", label: "澎湖冷凍海鮮產品類" },
              { value: "3", label: "澎湖海產(乾貨)類" },
            ]}
          />

          {/* 關鍵字搜尋 */}
          <div className="search-bar">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="搜尋商品名稱..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
        </div>

        {/* 左邊 - 全部庫存 */}
        <div className="col-7">
          <div
            style={{
              height: "75vh",
              overflowY: "auto",
              width: "90%",
              margin: "0 auto",
              border: "1px solid #D7D7D7",
            }}
            className="no-scrollbar"
          >
            <table
              className="table text-center mb-0"
              style={{
                fontSize: "1.2rem",
                width: "100%",
                tableLayout: "fixed", // 固定欄寬
                borderCollapse: "collapse",
              }}
            >
              <thead
                className="table-info"
                style={{
                  position: "sticky",
                  top: 0,
                  background: "#d1ecf1",
                  zIndex: 1,
                }}
              >
                <tr>
                  <th style={{ width: "400px" }}>商品名稱</th>
                  <th>總庫存</th>
                  <th>門市庫存</th>
                  <th>未包裝</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length > 0 ? (
                  filteredData.map((item, index) => (
                    <tr key={index}>
                      <td
                        title={item.productName}
                        style={{
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {item.productName}
                      </td>
                      <td>{item.quantity}</td>
                      <td
                        style={{
                          color:
                            item.quantity < item.safetyStock
                              ? "red"
                              : "inherit",
                        }}
                      >
                        {item.quantity}
                      </td>
                      <td>3</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4">無資料</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 右邊 - 預警產品 */}
        <div className="col-5">
          <div style={{ height: "79vh", overflow: "auto" }}>
            <h5 className="no-safe-text mt-1 mb-0 py-2">預警產品</h5>
            <table
              className="table text-center"
              style={{ fontSize: "1.3rem", width: "90%" }}
            >
              <thead
                className="table-light"
                style={{ borderTop: "1px solid #c5c6c7" }}
              >
                <tr>
                  <th scope="col">商品名稱</th>
                  <th scope="col">門市庫存</th>
                  <th scope="col">預警數量</th>
                </tr>
              </thead>
              <tbody>
                {noSafeData.length > 0 ? (
                  noSafeData.map((item, index) => (
                    <tr key={index}>
                      <td>{item.productName}</td>
                      <td style={{ color: "red" }}>{item.quantity}</td>
                      <td>{item.safetyStock}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3">無資料</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}