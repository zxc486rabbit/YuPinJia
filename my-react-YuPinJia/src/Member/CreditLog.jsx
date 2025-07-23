import { useState, useEffect } from "react";
import "../components/Search.css";
import SearchField from "../components/SearchField";
import Swal from "sweetalert2";
import { Modal, Button, Form } from "react-bootstrap";

export default function CreditLog() {
  const [orderId, setOrderId] = useState("");
  const [status, setStatus] = useState("all");
  const [pickupTime, setPickupTime] = useState("");
  const [tableData, setTableData] = useState([]);
  const [checkedOrders, setCheckedOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const [settleAmount, setSettleAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("現金");

  // 付款相關額外欄位
  const [bankName, setBankName] = useState("");
  const [accountLast5, setAccountLast5] = useState("");
  const [remitDate, setRemitDate] = useState("");
  const [chequeNumber, setChequeNumber] = useState("");
  const [chequeDate, setChequeDate] = useState("");

  const handleSearch = () => {
    console.log("搜尋條件：", { orderId, status, pickupTime });
  };

  useEffect(() => {
    fetch("/SalesTable.json")
      .then((response) => response.json())
      .then((data) => {
        const updated = data.map((item) => ({
          ...item,
          unpaidAmount: Number(item.totalAmount.replace(/,/g, "")),
          repaymentDate: "",
          paymentMethod: "",
          remindCount: 0,
        }));
        setTableData(updated);
      })
      .catch((error) => console.error("載入失敗:", error));
  }, []);

  const toggleCheck = (order) => {
    setCheckedOrders((prev) =>
      prev.includes(order)
        ? prev.filter((o) => o !== order)
        : [...prev, order]
    );
  };

  const openSettleModal = (order) => {
    setSelectedOrder(order);
    setSettleAmount(order.unpaidAmount);
    setPaymentMethod("現金");
    setBankName("");
    setAccountLast5("");
    setRemitDate("");
    setChequeNumber("");
    setChequeDate("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedOrder(null);
  };

  const handleSettle = () => {
    if (settleAmount <= 0 || settleAmount > selectedOrder.unpaidAmount) {
      Swal.fire("輸入金額不正確", "", "warning");
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    setTableData((prev) =>
      prev.map((item) =>
        item.orderId === selectedOrder.orderId
          ? {
              ...item,
              unpaidAmount: item.unpaidAmount - settleAmount,
              repaymentDate: today,
              paymentMethod,
              bankName,
              accountLast5,
              remitDate,
              chequeNumber,
              chequeDate,
              status:
                item.unpaidAmount - settleAmount === 0 ? "已還款" : "未還款",
            }
          : item
      )
    );

    Swal.fire("結清成功", "", "success");
    closeModal();
  };

  const handleRemind = (order) => {
    setTableData((prev) =>
      prev.map((item) =>
        item.orderId === order.orderId
          ? { ...item, remindCount: (item.remindCount || 0) + 1 }
          : item
      )
    );
    Swal.fire("已發送提醒", "", "success");
  };

  const handlePrint = () => {
    if (checkedOrders.length === 0) {
      Swal.fire("請至少勾選一筆資料", "", "warning");
      return;
    }

    // 生成列印內容
    const printWindow = window.open("", "_blank");
    const content = `
      <html>
        <head>
          <title>列印結清單</title>
          <style>
            body { font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ccc; padding: 6px; text-align: center; }
          </style>
        </head>
        <body>
          <h3>結清單</h3>
          <table>
            <thead>
              <tr>
                <th>會員編號</th>
                <th>會員名稱</th>
                <th>訂單編號</th>
                <th>結清金額</th>
                <th>付款方式</th>
                <th>未結清金額</th>
              </tr>
            </thead>
            <tbody>
              ${checkedOrders
                .map(
                  (item) => `
                <tr>
                  <td>${item.orderId}</td>
                  <td>${item.member}</td>
                  <td>${item.orderId}</td>
                  <td>${item.totalAmount - item.unpaidAmount}</td>
                  <td>${item.paymentMethod}</td>
                  <td>${item.unpaidAmount}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <>
      <div className="search-container d-flex flex-wrap gap-3 px-4 pt-4 pb-3 rounded">
        <SearchField
          label="會員編號"
          type="text"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
        />
        <SearchField
          label="日期"
          type="date"
          value={pickupTime}
          onChange={(e) => setPickupTime(e.target.value)}
        />
        <SearchField
          label="狀態"
          type="select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[
            { value: "all", label: "全部" },
            { value: "未還款", label: "未還款" },
            { value: "已還款", label: "已還款" },
          ]}
        />

        <button onClick={handleSearch} className="search-button">
          搜尋
        </button>
      </div>

      <div
        className="table-container"
        style={{
          maxHeight: "75vh",
          overflowY: "auto",
          overflowX: "auto",
        }}
      >
        <table className="table text-center" style={{ fontSize: "1.1rem" }}>
          <thead
            className="table-light"
            style={{
              position: "sticky",
              top: 0,
              background: "#d1ecf1",
              zIndex: 1,
              borderBlock: "1px solid #c5c6c7",
            }}
          >
            <tr>
              <th>
                <input type="checkbox" disabled />
              </th>
              <th>會員編號</th>
              <th>會員名稱</th>
              <th>聯絡人</th>
              <th>帳單日期</th>
              <th>訂單編號</th>
              <th>賒帳金額</th>
              <th>未結清金額</th>
              <th>還款日期</th>
              <th>狀態</th>
              <th>提醒次數</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {tableData.length > 0 ? (
              tableData.map((item, index) => (
                <tr key={index}>
                  <td>
                    <input
                      type="checkbox"
                      checked={checkedOrders.includes(item)}
                      onChange={() => toggleCheck(item)}
                    />
                  </td>
                  <td>{item.orderId}</td>
                  <td>{item.member}</td>
                  <td>{item.name}</td>
                  <td>2025-04-18</td>
                  <td>{item.orderId}</td>
                  <td>{item.totalAmount}</td>
                  <td>{item.unpaidAmount}</td>
                  <td>{item.repaymentDate}</td>
                  <td>{item.status || "未還款"}</td>
                  <td>{item.remindCount}</td>
                  <td>
                    <button
                      className="edit-button me-2"
                      onClick={() => handleRemind(item)}
                    >
                      提醒
                    </button>
                    <button
                      className="edit-button"
                      onClick={() => openSettleModal(item)}
                    >
                      結清
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

      <div className="d-flex align-items-center mt-2 ps-3">
        <button
          className="pink-button me-3"
          style={{ fontSize: "1.1rem" }}
          onClick={handlePrint}
        >
          列印結清單
        </button>
      </div>

      <Modal show={showModal} onHide={closeModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>結清金額</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>結清金額</Form.Label>
            <Form.Control
              type="number"
              min={1}
              max={selectedOrder?.unpaidAmount || 0}
              value={settleAmount}
              onChange={(e) => setSettleAmount(Number(e.target.value))}
            />
          </Form.Group>
          <Form.Group className="mt-3">
            <Form.Label>付款方式</Form.Label>
            <Form.Select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option>現金</option>
              <option>匯款</option>
              <option>支票</option>
            </Form.Select>
          </Form.Group>

          {paymentMethod === "匯款" && (
            <>
              <Form.Group className="mt-3">
                <Form.Label>銀行名稱</Form.Label>
                <Form.Control
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
              </Form.Group>
              <Form.Group className="mt-3">
                <Form.Label>帳號後五碼</Form.Label>
                <Form.Control
                  type="text"
                  value={accountLast5}
                  onChange={(e) => setAccountLast5(e.target.value)}
                />
              </Form.Group>
              <Form.Group className="mt-3">
                <Form.Label>匯款日期</Form.Label>
                <Form.Control
                  type="date"
                  value={remitDate}
                  onChange={(e) => setRemitDate(e.target.value)}
                />
              </Form.Group>
            </>
          )}

          {paymentMethod === "支票" && (
            <>
              <Form.Group className="mt-3">
                <Form.Label>銀行名稱</Form.Label>
                <Form.Control
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
              </Form.Group>
              <Form.Group className="mt-3">
                <Form.Label>支票號碼</Form.Label>
                <Form.Control
                  type="text"
                  value={chequeNumber}
                  onChange={(e) => setChequeNumber(e.target.value)}
                />
              </Form.Group>
              <Form.Group className="mt-3">
                <Form.Label>支票日期</Form.Label>
                <Form.Control
                  type="date"
                  value={chequeDate}
                  onChange={(e) => setChequeDate(e.target.value)}
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeModal}>
            取消
          </Button>
          <Button variant="success" onClick={handleSettle}>
            確認結清
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}