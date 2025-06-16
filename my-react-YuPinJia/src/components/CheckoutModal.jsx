import { useState, useEffect, useCallback } from "react";
import { Modal, Button, Table, Form } from "react-bootstrap";
import {
  FaReceipt,
  FaMoneyCheckAlt,
  FaTimes,
  FaCheckCircle,
} from "react-icons/fa";

export default function CheckoutModal({ show, onHide, data, onConfirm }) {
  if (!data) return null;

  const { items, subtotal, pointDiscount, finalTotal } = data;
  const [paymentMethod, setPaymentMethod] = useState("現金");

  // ✅ 播放嗶聲
  const playBeep = () => {
    try {
      const audio = new Audio("/sounds/success-beep.mp3");
      audio.play();
    } catch (err) {
      console.warn("音效播放失敗：", err);
    }
  };

  // ✅ 結帳確認處理
  const handleConfirm = useCallback(() => {
    playBeep();
    onConfirm?.({ ...data, paymentMethod });
  }, [data, paymentMethod, onConfirm]);

  // ✅ 鍵盤快捷鍵
  useEffect(() => {
    if (!show) return;
    const handleKey = (e) => {
      if (e.key === "Enter") handleConfirm();
      if (e.key === "Escape") onHide();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [show, handleConfirm, onHide]);

  return (
    <Modal show={show} onHide={onHide} size="lg" centered backdrop="static">
      {/* 標題區 */}
      <Modal.Header className="bg-dark text-white">
        <Modal.Title>
          <FaReceipt className="me-2" />
          結帳確認
        </Modal.Title>
      </Modal.Header>

      {/* 內容區 */}
      <Modal.Body>
        {/* 商品清單 */}
        <div style={{ maxHeight: "40vh", overflowY: "auto" }}>
          <Table striped bordered hover size="sm">
            <thead>
              <tr>
                <th>商品</th>
                <th>單價</th>
                <th>數量</th>
                <th className="text-end">小計</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id}>
                  <td>{it.name}</td>
                  <td>${it.unitPrice.toLocaleString()}</td>
                  <td>{it.quantity}</td>
                  <td className="text-end">
                    ${(it.unitPrice * it.quantity).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>

        {/* 金額區 */}
        <div className="mt-3">
          <div className="d-flex justify-content-between fs-5">
            <span>小計</span>
            <span>${subtotal.toLocaleString()}</span>
          </div>
          <div className="d-flex justify-content-between fs-5">
            <span>點數折抵</span>
            <span className="text-danger">- ${pointDiscount}</span>
          </div>
          <hr />
          <div className="d-flex justify-content-between fs-4 fw-bold text-danger">
            <span>應付金額</span>
            <span>${finalTotal.toLocaleString()}</span>
          </div>
        </div>

        {/* 付款方式選單 */}
        <Form className="mt-4">
          <Form.Group controlId="paymentMethod">
            <Form.Label className="fw-bold">
              <FaMoneyCheckAlt className="me-2" />
              付款方式
            </Form.Label>
            <Form.Select
              size="lg"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="現金">現金</option>
              <option value="刷卡">刷卡</option>
              <option value="賒帳">賒帳</option>
            </Form.Select>
          </Form.Group>
        </Form>
      </Modal.Body>

      {/* 按鈕區 */}
      <Modal.Footer className="d-flex justify-content-between">
        <Button
          variant="secondary"
          size="lg"
          className="fw-bold"
          onClick={onHide}
        >
          <FaTimes className="me-2" />
          取消（Esc）
        </Button>
        <Button
          variant="success"
          size="lg"
          className="fw-bold"
          onClick={handleConfirm}
        >
          <FaCheckCircle className="me-2" />
          確認結帳（Enter）
        </Button>
      </Modal.Footer>
    </Modal>
  );
}