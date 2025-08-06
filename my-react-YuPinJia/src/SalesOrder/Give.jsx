import { useState, useEffect } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import axios from "axios";
import "../components/Search.css";
import SearchField from "../components/SearchField";

export default function Give() {
  const [product, setProduct] = useState("");
  const [recipient, setRecipient] = useState("");
  const [operator, setOperator] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [tableData, setTableData] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);

  // 頁面進來先載全部資料
  useEffect(() => {
    fetchGiftRecords();
  }, []);

  // 呼叫 API 取得資料
  const fetchGiftRecords = async (params = {}) => {
    try {
      const query = new URLSearchParams(params).toString();
      const url = `https://yupinjia.hyjr.com.tw/api/api/t_SalesOrderItem/GetGiftRecord${
        query ? `?${query}` : ""
      }`;

      const res = await axios.get(url);
      console.log("贈送紀錄 API 回傳：", res.data);
      setTableData(res.data || []);
    } catch (err) {
      console.error("載入失敗:", err);
    }
  };

  // 搜尋
  const handleSearch = () => {
    const params = {};
    if (product) params.productName = product;
    if (recipient) params.fullName = recipient;
    if (operator) params.operatorName = operator;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    fetchGiftRecords(params);
  };

  const handleEditClick = (item) => {
    setEditItem(item);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditItem(null);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("zh-TW");
  };

  return (
    <>
      {/* 搜尋區 */}
      <div className="search-container d-flex flex-wrap gap-3 px-4 py-3 rounded">
        <SearchField
          label="商品"
          type="text"
          value={product}
          onChange={(e) => setProduct(e.target.value)}
        />
        <SearchField
          label="受贈人"
          type="text"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
        />
        <SearchField
          label="操作人"
          type="text"
          value={operator}
          onChange={(e) => setOperator(e.target.value)}
        />
        <SearchField
          label="起"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <SearchField
          label="迄"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />

        <button onClick={handleSearch} className="search-button">
          搜尋
        </button>
      </div>

      {/* 表格 */}
      <div
        className="table-container"
        style={{
          maxHeight: "82vh",
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
              <th>訂單編號</th>
              <th>日期</th>
              <th>商品名稱</th>
              <th>單價</th>
              <th>數量</th>
              <th>合計</th>
              <th>受贈人</th>
              <th>操作人</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {tableData.length > 0 ? (
              tableData.map((item) => (
                <tr key={item.id}>
                  <td>{item.salesOrderId}</td>
                  <td>{formatDate(item.createdAt)}</td>
                  <td>{item.productName}</td>
                  <td>{item.unitPrice}</td>
                  <td>{item.quantity}</td>
                  <td>{item.subtotal}</td>
                  <td>{item.fullName}</td>
                  <td>{item.operatorName}</td>
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
                <td colSpan="9">無資料</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 編輯彈出框 */}
      <Modal show={showModal} onHide={handleModalClose} centered>
        <Modal.Header
          closeButton
          className="give-modal-header"
          style={{ backgroundColor: "#3D7EA6", color: "white" }}
        >
          <Modal.Title>贈送紀錄</Modal.Title>
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
              <div>商品：{editItem.productName}</div>
              <div>日期：{formatDate(editItem.createdAt)}</div>
              <div>
                數量：
                <Form.Control
                  type="number"
                  defaultValue={editItem.quantity}
                  className="my-1"
                />
              </div>
              <div>
                銷售價格：
                <Form.Control
                  type="number"
                  defaultValue={editItem.unitPrice}
                  className="my-1"
                />
              </div>
              <div>合計：{editItem.subtotal}</div>
              <div>受贈人：{editItem.fullName}</div>
              <div>操作人：{editItem.operatorName}</div>
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