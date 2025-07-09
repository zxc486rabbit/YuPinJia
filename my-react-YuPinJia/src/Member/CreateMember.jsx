import { useState } from "react";
import { FaUserPlus } from 'react-icons/fa'

export default function CreateMember() {

    const [emailAccount, setEmailAccount] = useState('') // 定義 email 前半部（帳號）的 state
    const [emailDomain, setEmailDomain] = useState('gmail.com') // 定義 email 後半部的預設網域（下拉選單值）
    const [customDomain, setCustomDomain] = useState('') // 定義當使用者選擇「其他...」時要輸入的自訂網域
    const [useCustomDomain, setUseCustomDomain] = useState(false) // 判斷是否使用自訂網域輸入框（true = 顯示輸入框, false = 顯示下拉選單）
  
    // 處理使用者選擇網域變化的函式
    const handleDomainChange = (e) => {
      const value = e.target.value

      // 若選到「其他...」，顯示自訂網域輸入框
      if (value === 'custom') {
        setUseCustomDomain(true) // 開啟自訂欄位模式
        setEmailDomain('') // 清空下拉選單值
      } else {
        setUseCustomDomain(false)
        setEmailDomain(value) // 設定為選取的網域
      }
    }

    // 表單送出處理函式
    const handleSubmit = (e) => {
      e.preventDefault()
       // 組合完整 email：帳號 + @ + 網域（依據選擇或自訂）
      const finalEmail = `${emailAccount}@${useCustomDomain ? customDomain : emailDomain}`
      console.log('最終信箱：', finalEmail)
      // 你可以把 finalEmail 傳給後端或加入其他表單資料
    }

  return (
    <div className="container mt-5 ps-5 ms-0">
      <div className="card shadow rounded-4" style={{maxWidth:"60%"}}>
        <div className="card-body p-4">
          <h1 className="mb-4 fw-bold">
            新增會員
          </h1>

          <form onSubmit={handleSubmit}>
            <div className="row g-4 px-3">
              <div className="col-md-6 pe-2">
                <label htmlFor="name" className="form-label fw-bold">姓名</label>
                <input type="text" className="form-control rounded-3" id="name" placeholder="請輸入姓名" />
              </div>

              <div className="col-md-6 ps-2">
                <label htmlFor="phone" className="form-label fw-bold">連絡電話</label>
                <input type="tel" className="form-control rounded-3" id="phone" placeholder="請輸入電話" />
              </div>

              <div className="col-md-6 pe-2">
                <label htmlFor="birthday" className="form-label fw-bold">生日</label>
                <input type="date" className="form-control rounded-3" id="birthday" />
              </div>

              <div className="col-md-6 ps-2">
                <label htmlFor="carrier" className="form-label fw-bold">載具</label>
                <input type="text" className="form-control rounded-3" id="carrier" placeholder="請輸入載具代碼" />
              </div>

              <div className="col-md-12">
                <label className="form-label fw-bold">電子郵件</label>
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="帳號"
                    value={emailAccount}
                    onChange={(e) => setEmailAccount(e.target.value)}
                    required
                  />
                  <span className="input-group-text" >@</span>
                  {!useCustomDomain ? (
                    <select
                      className="form-select"
                      value={emailDomain}
                      onChange={handleDomainChange}
                      required
                    >
                      <option value="gmail.com">gmail.com</option>
                      <option value="yahoo.com.tw">yahoo.com.tw</option>
                      <option value="hotmail.com">hotmail.com</option>
                      <option value="outlook.com">outlook.com</option>
                      <option value="custom">其他...</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="form-control"
                      placeholder="請輸入 (例如 myMail.com)"
                      value={customDomain}
                      onChange={(e) => setCustomDomain(e.target.value)}
                      required
                    />
                  )}
                </div>
              </div>

              <div className="col-12">
                <label htmlFor="address" className="form-label fw-bold">地址</label>
                <input type="text" className="form-control rounded-3" id="address" placeholder="請輸入地址" />
              </div>

              <div className="col-md-4">
                <label htmlFor="referrer" className="form-label fw-bold">推薦人</label>
                <input type="text" className="form-control rounded-3" id="referrer" placeholder="請輸入推薦人" />
              </div>
            </div>

            <div className="text-center mt-4">
              <button type="submit" className="add-button">
                <FaUserPlus className="me-2" />
                建立
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}