import QuantityControl from "./QuantityControl";
import { FaTimes } from "react-icons/fa";
import Swal from "sweetalert2";

export default function CartTable({
  items,
  updateQuantity,
  removeItem,
  currentMember,
}) {
  const money = (n) => `\$${Number(n || 0).toLocaleString()}`;

  const getRowSubtotal = (item) => {
    if (item.isGift) return 0;
    const unit = Number(item.unitPrice ?? 0);
    const qty = Number(item.quantity ?? 0);
    return unit * qty;
    };

  const handleClearCart = () => {
    if ((items?.length || 0) === 0) {
      Swal.fire({ title: "購物車已是空的", icon: "info" });
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
        Swal.fire({ title: "已清空", text: "購物車已清空", icon: "success" });
      }
    });
  };

  const handleRemoveItem = (item) => {
    const key = item.productId ?? item.id;
    Swal.fire({
      title: `確定要移除「${item.name}」？`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "刪除",
      cancelButtonText: "取消",
    }).then((result) => {
      if (result.isConfirmed) {
        removeItem(key);
        Swal.fire({
          title: "已移除",
          text: `${item.name} 已從購物車刪除`,
          icon: "success",
        });
      }
    });
  };

  return (
    <table className="table m-0 sticky-head" style={{ fontSize: "1.3rem" }}>
      <thead className="table-light">
        <tr>
          <th scope="col" className="col-name">名稱</th>
          <th scope="col" className="col-qty">數量</th>
          <th scope="col" className="col-subtotal">小計</th>
          <th scope="col" className="col-remove" style={{ textAlign: "center" }}>
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
        {items.map((item) => {
          const key = item.productId ?? item.id;
          const subtotal = getRowSubtotal(item);

          return (
            <tr key={key} className="cartTr">
              <td className="col-name">
                {item.name}
                {item.isGift && (
                  <span
                    className="badge text-bg-info ms-2"
                    title={`原價 ${money(item.originalPrice ?? item.price ?? 0)}`}
                  >
                    贈品
                  </span>
                )}
              </td>

              <td className="col-qty">
                <div className="quantity-control">
                  <QuantityControl
                    defaultValue={item.quantity}
                    onChange={(value) => updateQuantity(key, value)}
                    onRemove={() => handleRemoveItem(item)}
                  />
                </div>
              </td>

              <td className="col-subtotal">
                {item.isGift ? "免費" : money(subtotal)}
              </td>

              <td className="col-remove" style={{ textAlign: "center" }}>
                <FaTimes
                  className="text-danger"
                  style={{ cursor: "pointer" }}
                  title="刪除"
                  onClick={() => handleRemoveItem(item)}
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
