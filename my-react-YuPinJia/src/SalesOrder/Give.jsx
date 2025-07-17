import { useState, useEffect } from "react";
import { Modal, Button, Form } from "react-bootstrap"; // 加入 bootstrap 元件
import "../components/Search.css"; // 引入 搜尋框 的 CSS 來調整樣式
import SearchField from "../components/SearchField"; // 引入 搜尋框 模組

export default function Give() {
  const [orderId, setOrderId] = useState("");
  const [pickupTime, setPickupTime] = useState("");

  const [tableData, setTableData] = useState([]); // 存放表格資料
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null); // 儲存目前編輯的項目

  // 編輯按鈕開啟彈出框
  const handleEditClick = (item) => {
    setEditItem(item);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditItem(null);
  };

  const handleSearch = () => {
    console.log("搜尋條件：", { orderId, pickupTime });
  };

  useEffect(() => {
    fetch("/SalesTable.json") // 從 public 目錄讀取 JSON
      .then((response) => response.json())
      .then((data) => setTableData(data))
      .catch((error) => console.error("載入失敗:", error));
  }, []);

  return (
    <>
      <div className="search-container d-flex flex-wrap gap-3 px-4 py-3 rounded">
        <SearchField
          label="商品"
          type="text"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
        />
        <SearchField
          label="受贈人"
          type="number"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
        />
        <SearchField
          label="操作人"
          type="number"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
        />
        <SearchField
          label="起"
          type="date"
          value={pickupTime}
          onChange={(e) => setPickupTime(e.target.value)}
        />
        <SearchField
          label="迄"
          type="date"
          value={pickupTime}
          onChange={(e) => setPickupTime(e.target.value)}
        />

        {/* 搜尋按鈕 */}
        {/* <button onClick={handleSearch} className="search-button">
          搜尋
        </button> */}
      </div>
      {/* 表格 */}
      <div
        className="table-container"
        style={{
          maxHeight: "82vh", // 根據你想要的高度調整
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
              <th scope="col">商品</th>
              <th scope="col">日期</th>
              <th scope="col">數量</th>
              <th scope="col">銷售價格</th>
              <th scope="col">合計</th>
              <th scope="col">受贈人</th>
              <th scope="col">手機/用戶名</th>
              <th scope="col">操作人</th>
              <th scope="col">操作</th>
            </tr>
          </thead>
          <tbody>
            {tableData.length > 0 ? (
              tableData.map((item, index) => (
                <tr key={index}>
                  <td>{item.product}</td>
                  <td>{item.startDate}</td>
                  <td>2</td>
                  <td>1,234</td>
                  <td>2,468</td>
                  <td>{item.member}</td>
                  <td>0988-588-147</td>
                  <td>{item.name}</td>
                  <td>
                    <button
                      className="edit-button"
                      onClick={() => handleEditClick(item)}
                    >
                      修改
                    </button>
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

      <Modal show={showModal} onHide={handleModalClose} centered>
        <Modal.Header
          closeButton
          className="give-modal-header"
          style={{ backgroundColor: "#3D7EA6", color: "white" }}
        >
          <Modal.Title>贈送紀錄</Modal.Title>
          {/* 強制讓 close button 白色 */}
          <style>
            {`
      .give-modal-header .btn-close {
        filter: invert(1);
      }
    `}
          </style>
        </Modal.Header>
        <Modal.Body>
          {editItem && (
            <div style={{ fontSize: "1.2rem", lineHeight: "2" }}>
              <div>商品：{editItem.product}</div>
              <div>日期：{editItem.startDate}</div>
              <div>
                數量：
                <Form.Control type="number" defaultValue="1" className="my-1" />
              </div>
              <div>
                銷售價格：
                <Form.Control
                  type="number"
                  defaultValue="350"
                  className="my-1"
                />
              </div>
              <div>合計：350</div>
              <div>受贈人：{editItem.member}</div>
              <div>手機/用戶名：0987-987-987</div>
              <div>剩餘額度：$500</div>
              <div>操作人：{editItem.name}</div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button className="check-button">確認</Button>
          <Button className="cancel-button" onClick={handleModalClose}>
            取消
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
