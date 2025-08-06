import { useState, useEffect } from "react";
import "../components/Search.css"; // 引入搜尋框的 CSS 來調整樣式
import SearchField from "../components/SearchField"; // 引入搜尋框模組
import { FaSearch } from "react-icons/fa";

export default function Stock() {
  const [orderId, setOrderId] = useState("");
  const [tableData, setTableData] = useState([]); // 存放表格資料

  // 從 API 取得資料
  useEffect(() => {
    fetch("https://yupinjia.hyjr.com.tw/api/api/t_Stock")
      .then((response) => response.json())
      .then((data) => setTableData(data))
      .catch((error) => console.error("載入失敗:", error));
  }, []);

  // noSafeData 是預警產品
  const noSafeData = tableData.filter((v) => {
    return v.quantity < v.product.safetyStock;
  });

  const handleSearch = () => {
    console.log("搜尋條件：", { orderId });
  };

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
            <div className="search-bar">
              <FaSearch className="search-icon" />
              <input type="text" placeholder="搜尋..." />
            </div>
            <button onClick={handleSearch} className="search-button">
              搜尋
            </button>
          </div>

          {/* 左邊 */}
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
                  {tableData.length > 0 ? (
                    tableData.map((item, index) => (
                      <tr key={index}>
                        <td
                          title={item.product.name}
                          style={{
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {item.product.name}
                        </td>
                        <td>{item.quantity}</td>
                        <td
                          style={{
                            color:
                              item.quantity < item.product.safetyStock
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

          {/* 右邊 */}
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
                        <td>{item.product.name}</td>
                        <td style={{ color: "red" }}>{item.quantity}</td>
                        <td>{item.product.safetyStock}</td>
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