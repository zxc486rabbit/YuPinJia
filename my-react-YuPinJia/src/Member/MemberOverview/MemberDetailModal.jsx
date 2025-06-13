import { useState, useMemo } from "react";
import { Modal, Button, Table, Form } from "react-bootstrap";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

export default function PurchaseDetailModal({ show, onHide, detailData }) {
  // 安全處理：避免 detailData 為 null
  const data = Array.isArray(detailData) ? detailData : [];

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  });

  //  取得所有可用月份
  const availableMonths = useMemo(() => {
    const months = data.map((item) => item.date?.slice(0, 7));
    return [...new Set(months)].filter(Boolean);
  }, [data]);

  //  根據月份篩選資料
  const filteredData = useMemo(() => {
    return data.filter((item) => item.date?.startsWith(selectedMonth));
  }, [data, selectedMonth]);

  //  該月總金額
  const totalAmount = filteredData.reduce(
    (acc, item) => acc + item.quantity * item.price,
    0
  );

  //  各月總金額：折線圖資料
  const monthlySummary = useMemo(() => {
    const monthMap = {};
    data.forEach((item) => {
      const month = item.date?.slice(0, 7);
      if (!month) return;
      monthMap[month] = (monthMap[month] || 0) + item.quantity * item.price;
    });

    return Object.entries(monthMap)
      .map(([month, total]) => ({ month, total }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [data]);

//   計算平均金額
  const averageTotal = useMemo(() => {
  if (monthlySummary.length === 0) return 0;
  const sum = monthlySummary.reduce((acc, item) => acc + item.total, 0);
  return Math.round(sum / monthlySummary.length);
}, [monthlySummary]);

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>消費明細</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/*  各月折線圖趨勢 */}
        <div className="mb-4">
          <h6 className="mb-3">各月消費趨勢</h6>
         <ResponsiveContainer width="100%" height={250}>
  <LineChart
    data={monthlySummary}
    onClick={(e) => {
      if (e?.activeLabel) {
        setSelectedMonth(e.activeLabel);
      }
    }}
  >
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="month" />
    <YAxis />
    <Tooltip
      formatter={(value) => `NT$ ${value.toLocaleString()}`}
      labelFormatter={(label) => `月份：${label}`}
    />
    {/* 趨勢折線 */}
    <Line
      type="monotone"
      dataKey="total"
      stroke="#8884d8"
      strokeWidth={2}
      name="本月總額"
    />
    {/* 平均線 */}
    <Line
      type="monotone"
      dataKey={() => averageTotal}
      stroke="#ff4d4f"
      strokeWidth={2}
      strokeDasharray="5 5"
      name="平均值"
    />
  </LineChart>
</ResponsiveContainer>
        </div>

        {/*  月份篩選 */}
        <Form.Group className="mb-3 d-flex align-items-center gap-3">
          <Form.Label className="mb-0">選擇月份：</Form.Label>
          <Form.Select
            style={{ width: "200px" }}
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            {availableMonths.map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </Form.Select>
        </Form.Group>

        {/*  本月總金額 */}
        <div className="mb-3">
          <strong>本月消費總金額：</strong> NT$ {totalAmount.toLocaleString()}
        </div>

        {/*  表格內容 */}
        {filteredData.length > 0 ? (
            <div style={{ maxHeight: "185px", overflowY: "auto" }}>
          <Table bordered hover>
            <thead>
              <tr>
                <th>訂單編號</th>
                <th>日期</th>
                <th>商品名稱</th>
                <th>數量</th>
                <th>單價</th>
                <th>總金額</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item, index) => (
                <tr key={index}>
                  <td>{item.orderId}</td>
                  <td>{item.date}</td>
                  <td>{item.productName}</td>
                  <td>{item.quantity}</td>
                  <td>{item.price}</td>
                  <td>{item.quantity * item.price}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          </div>
        ) : (
          <p>此月份無消費紀錄</p>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          關閉
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
