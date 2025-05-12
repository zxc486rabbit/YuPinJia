import { useState, useEffect } from "react";
import "../components/Search.css"; // 引入 搜尋框 的 CSS 來調整樣式
import SearchField from "../components/SearchField"; // 引入 搜尋框 模組
import { Modal, Button } from "react-bootstrap"; // 使用彈出框套件

export default function OrderSearch() {
  const [orderId, setOrderId] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [pickupMethod, setPickupMethod] = useState("all");
  const [status, setStatus] = useState("all");

  const [tableData, setTableData] = useState([]); // 存放表格資料
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const handleSearch = () => {
    console.log("搜尋條件：", { orderId, pickupTime, pickupMethod, status });
  };

  const handleView = (order) => {
    setSelectedOrder(order);
    setShowModal(true);
    console.log(selectedOrder);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedOrder(null);
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
          label="訂單編號"
          type="text"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
        />
        <SearchField
          label="取貨時間"
          type="date"
          value={pickupTime}
          onChange={(e) => setPickupTime(e.target.value)}
        />
        <SearchField
          label="取貨方式"
          type="select"
          value={pickupMethod}
          onChange={(e) => setPickupMethod(e.target.value)}
          options={[
            { value: "all", label: "全部" },
            { value: "store", label: "門市取貨" },
            { value: "delivery", label: "宅配" },
          ]}
        />
        <SearchField
          label="狀態"
          type="select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[
            { value: "all", label: "全部" },
            { value: "pending", label: "待處理" },
            { value: "completed", label: "已完成" },
            { value: "cancelled", label: "已取消" },
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
          maxHeight: "76vh", // 根據你想要的高度調整
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
              <th scope="col">
                {" "}
                <input type="checkbox" className="w-5 h-5 text-gray-600" />
              </th>
              <th scope="col">訂單編號</th>
              <th scope="col">門市</th>
              <th scope="col">會員</th>
              <th scope="col">商品明細</th>
              <th scope="col">商品總金額</th>
              <th scope="col">商品總數</th>
              <th scope="col">狀態</th>
              <th scope="col">統一編號</th>
              <th scope="col">發票</th>
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
                  <td>{item.store}</td>
                  <td>{item.member}</td>
                  <td>
                    <button
                      className="check-button"
                      onClick={() => handleView(item)}
                    >
                      檢視
                    </button>
                  </td>
                  <td>{item.totalAmount}</td>
                  <td>{item.totalCount}</td>
                  <td>{item.status}</td>
                  <td>{item.taxId}</td>
                  <td>{item.invoice}</td>
                  <td>{item.remarks}</td>
                  <td>
                    <button className="edit-button">修改</button>
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
      <div className="d-flex align-items-center mt-2 ps-3">
        {/* <input type="checkbox" className="w-5 h-5 text-gray-600 me-2" /> */}
        {/* <h5 className="fw-bold mb-0 me-3">全選</h5> */}
        <button className="pink-button me-3">列印清單</button>
        <button className="pink-button">列印明細</button>
      </div>

      <Modal
        show={showModal}
        onHide={closeModal}
        dialogClassName="w-auto-modal"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>商品明細</Modal.Title>
        </Modal.Header>
        <Modal.Body>
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
                <th scope="col">商品名稱</th>
                <th scope="col">數量</th>
                <th scope="col">單價</th>
                <th scope="col">金額</th>
                <th scope="col">折扣後</th>
              </tr>
            </thead>
            <tbody>
              {selectedOrder ? (
                <tr>
                  <td>{selectedOrder.product}</td>
                  <td>{selectedOrder.totalCount}</td>
                  <td>{selectedOrder.totalAmount}</td>
                  <td>
                    {(() => {
                      const count = Number(selectedOrder.totalCount);
                      const amount = Number(
                        selectedOrder.totalAmount.replace(/,/g, "")
                      );
                      const total = count * amount;
                      return total.toLocaleString(); // 千分位格式
                    })()}
                  </td>
                  <td>
                    {(() => {
                      const count = Number(selectedOrder.totalCount);
                      const amount = Number(
                        selectedOrder.totalAmount.replace(/,/g, "")
                      );
                      const discounted = Math.round(count * amount * 0.9); // 四捨五入
    return discounted.toLocaleString();
                    })()}
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan="12">無資料</td>
                </tr>
              )}
            </tbody>
          </table>
          {selectedOrder &&
            (() => {
              const count = Number(selectedOrder.totalCount);
              const amount = Number(
                selectedOrder.totalAmount.replace(/,/g, "")
              );
              const total = count * amount;
              const discounted1 = Math.round(total * 0.1);
              const discounted = Math.round(total * 0.9);

              return (
                <div
                  className="mt-3 p-3 d-flex justify-content-end bg-light border rounded text-end"
                  style={{ fontSize: "1.2rem" }}
                >
                  <div>
                    共計商品：<strong>1</strong> 項
                  </div>
                  <div className="mx-4">
                    總金額：<strong>{total.toLocaleString()}</strong> 元
                  </div>
                  <div className="me-4">
                    折扣：<strong>{discounted1.toLocaleString()}</strong> 元
                  </div>
                  <div>
                    總計：<strong>{discounted.toLocaleString()}</strong> 元
                  </div>
                </div>
              );
            })()}
        </Modal.Body>
        <Modal.Footer>
          <Button className="modalButton" variant="secondary" onClick={closeModal}>
            關閉
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
