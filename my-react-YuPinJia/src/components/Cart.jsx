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

export default function Home() {
  return (
    <>
      {/* 購物車 區域 */}
      <div className="cart py-3">
        <div
          className="w-100"
          style={{ height: "80vh", borderBottom: "1px solid #E2E2E2" }}
        >
          <div className=" text-center mb-3 d-flex justify-content-around  align-items-center mt-2">
            <div className="d-flex">
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

          <div style={{ fontSize: "1.2rem" }}>
            <div className="d-flex align-items-center justify-content-center">
              <p className="d-flex align-items-center mb-0 me-4">
                <FaUser className="me-1" style={{ color: "#2f2f2f" }} /> 會員 :
                金大發旅行社
              </p>
              <p className="d-flex align-items-center mb-0">
                <FaGem className="me-1" style={{ color: "#2f2f2f" }} /> VIP
              </p>
              <p className="d-flex align-items-center mx-4 mb-0">
                <FaMedal className="me-1" style={{ color: "#2f2f2f" }} /> 青銅
              </p>
              <p className="d-flex align-items-center mb-0">
                <FaTicketAlt className="me-1" style={{ color: "#2f2f2f" }} />{" "}
                點數 : 6 點
              </p>
              <div>
                <button className="change-button ms-5 py-1">
                  <FaExchangeAlt className="me-1" /> 切換會員
                </button>
              </div>
            </div>
          </div>

          <CartTable />
        </div>
        <div
          className="w-100 mt-2"
          style={{
            fontSize: "1.4rem",
            fontWeight: "bold",
            lineHeight: "1.8",
          }}
        >
          <div className="d-flex justify-content-between mx-4">
            <span>商品總數</span>
            <span>7</span>
          </div>
          <div className="d-flex justify-content-between mx-4">
            <span>小計</span>
            <span>$888</span>
          </div>
          <div className="d-flex justify-content-between mx-4">
            <span>點數折抵</span>
            <span style={{ color: "#C75D00" }}>-6</span>
          </div>
          <hr />
          <div
            className="d-flex justify-content-between mx-4"
            style={{ color: "#A40000" }}
          >
            <span>總價</span>
            <span>$674</span>
          </div>
        </div>
      </div>
    </>
  );
}
