import { useLocation } from "react-router-dom";
import { useEffect } from "react";

export default function PrintPage() {
  const { state } = useLocation();
  const selected = state?.selected || [];

  // ⭐ 頁面載入時自動開啟列印
  useEffect(() => {
    setTimeout(() => {
      window.print();
    }, 300);
  }, []);

  return (
    <div style={{ padding: "2rem" }}>
      <h3 style={{ textAlign: "center", marginBottom: "1rem" }}>結清單</h3>
      <table
        border="1"
        cellPadding="8"
        cellSpacing="0"
        style={{ width: "100%", fontSize: "1rem", borderCollapse: "collapse" }}
      >
        <thead>
          <tr style={{ background: "#f1f1f1" }}>
            <th>會員編號</th>
            <th>會員名稱</th>
            <th>賒帳金額</th>
            <th>未結清金額</th>
            <th>狀態</th>
          </tr>
        </thead>
        <tbody>
          {selected.map((item, index) => (
            <tr key={index}>
              <td>{item.orderId}</td>
              <td>{item.member}</td>
              <td>{item.totalAmount}</td>
              <td>{item.unpaidAmount}</td>
              <td>{item.status || "未還款"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}