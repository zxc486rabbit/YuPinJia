import { useState } from "react";

/**
 * CardTable 產品清單表格元件
 *
 * props
 * ── products   : 商品資料陣列
 * ── addToCart  : 加入購物車回呼函式
 */
export default function CardTable({
  products = [],
  addToCart,
  cartItems = [],
  onCheckout,
   usedPoints = 0, // ✅ 新增的 props，從父層傳入
}) {
  // 用來記錄「商品 id ➜ 使用者輸入的數量」的物件
  const [quantities, setQuantities] = useState({});

  // 處理數量輸入框變動
  const handleQuantityChange = (id, value) => {
    setQuantities((prev) => ({
      ...prev,
      [id]: Number(value), // 轉成數值，避免變成字串
    }));
  };

  // 點擊「加入」按鈕時，將商品與數量加入購物車
  const handleAddToCart = (item, quantity) => {
    addToCart({ ...item, quantity });
  };

  // ✅ 計算總數、總價、折扣後金額
  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  const pointDiscount = usedPoints; // 點數折抵
  const finalTotal = subtotal - pointDiscount;

  const handleCheckout = () => {
    if (onCheckout) {
      onCheckout({
        items: cartItems,
        totalQuantity,
        subtotal,
        pointDiscount,
        finalTotal,
        usedPoints,  
      });
    }
  };

  return (
    <>
      {/* 主要內容區域 */}
      <div className="content-container w-100">
        {/* 商品清單表格（右側） */}
        <div className="mt-3" style={{ height: "75vh", overflow: "auto" }}>
          <table
            className="table mx-auto text-center"
            style={{
              fontSize: "1.3rem",
              border: "1px solid #D7D7D7",
              width: "90%",
            }}
          >
            {/* 表頭固定在最上方 */}
            <thead
              className="table-info"
              style={{
                borderTop: "1px solid #c5c6c7",
                position: "sticky",
                top: 0,
                background: "#d1ecf1",
                zIndex: 1,
              }}
            >
              <tr>
                <th scope="col">商品名稱</th>
                <th scope="col">價格</th>
                <th scope="col">數量</th>
                <th scope="col">操作</th>
                <th scope="col">庫存</th>
              </tr>
            </thead>

            <tbody>
              {products.length > 0 ? (
                products.map((item) => {
                  const currentQty = quantities[item.id] || 1; // 取得目前輸入的數量

                  return (
                    <tr key={item.id}>
                      {/* 商品名稱 */}
                      <td>{item.name}</td>

                      {/* 價格格式化 */}
                      <td className="text-nowrap">
                        {Number(
                          item.price.replace(/[^0-9.]/g, "")
                        ).toLocaleString()}
                      </td>

                      {/* 數量輸入框 */}
                      <td>
                        <input
                          type="number"
                          min="1"
                          max={item.stock}
                          value={currentQty}
                          onChange={(e) =>
                            handleQuantityChange(item.id, e.target.value)
                          }
                          onFocus={(e) => {
                            if (e.target.value) e.target.value = "";
                          }}
                          onBlur={(e) => {
                            if (!e.target.value) {
                              handleQuantityChange(item.id, 1);
                            }
                          }}
                          style={{ width: "70px", textAlign: "center" }}
                        />
                      </td>

                      {/* 加入購物車按鈕 */}
                      <td>
                        <button
                          onClick={() => handleAddToCart(item, currentQty)}
                          className="add-button me-2"
                        >
                          加入
                        </button>
                      </td>

                      {/* 庫存顯示 */}
                      <td>{item.stock}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="12">無資料</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 底部操作按鈕 */}
        <div className="d-flex mt-3 mb-2 px-4 w-100">
          <button className="open-button me-3">開錢櫃</button>
          <button className="checkout-button" onClick={handleCheckout}>
            結帳
          </button>
        </div>
      </div>
    </>
  );
}
