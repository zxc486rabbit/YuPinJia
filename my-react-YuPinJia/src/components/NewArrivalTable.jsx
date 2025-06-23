import { useState } from "react";

export default function NewArrivalTable({
  products = [],
  addToCart,
  cartItems = [],
  onCheckout,
  usedPoints = 0,
}) {
  const [quantities, setQuantities] = useState({});

  const handleQuantityChange = (id, value) => {
    setQuantities((prev) => ({
      ...prev,
      [id]: Number(value),
    }));
  };

  const handleAddToCart = (item, quantity) => {
    addToCart({ ...item, quantity });
  };

  // ✅ 只顯示最近上架商品
  const sortedProducts = [...products].sort((a, b) =>
    new Date(b.createdAt) - new Date(a.createdAt)
  );

  const subtotal = cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const pointDiscount = usedPoints;
  const finalTotal = subtotal - pointDiscount;

  const handleCheckout = () => {
    onCheckout?.({
      items: cartItems,
      subtotal,
      usedPoints,
      finalTotal,
    });
  };

  return (
    <div className="content-container w-100">
      <div className="mt-3" style={{ height: "75vh", overflow: "auto" }}>
        <table className="table mx-auto text-center" style={{ width: "90%", fontSize: "1.3rem" }}>
          <thead className="table-warning sticky-top" style={{ zIndex: 1 }}>
            <tr>
              <th>商品名稱</th>
              <th>價格</th>
              <th>數量</th>
              <th>操作</th>
              <th>庫存</th>
            </tr>
          </thead>
          <tbody>
            {sortedProducts.map((item) => {
              const qty = quantities[item.id] || 1;
              return (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{Number(item.price.replace(/[^0-9.]/g, "")).toLocaleString()}</td>
                  <td>
                    <input
                      type="number"
                      min="1"
                      max={item.stock}
                      value={qty}
                      onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                      style={{ width: "70px", textAlign: "center" }}
                    />
                  </td>
                  <td>
                    <button className="add-button me-2" onClick={() => handleAddToCart(item, qty)}>
                      加入
                    </button>
                  </td>
                  <td>{item.stock}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="d-flex mt-3 mb-2 px-4 w-100">
        <button className="open-button me-3">開錢櫃</button>
        <button className="checkout-button" onClick={handleCheckout}>結帳</button>
      </div>
    </div>
  );
}