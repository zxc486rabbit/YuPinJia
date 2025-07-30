import QuantityControl from "./QuantityControl";

export default function CartTable({ items, updateQuantity, currentMember }) {
  // 計算會員金額（改為統一使用 discountRate）
  const getPrice = (item) => {
    const discount = currentMember?.discountRate ?? 1;
    return Math.round(item.unitPrice * discount);
  };

  return (
    <table className="table m-0" style={{ fontSize: "1.3rem" }}>
      <thead
        className="table-light"
        style={{
          borderTop: "1px solid #c5c6c7",
          position: "sticky",
          top: "0",
        }}
      >
        <tr>
          <th scope="col">名稱</th>
          <th scope="col">數量</th>
          <th scope="col">小計</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.productId} className="cartTr">
            <td>{item.name}</td>
            <td className="quantity-control">
              <QuantityControl
                defaultValue={item.quantity}
                onChange={(value) => updateQuantity(item.productId, value)}
              />
            </td>
            <td>
              ${ (getPrice(item) * item.quantity).toLocaleString() }
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}