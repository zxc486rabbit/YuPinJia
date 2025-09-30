import { Modal, Button, Form, Row, Col, Table, Spinner } from "react-bootstrap";
import { useState, useEffect } from "react";
import axios from "axios";
import Swal from "sweetalert2";

export default function CreditSettleModal({
  show,
  onClose,
  creditRecordId,
  onSettled,
}) {
  const [loading, setLoading] = useState(false);
  const [salesOrders, setSalesOrders] = useState([]);
  const [totalSettledAmount, setTotalSettledAmount] = useState(0);
  const [selectedOrders, setSelectedOrders] = useState([]);

  const [repaymentAmount, setRepaymentAmount] = useState("");
  const [repaymentMethod, setRepaymentMethod] = useState(0);
  const [memberId, setMemberId] = useState(0);
  const [creditAmount, setCreditAmount] = useState(0);
  const [balance, setBalance] = useState(0);

  const [accountOrNumber, setAccountOrNumber] = useState("");
  const [payer, setPayer] = useState("");
  const [payDate, setPayDate] = useState("");
  const [paymentImage, setPaymentImage] = useState(null);

  // ★ 查詢條件（變動即自動查）
  const [inputFrom, setInputFrom] = useState(""); // yyyy-mm-dd
  const [inputTo, setInputTo] = useState(""); // yyyy-mm-dd
  const [payerFilter, setPayerFilter] = useState("0"); // "0"=本人, "1"=客人

  // ★ 回扣點數（合計勾選訂單的 cashbackPoint）
  const [cashbackPoint, setCashbackPoint] = useState(0);

  // 勾選總金額即時重算
  useEffect(() => {
    setTotalSettledAmount(
      selectedOrders.reduce((a, c) => a + Number(c.creditAmount || 0), 0)
    );
  }, [selectedOrders]);

  // ★ 合計勾選訂單的 cashbackPoint（改為依每筆訂單欄位，不用比率）
  useEffect(() => {
    // 僅在顯示客人結帳時才計算與顯示點數；若不是客人結帳，則歸 0
    if (payerFilter !== "1") {
      setCashbackPoint(0);
      return;
    }
    const map = new Map(
      (salesOrders || []).map((o) => [o.id, Number(o.cashbackPoint ?? 0)])
    );
    const sum = selectedOrders.reduce(
      (acc, s) => acc + (map.get(s.orderId) || 0),
      0
    );
    setCashbackPoint(sum);
  }, [selectedOrders, salesOrders, payerFilter]);

  // ★ 自動查詢（400ms debounce + AbortController）
  useEffect(() => {
    if (!show || !creditRecordId) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (inputFrom) params.set("startDate", inputFrom);
        if (inputTo) params.set("endDate", inputTo);
        if (payerFilter !== "") params.set("payer", payerFilter); // 0=本人 1=客人

        const url = `https://yupinjia.hyjr.com.tw/api/api/t_CreditRecord/${creditRecordId}${
          params.toString() ? `?${params.toString()}` : ""
        }`;

        const res = await axios.get(url, { signal: controller.signal });
        const data = res.data;

        setSalesOrders(data.salesOrders || []);
        setMemberId(data.memberId || 0);
        setCreditAmount(data.creditAmount || 0);
        setBalance(data.balance || 0);

        // 新結果 → 清空勾選與金額
        setSelectedOrders([]);
        setTotalSettledAmount(0);
        setCashbackPoint(0);
      } catch (err) {
        if (err.name !== "CanceledError") {
          console.error("自動查詢失敗", err);
        }
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [inputFrom, inputTo, payerFilter, show, creditRecordId]);

  // 補抓 invoiceNumber（若單筆缺）
  useEffect(() => {
    if (!show || !creditRecordId) return;
    const needFetch = (salesOrders || []).some(
      (o) => o.invoiceNumber === undefined
    );
    if (!needFetch) return;

    (async () => {
      try {
        const enriched = await Promise.all(
          (salesOrders || []).map(async (o) => {
            if (o.invoiceNumber !== undefined) return o;
            try {
              const det = await axios.get(
                `https://yupinjia.hyjr.com.tw/api/api/t_SalesOrder/${o.id}`
              );
              return { ...o, invoiceNumber: det.data?.invoiceNumber || "" };
            } catch {
              return { ...o, invoiceNumber: "" };
            }
          })
        );
        setSalesOrders(enriched);
      } catch (e) {
        console.error("補抓發票資訊失敗", e);
      }
    })();
  }, [show, creditRecordId, salesOrders]);

  // 會員餘額（儲值→餘額支付）
  const [memberBalance, setMemberBalance] = useState(0);
  useEffect(() => {
    if (repaymentMethod === 3 && memberId) {
      axios
        .get(`https://yupinjia.hyjr.com.tw/api/api/t_Member/${memberId}`)
        .then((res) => {
          const accountBalance = res.data.accountBalance || 0;
          setMemberBalance(accountBalance);
          setRepaymentAmount(accountBalance);
        })
        .catch((err) => {
          console.error("抓取會員餘額失敗", err);
        });
    } else {
      setRepaymentAmount("");
    }
  }, [repaymentMethod, memberId]);

  // 勾/取消單筆
  const toggleSelectOrder = (orderId, creditAmount) => {
    setSelectedOrders((prev) => {
      if (prev.some((o) => o.orderId === orderId)) {
        return prev.filter((o) => o.orderId !== orderId);
      }
      return [...prev, { orderId, creditAmount: Number(creditAmount || 0) }];
    });
  };

  // ★ 全選/取消全選：直接針對目前列表（salesOrders）
  const allChecked =
    salesOrders.length > 0 &&
    salesOrders.every((o) => selectedOrders.some((s) => s.orderId === o.id));

  const toggleSelectAll = () => {
    const allSelected = salesOrders.every((o) =>
      selectedOrders.some((s) => s.orderId === o.id)
    );
    if (allSelected) {
      setSelectedOrders((prev) =>
        prev.filter((s) => !salesOrders.some((o) => o.id === s.orderId))
      );
    } else {
      setSelectedOrders((prev) => {
        const toAdd = salesOrders
          .filter((o) => !prev.some((s) => s.orderId === o.id))
          .map((o) => ({
            orderId: o.id,
            creditAmount: Number(o.creditAmount || 0),
          }));
        return [...prev, ...toAdd];
      });
    }
  };

  const remainingBalance =
    (Number(balance) || 0) +
    (Number(repaymentAmount) || 0) -
    totalSettledAmount;

  const handleResetClick = () => {
    setInputFrom("");
    setInputTo("");
    setPayerFilter("0"); // 預設本人
    setSelectedOrders([]);
    setTotalSettledAmount(0);
    setCashbackPoint(0);
  };

  const handleConfirmSettle = async () => {
    if (Number(repaymentAmount) < totalSettledAmount) {
      Swal.fire("金額不足", "需要少勾一筆訂單，否則金額不足結清", "warning");
      return;
    }

    const newBalance =
      (Number(balance) || 0) +
      (Number(repaymentAmount) || 0) -
      totalSettledAmount;

    const payload = {
      id: creditRecordId,
      memberId,
      salesOrderIds: selectedOrders.map((o) => o.orderId),
      salesOrders: [],
      settledAmount: totalSettledAmount,
      creditAmount,
      repaymentMethod,
      repaymentAmount: Number(repaymentAmount),
      balance: newBalance,
      bankCode: 0,
      remittanceAccount: accountOrNumber || "",
      remitter: payer || "",
      remittanceDate: payDate || "",
      remittanceImage: paymentImage ? paymentImage.name : "",
      // ★ 直接送合計後的點數（依每筆訂單 cashbackPoint）
      cashbackPoint: Number(cashbackPoint || 0),
    };

    try {
      setLoading(true);
      await axios.put(
        `https://yupinjia.hyjr.com.tw/api/api/t_CreditRecord/${creditRecordId}`,
        payload
      );
      Swal.fire("成功", "結清完成", "success");
      if (typeof onSettled === "function") onSettled();
      onClose();
    } catch (error) {
      console.error("結清失敗", error);
      Swal.fire("錯誤", "結清失敗，請稍後再試", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .return-order-modal .row > * { padding-left: .75rem; padding-right: .75rem; }
        .scroll-table thead th { position: sticky; top: 0; background: #f8f9fa; z-index: 1; }
        .loading-overlay {
         position: absolute; inset: 0;
         background: rgba(255,255,255,.6);
         display: flex; align-items: center; justify-content: center;
         z-index: 5; backdrop-filter: blur(1px);
       }
      `}</style>

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
          {/* 標題 + 查詢列（輸入即查） */}
          <div className="d-flex align-items-center justify-content-between mb-2">
            <h5 className="mb-0">賒帳訂單</h5>
            <div className="d-flex align-items-end gap-2">
              <Form.Control
                type="date"
                value={inputFrom}
                onChange={(e) => setInputFrom(e.target.value)}
                style={{ width: 170 }}
              />
              <div className="pb-2">~</div>
              <Form.Control
                type="date"
                value={inputTo}
                onChange={(e) => setInputTo(e.target.value)}
                style={{ width: 170 }}
              />
              <Form.Select
                value={payerFilter}
                onChange={(e) => setPayerFilter(e.target.value)}
                style={{ width: 160 }}
                title="結帳身份"
              >
                <option value="0">導遊本人</option>
                <option value="1">客人結帳</option>
              </Form.Select>

              <Button variant="outline-secondary" onClick={handleResetClick}>
                清除
              </Button>
            </div>
          </div>

          {/* 表格（限制高度，內部滾動） */}
          <div
            style={{
              maxHeight: 290,
              overflowY: "auto",
              border: "1px solid #dee2e6",
              borderRadius: 6,
              position: "relative",
            }}
          >
            {loading && (
              <div className="loading-overlay">
                <div className="d-flex flex-column align-items-center">
                  <Spinner animation="border" role="status" />
                  <div className="mt-2 text-muted small">查詢中…</div>
                </div>
              </div>
            )}
            <Table bordered size="sm" className="mb-2 text-center align-middle">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 72 }}>
                    <Form.Check
                      type="checkbox"
                      checked={allChecked}
                      disabled={salesOrders.length === 0}
                      onChange={toggleSelectAll}
                      label="全選"
                    />
                  </th>
                  <th>訂單編號</th>
                  <th>訂單日期</th>
                  <th>發票</th>
                  <th>回扣點數</th>
                  <th>賒帳金額</th>
                  <th>選擇</th>
                </tr>
              </thead>
              <tbody>
                {salesOrders.length > 0 ? (
                  salesOrders.map((order) => {
                    const checked = selectedOrders.some(
                      (o) => o.orderId === order.id
                    );
                    const invoiceLabel = order.invoiceNumber
                      ? `已開立 (${order.invoiceNumber})`
                      : "未開立";
                    return (
                      <tr key={order.id}>
                        <td>
                          <Form.Check
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              toggleSelectOrder(order.id, order.creditAmount)
                            }
                          />
                        </td>
                        <td>{order.orderNumber}</td>
                        <td>
                          {new Date(order.createdAt).toLocaleDateString()}
                        </td>
                        <td>
                          <span
                            className={
                              order.invoiceNumber
                                ? "badge bg-success"
                                : "badge bg-secondary"
                            }
                          >
                            {invoiceLabel}
                          </span>
                        </td>
                        <td>
                          {Number(order.cashbackPoint ?? 0).toLocaleString()} 點
                        </td>
                        <td>
                          {Number(order.creditAmount || 0).toLocaleString()}
                        </td>
                        <td>
                          <Button
                            size="sm"
                            variant={
                              checked ? "outline-danger" : "outline-primary"
                            }
                            onClick={() =>
                              toggleSelectOrder(order.id, order.creditAmount)
                            }
                          >
                            {checked ? "取消" : "選取"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6}>無相關訂單</td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>

          <Row className="mb-4">
            <Col md={6}>
              <strong>本次欲結清金額：</strong>{" "}
              {totalSettledAmount.toLocaleString()} 元
            </Col>
          </Row>

          {/* 收款/憑證 + 回扣點數（客人） */}
          <Form>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>本次儲值金額</Form.Label>
                  <Form.Control
                    type="number"
                    value={repaymentAmount}
                    onChange={(e) => setRepaymentAmount(e.target.value)}
                    readOnly={repaymentMethod === 3}
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>儲值方式</Form.Label>
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
                  <Form.Label>餘額</Form.Label>
                  <Form.Control
                    type="text"
                    value={`${remainingBalance.toLocaleString()} 元`}
                    readOnly
                  />
                </Form.Group>
              </Col>

              {/* ★ 客人結帳才顯示「點數（回扣金）」，數值為勾選訂單的 cashbackPoint 合計 */}
              {payerFilter === "1" && (
                <Col md={12}>
                  <Form.Group>
                    <Form.Label>
                      點數（回扣金）
                      <span className="ms-2 text-muted small">
                        （依勾選訂單回扣合計）
                      </span>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      value={`${Number(
                        cashbackPoint || 0
                      ).toLocaleString()} 點`}
                      readOnly
                    />
                  </Form.Group>
                </Col>
              )}

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
          <Button
            variant="success"
            onClick={handleConfirmSettle}
            disabled={loading}
          >
            確認結清
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
