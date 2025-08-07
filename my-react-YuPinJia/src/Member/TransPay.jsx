import { useState, useEffect } from "react";
import axios from "axios";
import { Modal, Button, Form } from "react-bootstrap";
import { BiUpload } from "react-icons/bi";
import "../components/Search.css";
import "../components/Modal.css";
import SearchField from "../components/SearchField";

export default function TransPay() {
  const [orderId, setOrderId] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [tableData, setTableData] = useState([]); // 用來存放從 API 獲取的資料
  const [showModal, setShowModal] = useState(false); // 控制 Modal 彈窗開關

  // 表單欄位的狀態
  const [payerName, setPayerName] = useState("");
  const [repaymentDate, setRepaymentDate] = useState("");
  const [repaymentMethod, setRepaymentMethod] = useState("");
  const [repaymentAmount, setRepaymentAmount] = useState(0);
  const [settledAmount, setSettledAmount] = useState(0);
  const [remainingBalance, setRemainingBalance] = useState(0);
  const [repaymentAccount, setRepaymentAccount] = useState("");
  const [repaymentImage, setRepaymentImage] = useState(null); // 用來存儲上傳的圖片
  const [remark, setRemark] = useState("");

  // 表單提交並傳送到 API
  const handleSubmit = async () => {
    const data = {
      id: 0, // 可以讓 API 自動生成 ID
      memberId: 0, // 根據需要設置會員 ID
      createdAt: new Date().toISOString(),
      repaymentMethod: repaymentMethod === "銀行轉帳" ? 0 : 1, // 假設銀行轉帳是 0，ATM 是 1
      repaymentAmount,
      settledAmount,
      remainingBalance,
      bankCode: "", // 若需要填寫銀行代碼，請提供
      repaymentAccount,
      payerName,
      repaymentDate,
      repaymentImage, // 這裡是上傳的圖片
      remark,
    };

    try {
      await axios.post(
        "https://yupinjia.hyjr.com.tw/api/api/t_RepaymentRecord",
        data
      );
      alert("還款紀錄已成功提交!");
      setShowModal(false); // 關閉彈出框
    } catch (error) {
      console.error("提交失敗:", error);
      alert("提交失敗，請再試一次!");
    }
  };

  const handleSearch = () => {
    console.log("搜尋條件：", { orderId, pickupTime });
  };

  useEffect(() => {
    axios
      .get("https://yupinjia.hyjr.com.tw/api/api/t_RepaymentRecord")
      .then((response) => {
        setTableData(response.data); // 將 API 返回的資料設置到表格資料中
      })
      .catch((error) => {
        console.error("載入失敗:", error);
      });
  }, []);

  return (
    <>
      <div className="search-container d-flex flex-wrap gap-3 px-4 py-3 rounded">
        <button className="add-button" onClick={() => setShowModal(true)}>
          添加還款紀錄
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
        <button onClick={handleSearch} className="search-button">
          搜尋
        </button>
      </div>

      {/* 表格 */}
      <div
        className="table-container"
        style={{
          maxHeight: "80vh", // 根據你想要的高度調整
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
              <th scope="col">會員</th>
              <th scope="col">建立日期</th>
              <th scope="col">付款方式</th>
              <th scope="col">還款金額</th>
              <th scope="col">結清金額</th>
              <th scope="col">餘額</th>
              <th scope="col">匯款後5碼</th>
              <th scope="col">操作</th>
            </tr>
          </thead>
          <tbody>
            {tableData.length > 0 ? (
              tableData.map((item, index) => (
                <tr key={index}>
                  <td>{item.memberName}</td>
                  <td>{item.repaymentDate}</td>
                  <td>{item.repaymentMethod}</td>
                  <td>{item.repaymentAmount}</td>
                  <td>{item.settledAmount}</td>
                  <td>{item.remainingBalance}</td>
                  <td>{item.repaymentAccount.slice(-5)}</td> {/* 取匯款帳號後五碼 */}
                  <td>
                    <button className="check-button">圖片</button>
                    {/* <button className="edit-button mx-2">提醒</button> */}
                    <button className="delete-button">刪除</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8">無資料</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
  <Modal.Header closeButton>
    <Modal.Title className="fw-bold text-dark">添加還款紀錄</Modal.Title>
  </Modal.Header>
  <Modal.Body>
    <Form>
      <div className="form-group mb-3">
        <Form.Label>姓名：</Form.Label>
        <Form.Control
          type="text"
          value={payerName}
          onChange={(e) => setPayerName(e.target.value)}
          placeholder="請輸入姓名"
        />
      </div>

      <div className="form-group mb-3">
        <Form.Label>匯款日期：</Form.Label>
        <Form.Control
          type="date"
          value={repaymentDate}
          onChange={(e) => setRepaymentDate(e.target.value)}
        />
      </div>

      <div className="form-group mb-3">
        <Form.Label>匯款類型：</Form.Label>
        <Form.Select
          value={repaymentMethod}
          onChange={(e) => setRepaymentMethod(e.target.value)}
        >
          <option value="">請選擇</option>
          <option value="銀行轉帳">銀行轉帳</option>
          <option value="ATM">ATM</option>
        </Form.Select>
      </div>

      <div className="form-group mb-3">
        <Form.Label>匯款金額：</Form.Label>
        <Form.Control
          type="number"
          value={repaymentAmount}
          onChange={(e) => setRepaymentAmount(e.target.value)}
          placeholder="請輸入匯款金額"
        />
      </div>

      <div className="form-group mb-3">
        <Form.Label>結清金額：</Form.Label>
        <Form.Control
          type="number"
          value={settledAmount}
          onChange={(e) => setSettledAmount(e.target.value)}
          placeholder="請輸入結清金額"
        />
      </div>

      <div className="form-group mb-3">
        <Form.Label>餘額：</Form.Label>
        <Form.Control
          type="number"
          value={remainingBalance}
          onChange={(e) => setRemainingBalance(e.target.value)}
          placeholder="請輸入剩餘餘額"
        />
      </div>

      <div className="form-group mb-3">
        <Form.Label>匯款帳號：</Form.Label>
        <Form.Control
          type="text"
          value={repaymentAccount}
          onChange={(e) => setRepaymentAccount(e.target.value)}
          placeholder="請輸入匯款帳號"
        />
      </div>

      <div className="form-group mb-3">
        <Form.Label>備註：</Form.Label>
        <Form.Control
          type="text"
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          placeholder="備註 (可選)"
        />
      </div>

      <div className="form-group mb-3 d-flex align-items-center">
        <Form.Label className="me-2">上傳匯款紀錄：</Form.Label>
        <div className="d-flex align-items-center gap-2">
          <label
            htmlFor="upload-file"
            className="btn custom-upload-btn d-flex align-items-center gap-2 mb-0"
          >
            <BiUpload size={18} />
            上傳文件
          </label>
          <input
            type="file"
            id="upload-file"
            className="d-none"
            onChange={(e) => setRepaymentImage(e.target.files[0])}
          />
        </div>
      </div>
    </Form>
  </Modal.Body>
  <Modal.Footer>
    <Button className="check-button" onClick={handleSubmit}>
      確認
    </Button>
    <Button
      className="cancel-button"
      onClick={() => setShowModal(false)}
    >
      取消
    </Button>
  </Modal.Footer>
</Modal>
    </>
  );
}