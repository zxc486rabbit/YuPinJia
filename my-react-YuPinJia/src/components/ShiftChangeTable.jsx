import React from "react";

export default function ShiftChangeTable({ rightTable = [], loading, error, titleHint }) {
  return (
    <div className="border rounded bg-white p-2" style={{ minHeight: 360 }}>
      <div className="d-flex align-items-center justify-content-between mb-2">
        <div style={{ fontWeight: "bold" }}>
          {titleHint || "明細列表"}
        </div>
        {loading ? <span className="text-muted">載入中…</span> : null}
      </div>

      {error ? (
        <div className="alert alert-danger py-2 mb-2">{error}</div>
      ) : loading ? (
        <div className="text-center text-muted py-5">資料載入中…</div>
      ) : rightTable.length === 0 ? (
        <div className="text-center text-muted py-5">目前無資料</div>
      ) : (
        <div className="table-responsive" style={{ maxHeight: 300, overflowY: "auto" }}>
          <table className="table table-sm table-hover align-middle mb-0">
            <thead className="table-light" style={{ position: "sticky", top: 0, zIndex: 1 }}>
              <tr>
                <th style={{ width: "28%" }}>單號/代碼</th>
                <th style={{ width: "18%" }}>時間</th>
                <th style={{ width: "14%" }}>筆數</th>
                <th style={{ width: "22%" }}>金額</th>
                <th style={{ width: "18%" }}>方式</th>
              </tr>
            </thead>
            <tbody>
              {rightTable.map((r, i) => (
                <tr key={`${r.id}-${i}`}>
                  <td className="text-truncate" title={r.id}>{r.id}</td>
                  <td>{r.date}</td>
                  <td>{r.total}</td>
                  <td>{r.totalMoney}</td>
                  <td className="text-truncate" title={r.payMethod}>{r.payMethod}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
