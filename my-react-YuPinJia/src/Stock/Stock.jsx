import { useState, useEffect } from "react";
import "../components/Search.css"; // 引入 搜尋框 的 CSS 來調整樣式
import SearchField from "../components/SearchField"; // 引入 搜尋框 模組
import { FaSearch } from "react-icons/fa";

export default function Stock() {
  const [orderId, setOrderId] = useState("");
  const [tableData, setTableData] = useState([]); // 存放表格資料

  const handleSearch = () => {
    console.log("搜尋條件：", { orderId });
  };

  useEffect(() => {
    fetch("/SalesTable.json") // 從 public 目錄讀取 JSON
      .then((response) => response.json())
      .then((data) => setTableData(data))
      .catch((error) => console.error("載入失敗:", error));
  }, []);

  // noSafeData是預警產品
  const noSafeData = tableData.filter((v) => {
    return v.storeStock < v.safe;
  });

  return (
    <>
      <div className="container-fluid">
        <div className="row">
          <div className="search-container d-flex flex-wrap gap-3 px-5 pt-4 pb-3 rounded">
            <SearchField
              type="select"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              options={[
                { value: "none", label: "請選擇商品" },
                { value: "all", label: "澎湖特色土產海產類" },
                { value: "store", label: "自製糕餅類" },
                { value: "delivery", label: "澎湖冷凍海鮮產品類" },
                { value: "5", label: "澎湖海產(乾貨)類" },
              ]}
            />
            {/* <SearchField
              type="select"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              options={[
                { value: "none", label: "請選擇包裝" },
                { value: "all", label: "三大順有限公司" },
                { value: "store", label: "志貴企業有限公司" },
                { value: "delivery", label: "岱洋股份有限公司" },
                { value: "5", label: "原祥塑膠工業有限公司" },
              ]}
            />
            <SearchField
              type="select"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              options={[
                { value: "none", label: "請選擇外包裝" },
                { value: "all", label: "真納視覺文化股份有限公司" },
                { value: "store", label: "合泰紙器商行" },
              ]}
            />
            <SearchField
              type="select"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              options={[
                { value: "none", label: "請選擇原料" },
                { value: "all", label: "小罐廠商" },
                { value: "store", label: "拓南化學原料有限公司" },
                { value: "delivery", label: "大通商行" },
                { value: "5", label: "海菜批發" },
              ]}
            />
            <SearchField
              type="select"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              options={[
                { value: "none", label: "其他" },
                { value: "all", label: "早安" },
                { value: "store", label: "午安" },
                { value: "delivery", label: "晚安" },
              ]}
            /> */}

            <div className="search-bar">
              <FaSearch className="search-icon" />
              <input type="text" placeholder="搜尋..." />
            </div>
            {/* 搜尋按鈕 */}
            <button onClick={handleSearch} className="search-button">
              搜尋
            </button>
          </div>

          {/* 左邊 */}
          <div className="col-7">
            {/* 表格 */}
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
                  {tableData.length > 0 ? (
                    tableData.map((item, index) => (
                      <tr key={index}>
                        <td
                          title={item.product}
                          style={{
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {item.product}
                        </td>
                        <td>{item.stock}</td>
                        <td
                          style={{
                            color:
                              item.storeStock < item.safe ? "red" : "inherit",
                          }}
                        >
                          {item.storeStock}
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
          {/* 右邊 */}
          <div className="col-5">
            <div style={{ height: "79vh", overflow: "auto" }}>
              {/* 表格 */}
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
                        <td>{item.product}</td>
                        <td style={{color: "red"}} >{item.storeStock}</td>
                        <td>{item.safe}</td>
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
          </div>
        </div>
      </div>
    </>
  );
}
