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
                    <div className=" text-center mb-3 d-flex justify-content-around align-items-center">
                      <button className="grayButton">
                        <FaRegEdit className="me-1"/>
                        暫存訂單
                      </button>
                      <button className="pinkButton">
                        {" "}
                        <FaCheckCircle className="me-1"/>
                        已保留訂單
                      </button>
                    </div>
                    {/* 會員資訊 */}
                    <div className="mx-0 px-4 fw-bold d-flex justify-content-between align-items-center">
                      <div>
                        <p className="d-flex align-items-center mb-2">
                          <FaUser className="me-1" /> 會員 : 金大發旅行社
                        </p>
                        <div className="d-flex">
                          <p className="d-flex align-items-center mb-2">
                            <FaGem className="me-1" /> VIP
                          </p>
                          <p className="d-flex align-items-center mx-3 mb-2">
                            <FaMedal className="me-1" /> 青銅
                          </p>
                          <p className="d-flex align-items-center mb-2">
                            <FaTicketAlt className="me-1" /> 點數 : 6 點
                          </p>
                        </div>
                      </div>
                      <div>
                        <button className="change-button">
                          <FaExchangeAlt className="me-1"/> 切換會員
                        </button>
                      </div>
                    </div>
                    <CartTable />
                  </div>
                  <div
                    className="w-100 mt-2"
                    style={{
                      fontSize: "1.3rem",
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
  )
}
