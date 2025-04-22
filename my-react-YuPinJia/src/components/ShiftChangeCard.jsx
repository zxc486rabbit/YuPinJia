export default function ShiftChangeCard({ title, paymentDetails, onclick }) {
  // 將所有金額加總  sum是累加器 group是現在的元素 , 0是初始值
  const total = paymentDetails.methods
    .flat()
    .reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="card" style={{height: "22vh"}}>
      <div className="title">
        <div>
          {title} : {total.toLocaleString()} 元
        </div>
        <button className="add-button" onClick={onclick}>檢視明細</button>
      </div>
      <div className="content">
        {paymentDetails.methods.map((v, i) => (
          <div className="text" key={i}>
            {v.map(({ label, amount }, i) => (
              <span key={i}>
                {label}: {amount.toLocaleString()}元
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
