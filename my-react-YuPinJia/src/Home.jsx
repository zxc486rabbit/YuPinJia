import { useState, useEffect } from "react";
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
  const [currentMember, setCurrentMember] = useState(null); // ✅ 新增會員狀態
  const [members, setMembers] = useState([]); // ✅ 讀取所有會員
  const navigate = useNavigate();

  /* ---------- 初始化讀取會員資料 ---------- */
  useEffect(() => {
    fetch("/member.json")
      .then((res) => res.json())
      .then((data) => {
        setMembers(data);
        setCurrentMember(data[0]); // 預設第一位
      });
  }, []);

  /* ---------- 加入購物車 ---------- */
  const addToCart = (product) => {
    const qty = product.quantity || 1;
    setCartItems((prev) => {
      const exist = prev.find((p) => p.id === product.id);
      if (exist) {
        return prev.map((p) =>
          p.id === product.id ? { ...p, quantity: p.quantity + qty } : p
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

  /* ---------- 點擊結帳按鈕 ---------- */
  const handleCheckout = (data) => {
    setCheckoutData({
      ...data,
      member: currentMember, // ✅ 帶入會員資訊
    });
    setShowCheckoutModal(true);
  };

  /* ---------- 確認結帳後 ---------- */
  const confirmCheckout = () => {
    setShowCheckoutModal(false);
    navigate("/pickup", { state: checkoutData });
  };

  return (
    <>
      <div className="container-fluid">
        <div className="row">
          <div className="col-5">
            <Cart
              items={cartItems}
              updateQuantity={updateQuantity}
              currentMember={currentMember} // ✅ 傳給 Cart
              setCurrentMember={setCurrentMember}
              members={members}
              onCheckoutClick={handleCheckout}
            />
          </div>

          <div className="col-7">
            <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
            {activeTab === "熱銷排行" && (
              <CardTable
                products={products}
                addToCart={addToCart}
                cartItems={cartItems}
                onCheckout={handleCheckout}
              />
            )}
            {activeTab === "產品分類" && (
              <Card products={products} addToCart={addToCart} />
            )}
          </div>
        </div>
      </div>

      {/* ✅ 帶入會員資料進結帳視窗 */}
      <CheckoutModal
        show={showCheckoutModal}
        onHide={() => setShowCheckoutModal(false)}
        data={checkoutData}
        member={currentMember}
        onConfirm={confirmCheckout}
      />
    </>
  );
}