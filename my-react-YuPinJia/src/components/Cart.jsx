import CartTable from "./CartTable";
import {
  FaGem,
  FaMedal,
  FaTicketAlt,
  FaUser,
  FaRegEdit,
  FaCheckCircle,
  FaExchangeAlt,
} from "react-icons/fa";

export default function Cart({ items, updateQuantity }) {
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  const pointDiscount = 23; // 假設固定折抵 6 元
  const finalTotal = subtotal - pointDiscount;

  return (
    <>
      {/* 購物車 區域 */}
      <div className="cart py-3">
        <div className="w-100">
          <div className=" text-center mb-3 d-flex  align-items-center mt-2">
            <div className="d-flex justify-content-center w-100">
              <button className="grayButton me-4">
                <FaRegEdit className="me-1" />
                暫存訂單
              </button>
              <button className="pinkButton">
                {" "}
                <FaCheckCircle className="me-1" />
                已保留訂單
              </button>
            </div>
          </div>

          <div style={{ fontSize: "1rem", padding: "0 15px" }}>
              <p className="d-flex align-items-center mb-0 me-4">
                <FaUser className="me-1" style={{ color: "#2f2f2f" }} /> 會員 :
                金大發旅行社
              </p>
            <div className="d-flex align-items-center">
              <p className="d-flex align-items-center mb-0">
                <FaGem className="me-1" style={{ color: "#2f2f2f" }} /> VIP
              </p>
              <p className="d-flex align-items-center mx-4 mb-0">
                <FaMedal className="me-1" style={{ color: "#2f2f2f" }} /> 青銅
              </p>
              <p className="d-flex align-items-center mb-0">
                <FaTicketAlt className="me-1" style={{ color: "#2f2f2f" }} />{" "}
                點數 : 23 點
              </p>
              <div>
                <button className="change-button ms-5 py-1">
                  <FaExchangeAlt className="me-1" /> 切換會員
                </button>
              </div>
            </div>
          </div>

          <div className="no-scrollbar mt-2">
            <CartTable items={items} updateQuantity={updateQuantity} />
          </div>
        </div>
        <div
          className="w-100 mt-auto"
          style={{
            fontSize: "1.2rem",
            fontWeight: "bold",
            lineHeight: "1.8",
          }}
        >
          <div className="d-flex justify-content-between mx-4">
            <span>商品總數</span>
            <span>{totalQuantity}</span>
          </div>
          <div className="d-flex justify-content-between mx-4">
            <span>小計</span>
            <span>${subtotal.toLocaleString()}</span>
          </div>
          <div className="d-flex justify-content-between mx-4">
            <span>點數折抵</span>
            <span style={{ color: "#C75D00" }}>-{pointDiscount}</span>
          </div>
          <hr />
          <div
            className="d-flex justify-content-between mx-4"
            style={{ color: "#A40000" }}
          >
            <span>總價</span>
            <span>${finalTotal.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </>
  );
}
