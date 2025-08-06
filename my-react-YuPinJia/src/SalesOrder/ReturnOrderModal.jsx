import { Modal, Button, Form, Row, Col } from "react-bootstrap";
import { useState } from "react";

export default function ReturnOrderModal({ show, onClose, orderData, onSubmit }) {
  // 初始化表單欄位
  const [returnMethod, setReturnMethod] = useState("");
  const [applicant, setApplicant] = useState("");
  const [refundMethod, setRefundMethod] = useState(0); // 0=現金, 1=轉帳等
  const [refunder, setRefunder] = useState("");
  const [refundStatus, setRefundStatus] = useState(0); // 0=待退款, 1=已退款
  const [invoiceSendMethod, setInvoiceSendMethod] = useState("");
  const [mailer, setMailer] = useState("");
  const [mailingStatus, setMailingStatus] = useState("");

  const handleSubmit = () => {
    const payload = {
      orderNumber: orderData.orderId,
      returnNumber: `SO${Date.now()}`, // 自動生成退貨單號
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
      {/* 這段 style 只影響這個 Modal */}
      <style>
        {`
          .return-order-modal .row > * {
            padding-left: 0.75rem;
            padding-right: 0.75rem;
          }
        `}
      </style>
    <Modal show={show} onHide={onClose} centered size="lg" className="return-order-modal">
      <Modal.Header closeButton>
        <Modal.Title>退貨資料填寫</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Row className="g-3">
          <Col md={6}>
            <Form.Group>
              <Form.Label>退貨方式</Form.Label>
              <Form.Control
                type="text"
                value={returnMethod}
                onChange={(e) => setReturnMethod(e.target.value)}
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group>
              <Form.Label>申請人</Form.Label>
              <Form.Control
                type="text"
                value={applicant}
                onChange={(e) => setApplicant(e.target.value)}
              />
            </Form.Group>
          </Col>
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
          <Col md={6}>
            <Form.Group>
              <Form.Label>發票寄送方式</Form.Label>
              <Form.Control
                type="text"
                value={invoiceSendMethod}
                onChange={(e) => setInvoiceSendMethod(e.target.value)}
              />
            </Form.Group>
          </Col>
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
          <Col md={6}>
            <Form.Group>
              <Form.Label>寄送狀態</Form.Label>
              <Form.Control
                type="text"
                value={mailingStatus}
                onChange={(e) => setMailingStatus(e.target.value)}
              />
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