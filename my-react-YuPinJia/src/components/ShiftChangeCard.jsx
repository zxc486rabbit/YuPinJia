export default function ShiftChangeCard({ title, paymentDetails, onclick }) {
  const fmt = (n) => Number(n ?? 0).toLocaleString();

  // 只加總「金額」的項目（unit 缺省或為 "元" 才累加）
  const totalMoney = (paymentDetails?.methods ?? [])
    .flat()
    .reduce((sum, item) => {
      const unit = item?.unit ?? "元";
      const val = Number(item?.amount ?? 0);
      return sum + (unit === "元" ? val : 0);
    }, 0);

  return (
    <div className="card">
      <div className="title">
        <div>
          {title} : {fmt(totalMoney)} 元
        </div>
        <button className="add-button" onClick={onclick}>檢視明細</button>
      </div>

      <div className="content">
        {(paymentDetails?.methods ?? []).map((row, i) => (
          <div className="text" key={i}>
            {row.map(({ label, amount, unit }, j) => (
              <span key={j}>
                {label}: {fmt(amount)} {unit ?? "元"}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
