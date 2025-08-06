import { useState } from "react";
import { FaUserPlus } from "react-icons/fa";
import axios from "axios";
import Swal from "sweetalert2";

export default function CreateMember() {
  // ===== 基本資料 =====
  const [memberType, setMemberType] = useState(0); // 0=一般會員, 1=導遊, 2=廠商
  const [memberForm, setMemberForm] = useState({
    fullName: "",
    birthday: "",
    email: "",
    contactPhone: "",
    carrier: "",
    contactAddress: "",
    referredBy: "",
  });

  // ===== 經銷資料 =====
  const [distributorForm, setDistributorForm] = useState({
    store: "",
    companyName: "",
    contactPerson: "",
    contactPhone: "",
    taxID: "",
    creditLimit: 0,
    discountRate: 0,
    cashbackRate: 0,
    cashbackPoint: 0,
    accountAmount: 0,
    notificationDay: 0,
    repaymentDay: 0,
    allowSMS: false,
    paymentMethod: "",
    bankName: "",
    bankAccount: "",
    bankAccountHolder: "",
    allowCredit: false,
    autoUpgrade: false,
    issueInvoice: false,
    freeShipping: false,
    pickupMethod: 0,
    referralCode: "",
    status: 0,
  });

  // 表單共用 handler
  const handleMemberChange = (field, value) => {
    setMemberForm((prev) => ({ ...prev, [field]: value }));
  };
  const handleDistributorChange = (field, value) => {
    setDistributorForm((prev) => ({ ...prev, [field]: value }));
  };

  // 送出
  const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    // 1. 建立會員
    const memberData = {
      memberNo: `M-${Date.now()}`,
      ...memberForm,
      memberLevel: 0,
      totalSpent: 0,
      rewardPoints: 0,
      accountBalance: 0,
      status: 0,
      memberType,
      isDistributor: memberType === 1 || memberType === 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const memberRes = await axios.post(
      "https://yupinjia.hyjr.com.tw/api/api/t_Member",
      memberData
    );

    // ✅ 先檢查回傳資料
    console.log("建立會員回傳資料:", memberRes.data);

    // 2. 如果是導遊或廠商，建立經銷商
    if (memberType === 1 || memberType === 2) {
      const distributorData = {
        distributorNo: `D-${Date.now()}`,
        memberId: memberRes.data.id,
        t_Member: memberRes.data, // ✅ 傳完整會員物件
        buyerType: memberType,
        ...distributorForm,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      console.log("送出的 distributorData:", distributorData);

      await axios.post(
        "https://yupinjia.hyjr.com.tw/api/api/t_Distributor",
        distributorData
      );
    }

    Swal.fire("成功", "會員已建立！", "success");
  } catch (err) {
    console.error("建立失敗：", err.response?.data || err);
    Swal.fire("錯誤", "建立失敗，請稍後再試", "error");
  }
};

  return (
    <div className="container mt-1">
      <div
        className={`card shadow rounded-4 ${memberType === 0 ? "col-md-6 mx-auto" : ""}`}
        style={{
          background: "#fff",
          padding: "20px 20px",
          borderRadius: "15px",
          border: "1px solid #e0e0e0",
        }}
      >
        <div className="card-body">
          {/* <h2 className="mb-4 fw-bold">
            <FaUserPlus className="me-2" />
            新增會員
          </h2> */}

          <form onSubmit={handleSubmit}>
            <div className="row">
              {/* 左邊：會員表單 */}
  <div
  className={
    memberType === 1 || memberType === 2
      ? "col-md-6 pe-4 border-end"
      : "col-12 pe-4"
  }
>
              
                <h5 className="fw-bold">會員基本資料</h5>
                <div>
                  <label className="form-label fw-bold">姓名</label>
                  <input
                    type="text"
                    className="form-control rounded-3"
                    value={memberForm.fullName}
                    onChange={(e) =>
                      handleMemberChange("fullName", e.target.value)
                    }
                    required
                  />
                </div>
                <div>
                  <label className="form-label fw-bold">生日</label>
                  <input
                    type="date"
                    className="form-control rounded-3"
                    value={memberForm.birthday}
                    onChange={(e) =>
                      handleMemberChange("birthday", e.target.value)
                    }
                    required
                  />
                </div>
                <div>
                  <label className="form-label fw-bold">Email</label>
                  <input
                    type="email"
                    className="form-control rounded-3"
                    value={memberForm.email}
                    onChange={(e) =>
                      handleMemberChange("email", e.target.value)
                    }
                    required
                  />
                </div>
                <div>
                  <label className="form-label fw-bold">電話</label>
                  <input
                    type="tel"
                    className="form-control rounded-3"
                    value={memberForm.contactPhone}
                    onChange={(e) =>
                      handleMemberChange("contactPhone", e.target.value)
                    }
                    required
                  />
                </div>
                <div>
                  <label className="form-label fw-bold">載具</label>
                  <input
                    type="text"
                    className="form-control rounded-3"
                    value={memberForm.carrier}
                    onChange={(e) =>
                      handleMemberChange("carrier", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="form-label fw-bold">地址</label>
                  <input
                    type="text"
                    className="form-control rounded-3"
                    value={memberForm.contactAddress}
                    onChange={(e) =>
                      handleMemberChange("contactAddress", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="form-label fw-bold">推薦人</label>
                  <input
                    type="text"
                    className="form-control rounded-3"
                    value={memberForm.referredBy}
                    onChange={(e) =>
                      handleMemberChange("referredBy", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="form-label fw-bold">會員類型</label>
                  <select
                    className="form-select rounded-3"
                    value={memberType}
                    onChange={(e) => setMemberType(parseInt(e.target.value))}
                  >
                    <option value={0}>一般會員</option>
                    <option value={1}>導遊</option>
                    <option value={2}>廠商</option>
                  </select>
                </div>
              </div>

              {/* ===== 右側（僅導遊/廠商顯示） ===== */}
              {memberType === 1 || memberType === 2 ? (
                <div className="col-md-6 ps-4">
                  <h5 className="fw-bold">經銷商資料</h5>
                  <div>
                    <label className="form-label fw-bold">店鋪</label>
                    <input
                      type="text"
                      className="form-control rounded-3"
                      value={distributorForm.store}
                      onChange={(e) =>
                        handleDistributorChange("store", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label className="form-label fw-bold">公司名稱</label>
                    <input
                      type="text"
                      className="form-control rounded-3"
                      value={distributorForm.companyName}
                      onChange={(e) =>
                        handleDistributorChange("companyName", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label className="form-label fw-bold">聯絡人</label>
                    <input
                      type="text"
                      className="form-control rounded-3"
                      value={distributorForm.contactPerson}
                      onChange={(e) =>
                        handleDistributorChange("contactPerson", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label className="form-label fw-bold">聯絡電話</label>
                    <input
                      type="text"
                      className="form-control rounded-3"
                      value={distributorForm.contactPhone}
                      onChange={(e) =>
                        handleDistributorChange("contactPhone", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label className="form-label fw-bold">統一編號</label>
                    <input
                      type="text"
                      className="form-control rounded-3"
                      value={distributorForm.taxID}
                      onChange={(e) =>
                        handleDistributorChange("taxID", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label className="form-label fw-bold">銀行名稱</label>
                    <input
                      type="text"
                      className="form-control rounded-3"
                      value={distributorForm.bankName}
                      onChange={(e) =>
                        handleDistributorChange("bankName", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label className="form-label fw-bold">銀行帳號</label>
                    <input
                      type="text"
                      className="form-control rounded-3"
                      value={distributorForm.bankAccount}
                      onChange={(e) =>
                        handleDistributorChange("bankAccount", e.target.value)
                      }
                    />
                  </div>
                  <div>
  <label className="form-label fw-bold">銀行帳號持有人</label>
  <input
    type="text"
    className="form-control rounded-3"
    value={distributorForm.bankAccountHolder}
    onChange={(e) =>
      handleDistributorChange("bankAccountHolder", e.target.value)
    }
    required
  />
</div>
                </div>
              ) : null}
            </div>

            <div className="mt-4 text-center">
              <button className="btn btn-success px-4 py-2 rounded-3">
                <FaUserPlus className="me-2" />
                建立會員
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}