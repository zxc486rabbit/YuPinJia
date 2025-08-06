import { Modal, Button, Form, Row, Col } from "react-bootstrap";
import { useState, useEffect } from "react";

export default function ReturnOrderModal({ show, onClose, orderData, onSubmit }) {
  const [returnMethod, setReturnMethod] = useState("");
  const [applicant, setApplicant] = useState("");
  const [refundMethod, setRefundMethod] = useState(0);
  const [refunder, setRefunder] = useState("王小明"); // 預設退款人員
  const [refundStatus, setRefundStatus] = useState(0);
  const [invoiceSendMethod, setInvoiceSendMethod] = useState("");
  const [mailer, setMailer] = useState("小張"); // 預設寄送人員
  const [mailingStatus, setMailingStatus] = useState("");

  // 當接收到 orderData 時，設定申請人
  useEffect(() => {
    if (orderData) {
      setApplicant(orderData.member || "");
    }
  }, [orderData]);

  const handleSubmit = () => {
    const payload = {
      orderNumber: orderData.orderId,
      returnNumber: `SO${Date.now()}`,
      store: orderData.store,
      invoiceNumber: orderData.invoice,
      pickupTime: new Date().toISOString(),
      returnTime: new Date().toISOString(),
      returnMethod,
      applicant,
      refundMethod,
      refunder,
      refundStatus,
      invoiceSendMethod,
      mailer,
      mailingStatus
    };
    onSubmit(payload);
  };

  return (
    <>
      <style>
        {`
          .return-order-modal .row > * {
            padding-left: 0.75rem;
            padding-right: 0.75rem;
          }
        `}
      </style>

      <Modal
        show={show}
        onHide={onClose}
        centered
        size="lg"
        className="return-order-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>退貨資料填寫</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3">
            {/* 退貨方式 */}
            <Col md={6}>
              <Form.Group>
                <Form.Label>退貨方式</Form.Label>
                <Form.Select
                  value={returnMethod}
                  onChange={(e) => setReturnMethod(e.target.value)}
                >
                  <option value="">請選擇</option>
                  <option value="現場退貨">現場退貨</option>
                  <option value="郵寄退貨">郵寄退貨</option>
                  <option value="店到店退貨">店到店退貨</option>
                </Form.Select>
              </Form.Group>
            </Col>

            {/* 申請人（會員） */}
            <Col md={6}>
              <Form.Group>
                <Form.Label>申請人</Form.Label>
                <Form.Control
                  type="text"
                  value={applicant}
                  readOnly
                />
              </Form.Group>
            </Col>

            {/* 退款方式 */}
            <Col md={6}>
              <Form.Group>
                <Form.Label>退款方式</Form.Label>
                <Form.Select
                  value={refundMethod}
                  onChange={(e) => setRefundMethod(Number(e.target.value))}
                >
                  <option value={0}>現金</option>
                  <option value={1}>轉帳</option>
                  <option value={2}>其他</option>
                </Form.Select>
              </Form.Group>
            </Col>

            {/* 退款人員 */}
            <Col md={6}>
              <Form.Group>
                <Form.Label>退款人員</Form.Label>
                <Form.Control
                  type="text"
                  value={refunder}
                  onChange={(e) => setRefunder(e.target.value)}
                />
              </Form.Group>
            </Col>

            {/* 退款狀態 */}
            <Col md={6}>
              <Form.Group>
                <Form.Label>退款狀態</Form.Label>
                <Form.Select
                  value={refundStatus}
                  onChange={(e) => setRefundStatus(Number(e.target.value))}
                >
                  <option value={0}>待退款</option>
                  <option value={1}>已退款</option>
                </Form.Select>
              </Form.Group>
            </Col>

            {/* 發票寄送方式 */}
            <Col md={6}>
              <Form.Group>
                <Form.Label>發票寄送方式</Form.Label>
                <Form.Select
                  value={invoiceSendMethod}
                  onChange={(e) => setInvoiceSendMethod(e.target.value)}
                >
                  <option value="">請選擇</option>
                  <option value="郵寄">郵寄</option>
                  <option value="店到店">店到店</option>
                  <option value="電子發票">電子發票</option>
                </Form.Select>
              </Form.Group>
            </Col>

            {/* 寄送人員 */}
            <Col md={6}>
              <Form.Group>
                <Form.Label>寄送人員</Form.Label>
                <Form.Control
                  type="text"
                  value={mailer}
                  onChange={(e) => setMailer(e.target.value)}
                />
              </Form.Group>
            </Col>

            {/* 寄送狀態 */}
            <Col md={6}>
              <Form.Group>
                <Form.Label>寄送狀態</Form.Label>
                <Form.Select
                  value={mailingStatus}
                  onChange={(e) => setMailingStatus(e.target.value)}
                >
                  <option value="">請選擇</option>
                  <option value="待寄送">待寄送</option>
                  <option value="已寄送">已寄送</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button variant="success" onClick={handleSubmit}>確認退貨</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}