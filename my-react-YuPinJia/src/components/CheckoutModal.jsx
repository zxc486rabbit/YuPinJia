import { useState, useEffect, useCallback } from "react";
import { Modal, Button, Form, Row, Col } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import {
  FaCashRegister,
  FaCreditCard,
  FaBarcode,
  FaTruck,
  FaTimes,
  FaCheckCircle,
} from "react-icons/fa";
import styles from "./CheckoutModal.module.css";

export default function CheckoutModal({
  show,
  onHide,
  data,
  onConfirm,
  member,
  onClearCart,
}) {
  const navigate = useNavigate();
  const finalTotal = data?.finalTotal ?? 0;

  /* -------- state -------- */
  const [payment, setPayment] = useState("現金");
  const [carrier, setCarrier] = useState("紙本發票");
  const [taxId, setTaxId] = useState("");
  const [carrierNumber, setCarrierNumber] = useState("");
  const [delivery, setDelivery] = useState("到店自取");

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [note, setNote] = useState("");
  const [payOnDelivery, setPayOnDelivery] = useState(false);

  const [isPrinting, setIsPrinting] = useState(false);

  const needExtraInfo = [
    "機場提貨",
    "碼頭提貨",
    "宅配到府",
    "訂單自取",
  ].includes(delivery);

  /* -------- 結帳 / 成立訂單 -------- */
  const handleFinish = useCallback(() => {
    const checkoutData = {
      payment,
      carrier,
      taxId,
      carrierNumber,
      delivery,
      customerName,
      customerPhone,
      pickupLocation,
      pickupTime,
      note,
      payOnDelivery,
    };

    setIsPrinting(true); // 顯示列印中

    setTimeout(() => {
      setIsPrinting(false);
      if (onClearCart) onClearCart();
      if (payOnDelivery) {
        // 貨到付款，跳轉頁面
        navigate("/SalesOrder/SalesIndex");
      }

      onHide?.(); // 無論如何，關閉彈出框
    }, 1000);
  }, [
    payment,
    carrier,
    taxId,
    carrierNumber,
    delivery,
    customerName,
    customerPhone,
    pickupLocation,
    pickupTime,
    note,
    payOnDelivery,
    navigate,
    onHide,
  ]);

  /* -------- 帶入會員預設值 -------- */
  useEffect(() => {
    if (!show || !member) return;
    setCustomerName(member.name || "");
    setCustomerPhone(member.phone || "");
    setPickupLocation("門市");
    setPickupTime(new Date().toISOString().slice(0, 16));
    setNote("");
    setPayOnDelivery(false);
    setIsPrinting(false);
  }, [show, member?.id]);

  /* -------- Esc / Enter 快捷 -------- */
  useEffect(() => {
    const key = (e) => {
      if (e.key === "Escape") onHide?.();
      if (e.key === "Enter" && !isPrinting) handleFinish();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [handleFinish, onHide, isPrinting]);

  if (!show || !data) return null;

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="lg"
      centered
      backdrop="static"
      dialogClassName={`${styles.dialog} modal-dialog-scrollable`}
    >
      <Modal.Header className="bg-dark text-white">
        <Modal.Title>
          <FaCashRegister className="me-2" />
          結帳
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className={styles.bodyScroll}>
        {isPrinting ? (
          <div className="text-center my-4">
            <div className="spinner-border text-primary" role="status" />
            <p className="mt-3 fw-bold">列印發票中，請稍候…</p>
          </div>
        ) : (
          <>
            <h2 className="text-danger text-center fw-bold mb-4">
              NT$ {finalTotal.toLocaleString()}
            </h2>

            {/* 付款方式 */}
            <Form.Group className="mb-3">
              <Form.Label>
                <FaCreditCard className="me-2" />
                付款方式
              </Form.Label>
              <Form.Select
                size="lg"
                value={payment}
                onChange={(e) => setPayment(e.target.value)}
              >
                <option>現金</option>
                <option>刷卡</option>
                <option>行動支付</option>
                <option>賒帳</option>
              </Form.Select>
            </Form.Group>

            {/* 發票載具 */}
            <Form.Group className="mb-3">
              <Form.Label>
                <FaBarcode className="me-2" />
                發票載具
              </Form.Label>
              <Form.Select
                size="lg"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
              >
                <option>紙本發票</option>
                <option>手機載具</option>
                <option>自然人憑證</option>
                <option>統一編號</option>
              </Form.Select>

              {carrier === "統一編號" && (
                <Form.Control
                  className="mt-2"
                  placeholder="輸入 8 碼統編"
                  maxLength={8}
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                />
              )}
              {carrier !== "紙本發票" && carrier !== "統一編號" && (
                <Form.Control
                  className="mt-2"
                  placeholder="請輸入載具號碼"
                  value={carrierNumber}
                  onChange={(e) => setCarrierNumber(e.target.value)}
                />
              )}
            </Form.Group>

            {/* 配送方式 */}
            <Form.Group className="mb-3">
              <Form.Label>
                <FaTruck className="me-2" />
                配送方式
              </Form.Label>
              <Form.Select
                size="lg"
                value={delivery}
                onChange={(e) => setDelivery(e.target.value)}
              >
                <option>現場帶走</option>
                <option>機場提貨</option>
                <option>碼頭提貨</option>
                <option>宅配到府</option>
                <option>店到店</option>
                <option>訂單自取</option>
                <option>代客送貨</option>
                <option>超商取貨</option>
              </Form.Select>
            </Form.Group>

            {/* 進階配送欄位 */}
            {needExtraInfo && (
              <div className="bg-light p-3 rounded border">
                <Row className="mb-2">
                  <Col>
                    <Form.Label>姓名</Form.Label>
                    <Form.Control
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </Col>
                  <Col>
                    <Form.Label>聯絡電話</Form.Label>
                    <Form.Control
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                    />
                  </Col>
                </Row>
                <Row className="mb-2">
                  <Col>
                    <Form.Label>出貨點</Form.Label>
                    <Form.Control
                      value={pickupLocation}
                      onChange={(e) => setPickupLocation(e.target.value)}
                    />
                  </Col>
                  <Col>
                    <Form.Label>收款時間</Form.Label>
                    <Form.Control
                      type="datetime-local"
                      value={pickupTime}
                      onChange={(e) => setPickupTime(e.target.value)}
                    />
                  </Col>
                </Row>
                <Form.Group className="mb-2">
                  <Form.Label>備註</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    placeholder="請填寫交貨相關注意事項或聯絡備註"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </Form.Group>

                <Form.Check
                  className="mt-2"
                  type="checkbox"
                  id="payOnDelivery"
                  label="貨到付款，需成立訂單"
                  checked={payOnDelivery}
                  onChange={(e) => setPayOnDelivery(e.target.checked)}
                />
              </div>
            )}
          </>
        )}
      </Modal.Body>

      {/* 按鈕區 */}
      <Modal.Footer className="d-flex justify-content-between">
        <Button
          variant="secondary"
          size="lg"
          className="fw-bold"
          onClick={onHide}
          disabled={isPrinting}
        >
          <FaTimes className="me-2" /> 取消（Esc）
        </Button>
        <Button
          variant={payOnDelivery ? "warning" : "success"}
          size="lg"
          className="fw-bold"
          onClick={handleFinish}
          disabled={isPrinting}
        >
          <FaCheckCircle className="me-2" />
          {payOnDelivery ? "成立訂單" : "確認結帳（Enter）"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
