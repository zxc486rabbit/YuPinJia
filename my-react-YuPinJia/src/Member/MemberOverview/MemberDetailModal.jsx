import React, { useEffect } from "react";
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
import axios from "axios";

export default function MemberDetailModal({ show, onHide, detailData, selectedMonth, setSelectedMonth, memberId }) {
  if (!detailData) return null; // 確保 detailData 為非空值才渲染

  const { monthlySummary, filteredData } = detailData;

  // 提取月份和對應的總消費
  const chartData = monthlySummary.map((item) => ({
    month: item.month,
    total: item.total,
  }));

  
  // 本月消費總金額 (根據 selectedMonth 計算)
  const currentMonthSummary = monthlySummary.find((item) => item.month === selectedMonth);
  const currentMonthTotal = currentMonthSummary ? currentMonthSummary.total : 0;

 // 生成從 2025-01 到當前月份的月份選項
  const getMonths = () => {
    const months = [];
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // 當前月 (1-12)
    for (let month = 1; month <= currentMonth; month++) {
      months.push(`${currentYear}-${String(month).padStart(2, "0")}`);
    }
    return months;
  };

  // 當月份變更時，重新發送 API 請求
  useEffect(() => {
    if (selectedMonth && memberId) {
      const apiUrl = `https://yupinjia.hyjr.com.tw/api/api/t_SalesOrder/GetSalesOrderByMember?memberId=${memberId}&filterMonth=${selectedMonth}`;
      console.log("發送的 API 請求 URL：", apiUrl);

      axios
        .get(apiUrl)
        .then((response) => {
          console.log("消費情形資料：", response.data);
          // 可以根據 response 更新 filteredData
        })
        .catch((error) => {
          console.error("載入消費情形失敗：", error);
        });
    }
  }, [selectedMonth, memberId]); // 監聽 selectedMonth 和 memberId 變化

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>消費明細</Modal.Title>
      </Modal.Header>
      <Modal.Body
        style={{
          padding: "20px", // 添加內邊距
          backgroundColor: "#f7f7f7", // 背景顏色
          borderRadius: "8px", // 圓角
        }}
      >
        {/* 各月消費趨勢 */}
        <div className="mb-4">
          <h6 className="mb-3" style={{ fontWeight: "600" }}>各月消費趨勢</h6>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
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
                dataKey={() => 0} // Placeholder for average line
                stroke="#ff4d4f"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="平均值"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 月份篩選 */}
        <Form.Group className="mb-3 d-flex align-items-center gap-3">
          <Form.Label className="mb-0">選擇月份：</Form.Label>
          <Form.Select
            style={{ width: "200px" }}
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)} // 使用 setSelectedMonth 更新月份
          >
            {getMonths().map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </Form.Select>

          {/* 本月消費總金額，放在同一行 */}
          <div style={{ marginLeft: "20px" }}>
            <strong>本月消費總金額：</strong> NT$ {currentMonthTotal.toLocaleString()}
          </div>
        </Form.Group>

        {/* 表格內容 */}
        <div style={{ maxHeight: "200px", overflowY: "auto", marginTop: "20px" }}>
          <h6 style={{ fontWeight: "600" }}>消費明細</h6>
          {filteredData.length > 0 ? (
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
          ) : (
            <p>此月份無消費紀錄</p>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer style={{ borderTop: "none", padding: "10px" }}>
        <Button variant="secondary" onClick={onHide} style={{ fontWeight: "600" }}>
          關閉
        </Button>
      </Modal.Footer>
    </Modal>
  );
}