import QuantityControl from "./QuantityControl";
import { FaTimes } from "react-icons/fa";
import Swal from "sweetalert2";

export default function CartTable({ items, updateQuantity, removeItem, currentMember }) {
  const getPrice = (item) => {
    if (item.isGift) return 0;
    const discount = currentMember?.discountRate ?? 1;
    return Math.round(item.unitPrice * discount);
  };

  const handleClearCart = () => {
    if (items.length === 0) {
      Swal.fire({
        title: "購物車已是空的",
        icon: "info",
      });
      return;
    }

    Swal.fire({
      title: "確認清空購物車？",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "清空",
      cancelButtonText: "取消",
    }).then((result) => {
      if (result.isConfirmed) {
        updateQuantity("__CLEAR__", 0);
        Swal.fire({
          title: "已清空",
          text: "購物車已清空",
          icon: "success",
        });
      }
    });
  };

  const handleRemoveItem = (item) => {
    Swal.fire({
      title: `確定要移除「${item.name}」？`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "刪除",
      cancelButtonText: "取消",
    }).then((result) => {
      if (result.isConfirmed) {
        removeItem(item.productId);
        Swal.fire({
          title: "已移除",
          text: `${item.name} 已從購物車刪除`,
          icon: "success",
        });
      }
    });
  };

  return (
    <table className="table m-0" style={{ fontSize: "1.3rem" }}>
      <thead
        className="table-light"
        style={{ borderTop: "1px solid #c5c6c7", position: "sticky", top: "0" }}
      >
        <tr>
          <th scope="col">名稱</th>
          <th scope="col">數量</th>
          <th scope="col">小計</th>
          <th scope="col" style={{ width: "40px", textAlign: "center" }}>
            <FaTimes
              className="text-danger"
              style={{ cursor: "pointer" }}
              title="清空購物車"
              onClick={handleClearCart}
            />
          </th>
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
                onRemove={() => handleRemoveItem(item)}
              />
            </td>
            <td>
              {item.isGift ? (
                "贈品"
              ) : (
                `$${(getPrice(item) * item.quantity).toLocaleString()}`
              )}
            </td>
            <td style={{ textAlign: "center" }}>
              <FaTimes
                className="text-danger"
                style={{ cursor: "pointer" }}
                title="刪除"
                onClick={() => handleRemoveItem(item)}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}