import { useState, useEffect } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import { BiUpload } from "react-icons/bi"; // ✅ 引入上傳 icon
import "../components/Search.css"; // 引入 搜尋框 的 CSS 來調整樣式
import "../components/Modal.css"; // 引入 彈出框 的 CSS 來調整樣式
import SearchField from "../components/SearchField"; // 引入 搜尋框 模組

export default function TransPay() {
  const [orderId, setOrderId] = useState("");
  const [pickupTime, setPickupTime] = useState("");

  const [tableData, setTableData] = useState([]); // 存放表格資料
  const [showModal, setShowModal] = useState(false); // 控制 Modal 彈窗開關

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
        <button className="add-button" onClick={() => setShowModal(true)}>
          添加匯款
        </button>
        <SearchField
          label="會員姓名"
          type="text"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
        />
        <SearchField
          label="電話"
          type="number"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
        />
        <SearchField
          label="建立時間"
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
              <th scope="col">姓名</th>
              <th scope="col">建立日期</th>
              <th scope="col">匯款日期</th>
              <th scope="col">應收金額</th>
              <th scope="col">匯款金額</th>
              <th scope="col">匯款後5碼</th>
              <th scope="col">操作人</th>
              <th scope="col">操作</th>
            </tr>
          </thead>
          <tbody>
            {tableData.length > 0 ? (
              tableData.map((item, index) => (
                <tr key={index}>
                  <td>{item.member}</td>
                  <td>{item.startDate}</td>
                  <td>{item.endDate}</td>
                  <td>1,234</td>
                  <td>1,234</td>
                  <td>84258</td>
                  <td>{item.name}</td>
                  <td>
                    <button className="check-button">圖片</button>
                    <button className="edit-button mx-2">提醒</button>
                    <button className="delete-button">刪除</button>
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

      {/* 匯款彈出框 */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold text-dark">添加匯款紀錄</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>姓名：</Form.Label>
              <Form.Select>
                <option value="">請選擇</option>
                <option>會員 A</option>
                <option>會員 B</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>匯款日期：</Form.Label>
              <Form.Control type="date" />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>匯款類型：</Form.Label>
              <Form.Select>
                <option value="">請選擇</option>
                <option>銀行轉帳</option>
                <option>ATM</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>匯款金額：</Form.Label>
              <Form.Control type="number" />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>匯款後5碼：</Form.Label>
              <Form.Control type="text" maxLength={5} />
            </Form.Group>

            <Form.Group className="mb-3 d-flex align-items-center">
              <Form.Label>上傳匯款紀錄：</Form.Label>
              <div className="d-flex align-items-center gap-2">
                <label
                  htmlFor="upload-file"
                  className="btn custom-upload-btn d-flex align-items-center gap-2 mb-0"
                >
                  <BiUpload size={18} />
                  上傳文件
                </label>
                <input type="file" id="upload-file" className="d-none" />
              </div>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button className="check-button">確認</Button>
          <Button className="cancel-button" onClick={() => setShowModal(false)}>
            取消
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
