import { Modal, Button, Form, Row, Col, Table } from "react-bootstrap";
import { useState, useEffect } from "react";
import axios from "axios";
import Swal from "sweetalert2";

export default function CreditSettleModal({ show, onClose, creditRecordId }) {
  const [salesOrders, setSalesOrders] = useState([]);
  const [totalSettledAmount, setTotalSettledAmount] = useState(0); // 本次預結清金額
  const [selectedOrders, setSelectedOrders] = useState([]);

  const [repaymentAmount, setRepaymentAmount] = useState("");
  const [repaymentMethod, setRepaymentMethod] = useState(0);
  const [memberId, setMemberId] = useState(0);
  const [creditAmount, setCreditAmount] = useState(0);

  // 共用欄位（匯款 / 支票）
  const [accountOrNumber, setAccountOrNumber] = useState("");
  const [payer, setPayer] = useState("");
  const [payDate, setPayDate] = useState("");
  const [paymentImage, setPaymentImage] = useState(null);

  // 餘額計算 = 儲值金額 - 本次預結清金額
  const remainingBalance = (Number(repaymentAmount) || 0) - totalSettledAmount;

  // 取得 API 資料
  useEffect(() => {
    if (show && creditRecordId) {
      axios
        .get(
          `https://yupinjia.hyjr.com.tw/api/api/t_CreditRecord/${creditRecordId}`
        )
        .then((res) => {
          const data = res.data;
          setSalesOrders(data.salesOrders || []);
          setMemberId(data.memberId || 0); // 保存會員 ID
          setCreditAmount(data.creditAmount || 0); // 保存賒帳總額
          setTotalSettledAmount(0);
          setSelectedOrders([]);
          setRepaymentAmount("");
        })
        .catch((err) => {
          console.error("載入賒帳紀錄失敗", err);
        });
    }
  }, [show, creditRecordId]);

  // 勾選訂單
  const toggleSelectOrder = (orderId, creditAmount) => {
    setSelectedOrders((prev) => {
      let updated;
      if (prev.some((o) => o.orderId === orderId)) {
        updated = prev.filter((o) => o.orderId !== orderId);
      } else {
        updated = [...prev, { orderId, creditAmount }];
      }
      // 計算本次預結清金額（累加 creditAmount）
      const sum = updated.reduce((acc, cur) => acc + cur.creditAmount, 0);
      setTotalSettledAmount(sum);
      return updated;
    });
  };

  // 確認結清
  const handleConfirmSettle = async () => {
    if (Number(repaymentAmount) < totalSettledAmount) {
      Swal.fire("金額不足", "需要少勾一筆訂單，否則金額不足結清", "warning");
      return;
    }

    const payload = {
      id: creditRecordId,
      memberId,
      salesOrderIds: selectedOrders.map((o) => o.orderId),
      salesOrders: [], // 可以傳空陣列，後端不會用
      settledAmount: totalSettledAmount,
      creditAmount,
      repaymentMethod,
      repaymentAmount: Number(repaymentAmount),
      balance: remainingBalance,
      bankCode: 0,
      remittanceAccount: accountOrNumber || "",
      remitter: payer || "",
      remittanceDate: payDate || "",
      remittanceImage: paymentImage ? paymentImage.name : "", // 如果需要 base64 要額外轉換
    };

    try {
      await axios.put(
        `https://yupinjia.hyjr.com.tw/api/api/t_CreditRecord/${creditRecordId}`,
        payload // ✅ 不要包 recordDto
      );
      Swal.fire("成功", "結清完成", "success");
      onClose();
    } catch (error) {
      console.error("結清失敗", error);
      Swal.fire("錯誤", "結清失敗，請稍後再試", "error");
    }
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
      <Modal
        show={show}
        onHide={onClose}
        centered
        size="lg"
        className="return-order-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>結清賒帳</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* 賒帳相關訂單 */}
          <h5 className="mb-3">賒帳相關訂單</h5>
          <Table bordered size="sm" className="mb-2 text-center align-middle">
            <thead className="table-light">
              <tr>
                <th>訂單編號</th>
                <th>訂單日期</th>
                <th>賒帳金額</th>
                <th>選擇</th>
              </tr>
            </thead>
            <tbody>
              {salesOrders.length > 0 ? (
                salesOrders.map((order) => {
                  return (
                    <tr key={order.id}>
                      <td>{order.orderNumber}</td>
                      <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                      <td>{order.creditAmount.toLocaleString()}</td>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedOrders.some(
                            (o) => o.orderId === order.id
                          )}
                          onChange={() =>
                            toggleSelectOrder(order.id, order.creditAmount)
                          }
                        />
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4}>無相關訂單</td>
                </tr>
              )}
            </tbody>
          </Table>

          {/* 金額顯示 */}
          <Row className="mb-4">
            <Col md={6}>
              <strong>本次預結清金額：</strong>{" "}
              {totalSettledAmount.toLocaleString()} 元
            </Col>
          </Row>

          {/* 表單區 */}
          <Form>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>本次儲值金額 (RepaymentAmount)</Form.Label>
                  <Form.Control
                    type="number"
                    value={repaymentAmount}
                    onChange={(e) => setRepaymentAmount(e.target.value)}
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>儲值方式 (RepaymentMethod)</Form.Label>
                  <Form.Select
                    value={repaymentMethod}
                    onChange={(e) => setRepaymentMethod(Number(e.target.value))}
                  >
                    <option value={0}>現金</option>
                    <option value={1}>匯款</option>
                    <option value={2}>支票</option>
                    <option value={3}>餘額支付</option>
                    <option value={4}>電子支付</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={12}>
                <Form.Group>
                  <Form.Label>餘額 (Balance)</Form.Label>
                  <Form.Control
                    type="text"
                    value={`${remainingBalance.toLocaleString()} 元`}
                    readOnly
                  />
                </Form.Group>
              </Col>

              {/* 匯款 / 支票 共用欄位 */}
              {(repaymentMethod === 1 || repaymentMethod === 2) && (
                <>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>
                        {repaymentMethod === 1 ? "帳號後五碼" : "支票號碼"}
                      </Form.Label>
                      <Form.Control
                        type="text"
                        value={accountOrNumber}
                        onChange={(e) => setAccountOrNumber(e.target.value)}
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>
                        {repaymentMethod === 1 ? "匯款人" : "開票人"}
                      </Form.Label>
                      <Form.Control
                        type="text"
                        value={payer}
                        onChange={(e) => setPayer(e.target.value)}
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>
                        {repaymentMethod === 1 ? "匯款日期" : "支票日期"}
                      </Form.Label>
                      <Form.Control
                        type="date"
                        value={payDate}
                        onChange={(e) => setPayDate(e.target.value)}
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>
                        {repaymentMethod === 1 ? "匯款憑證" : "支票影本 / 憑證"}
                      </Form.Label>
                      <Form.Control
                        type="file"
                        onChange={(e) => setPaymentImage(e.target.files[0])}
                      />
                    </Form.Group>
                  </Col>
                </>
              )}
            </Row>
          </Form>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button variant="success" onClick={handleConfirmSettle}>
            確認結清
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
