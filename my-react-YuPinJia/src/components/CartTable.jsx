import QuantityControl from "./QuantityControl";

export default function CartTable({ items, updateQuantity, currentMember }) {
  const getPrice = (item) => {
    if (!currentMember) return item.unitPrice;
    if (currentMember.type === "VIP" && currentMember.subType === "廠商") {
      return Math.round(item.unitPrice * 0.9);
    }
    return item.unitPrice;
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
          <tr key={item.id} className="cartTr">
            <td>{item.name}</td>
            <td className="quantity-control">
              <QuantityControl
                defaultValue={item.quantity}
                onChange={(value) => updateQuantity(item.id, value)}
              />
            </td>
            <td>
              $
              {(getPrice(item) * item.quantity).toLocaleString()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}