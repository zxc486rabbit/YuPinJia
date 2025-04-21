import { useState, useEffect } from "react";
import { FaSearch } from "react-icons/fa";
import SearchField from "../components/SearchField"; // 引入 搜尋框 模組

export default function Adjust() {
  const [orderId, setOrderId] = useState("");
  const [tableData, setTableData] = useState([]); // 存放表格資料
  const [value, setValue] = useState(""); //紀錄右邊表格填入的值(數量)

  const handleSearch = () => {
    console.log("搜尋條件：", { orderId });
  };

  useEffect(() => {
    fetch("/SalesTable.json") // 從 public 目錄讀取 JSON
      .then((response) => response.json())
      .then((data) => setTableData(data))
      .catch((error) => console.error("載入失敗:", error));
  }, []);

  return (
    <>
      <div className="container-fluid">
        <div className="row">
          {/* 購物車部分 */}
          <div
            className="col-4 d-flex flex-column"
            style={{ background: "#fff", height: "89vh" }}
          >
            {/* 讓以上內容填滿容器 */}
            <div className="flex-grow-1">
              <div className="d-flex justify-content-between align-items-center my-3 mx-4">
                <h4 className="fw-bold m-0">調貨明細</h4>
                <div>
                  <button
                    className="add-button"
                    style={{ background: "#D68E08" }}
                  >
                    調貨紀錄
                  </button>
                </div>
              </div>
              <table className="table mb-2" style={{ fontSize: "1.2rem" }}>
                <thead
                  className="table-light"
                  style={{ borderTop: "1px solid #c5c6c7" }}
                >
                  <tr>
                    <th scope="col" className="text-center">
                      商品名稱
                    </th>
                    <th scope="col" className="text-center">
                      進貨日期
                    </th>
                    <th scope="col" className="text-center">
                      數量
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="text-center">御品家大禮包</td>
                    <td className="text-center">2025-04-02</td>
                    <td className="text-center">5</td>
                  </tr>
                  <tr>
                    <td className="text-center">花生酥不起(小)</td>
                    <td className="text-center">2025-04-02</td>
                    <td className="text-center">10</td>
                  </tr>
                </tbody>
              </table>
              <button className="clear-button d-flex justify-content-center ms-auto me-2">
                清空
              </button>
            </div>
            <div
              className="d-flex justify-content-around align-items-center py-3"
              style={{
                fontSize: "1.3rem",
                fontWeight: "bold",
                lineHeight: "1.8",
                borderTop: "2px solid #E2E2E2",
              }}
            >
              <span>商品總數 : 15 件</span>
              <button className="cargo-button">調貨</button>
            </div>
          </div>
          {/* 右邊部分 */}
          <div className="col-8">
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

            {/* 左邊 */}
            <div style={{ height: "78vh", overflow: "auto" }}>
              {/* 表格 */}
              <table
                className="table mx-auto text-center"
                style={{
                  fontSize: "1.3rem",
                  border: "1px solid #D7D7D7",
                  width: "90%",
                }}
              >
                <thead
                  className="table-info"
                  style={{
                    borderTop: "1px solid #c5c6c7",
                    position: "sticky",
                    top: 0,
                    background: "#d1ecf1",
                    zIndex: 1,
                  }}
                >
                  <tr>
                    <th scope="col">商品名稱</th>
                    <th scope="col">數量</th>
                    <th scope="col">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.length > 0 ? (
                    tableData.map((item, index) => (
                      <tr key={index}>
                        <td>{item.product}</td>
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
                            // placeholder="請輸入數量"
                          />
                        </td>
                        <td>
                          <button className="add-button me-2">加入</button>
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
          </div>
        </div>
      </div>
    </>
  );
}
