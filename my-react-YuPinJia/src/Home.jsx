import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Cart from "./components/Cart";
import Navbar from "./components/Navbar";
import CardTable from "./components/CardTable";
import Card from "./components/Card";
import CheckoutModal from "./components/CheckoutModal";

export default function Home({ products = [] }) {
   const [activeTab, setActiveTab] = useState("熱銷排行");
  const [cartItems, setCartItems] = useState([]);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutData, setCheckoutData] = useState(null);
  const navigate = useNavigate();

  /* ---------- 加入購物車 ---------- */
  const addToCart = (product) => {
    const qty = product.quantity || 1;
    setCartItems((prev) => {
      const exist = prev.find((p) => p.id === product.id);
      if (exist) {
        return prev.map((p) =>
          p.id === product.id
            ? { ...p, quantity: p.quantity + qty }
            : p
        );
      }
      return [
        ...prev,
        {
          ...product,
          quantity: qty,
          unitPrice: Number(product.price.replace(/[^0-9.]/g, "")),
        },
      ];
    });
  };

  /* ---------- 更新數量 ---------- */
  const updateQuantity = (id, quantity) => {
    setCartItems((prev) =>
      prev.map((p) => (p.id === id ? { ...p, quantity } : p))
    );
  };

  /* ---------- CardTable 點擊「結帳」時呼叫 ---------- */
  const handleCheckout = (data) => {
    setCheckoutData(data);
    setShowCheckoutModal(true);
  };

  /* ---------- Modal 按下「確認結帳」 ---------- */
  const confirmCheckout = () => {
    setShowCheckoutModal(false);
    // 把資料帶到取貨方式頁
    navigate("/pickup", { state: checkoutData });
  };

  return (
    <>
      <div className="container-fluid">
        <div className="row">
          <div className="col-5">
            <Cart items={cartItems} updateQuantity={updateQuantity} />
          </div>

          <div className="col-7">
<Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
            {/* CardTable 多加 cartItems 與 onCheckout */}
                {activeTab === "熱銷排行" && (
              <CardTable
                products={products}
                addToCart={addToCart}
                cartItems={cartItems}
                onCheckout={handleCheckout}
              />
            )}
            {activeTab === "產品分類" && (
              <Card
                products={products}
                addToCart={addToCart}
              />
            )}
          </div>
        </div>
      </div>

      {/* 結帳確認彈窗 */}
      <CheckoutModal
        show={showCheckoutModal}
        onHide={() => setShowCheckoutModal(false)}
        data={checkoutData}
        onConfirm={confirmCheckout}
      />
    </>
  );
}
