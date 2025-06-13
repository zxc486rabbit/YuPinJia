import React from "react";

export default function ShiftChangeTable({ rightTable }) {
  return (
    <>
      <div
        className="ms-2 me-2"
        style={{
          height: "63vh", // ✅ 根據你的 layout 高度調整
          border: "1px solid #c5c6c7",
          display: "flex",
          flexDirection: "column",
          background: "white",
        }}
      >
        <div style={{ overflowY: "auto", flex: 1 }}>
          <table
            className="table mb-0"
            style={{
              fontSize: "1.1rem",
              fontWeight: "bold",
              tableLayout: "fixed",
              width: "100%",
            }}
          >
            <thead
              className="table-light"
              style={{ position: "sticky", top: 0, zIndex: 1 }}
            >
              <tr>
                <th className="text-center">訂單編號</th>
                <th className="text-center">交易時間</th>
                <th className="text-center">總數</th>
                <th className="text-center">總金額</th>
                <th className="text-center">付款方式</th>
              </tr>
            </thead>
            <tbody>
                {rightTable.map((v, i) => (
                  <tr key={i}>
                    <td className="text-center">{v.id}</td>
                    <td className="text-center">{v.date}</td>
                    <td className="text-center">{v.total}</td>
                    <td className="text-center">{v.totalMoney}</td>
                    <td className="text-center">{v.payMethod}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
