import { useState } from "react";
import { FaUserPlus } from "react-icons/fa";
import axios from "axios";
import Swal from "sweetalert2";

export default function CreateMember() {
  const [memberForm, setMemberForm] = useState({
    fullName: "",
    birthday: "",
    email: "",
    contactPhone: "",
    carrier: "",
    contactAddress: "",
    referredBy: "",
  });

  // 表單共用 handler
  const handleMemberChange = (field, value) => {
    setMemberForm((prev) => ({ ...prev, [field]: value }));
  };

  // 送出
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const memberData = {
        memberNo: `M-${Date.now()}`,
        ...memberForm,
        memberLevel: 0,
        totalSpent: 0,
        rewardPoints: 0,
        accountBalance: 0,
        status: 0,
        memberType: 0, // 一般會員（0=會員, 1=導遊, 2=廠商）
        isDistributor: false, // 一般會員為 false
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const res = await axios.post(
        "https://yupinjia.hyjr.com.tw/api/api/t_Member",
        memberData
      );

      console.log("建立會員回傳資料:", res.data);
      Swal.fire("成功", "會員已建立！", "success");
    } catch (err) {
      console.error("建立失敗：", err.response?.data || err);
      Swal.fire("錯誤", "建立失敗，請稍後再試", "error");
    }
  };

  return (
    <div className="container">
      <div
        className="card shadow rounded-4 col-md-6 me-auto"
        style={{
          background: "#fff",
          padding: "20px 20px",
          borderRadius: "15px",
          border: "1px solid #e0e0e0",
        }}
      >
        <div className="card-body">
         <h2 className="mb-4 fw-bold fs-3">
            <FaUserPlus className="me-2" />
            新增會員
          </h2> 
          <form onSubmit={handleSubmit}>
            <h5 className="fw-bold">會員基本資料</h5>
            <div>
              <label className="form-label fw-bold">姓名</label>
              <input
                type="text"
                className="form-control rounded-3"
                value={memberForm.fullName}
                onChange={(e) => handleMemberChange("fullName", e.target.value)}
                required
              />
            </div>
            <div>
              <label className="form-label fw-bold">生日</label>
              <input
                type="date"
                className="form-control rounded-3"
                value={memberForm.birthday}
                onChange={(e) => handleMemberChange("birthday", e.target.value)}
                required
              />
            </div>
            <div>
              <label className="form-label fw-bold">Email</label>
              <input
                type="email"
                className="form-control rounded-3"
                value={memberForm.email}
                onChange={(e) => handleMemberChange("email", e.target.value)}
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
                onChange={(e) => handleMemberChange("carrier", e.target.value)}
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
