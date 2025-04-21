export default function CustomerComplain() {
  return (
    <div className="container mt-5 ms-5">
      <div className="card shadow" style={{ maxWidth: "60%" }}>
        <div className="card-body p-4">
          <h2 className="mb-4 fw-bold">客訴</h2>

          <form>
            <div className="row g-4 px-3">
              <div className="col-md-6 pe-2">
                <label htmlFor="category" className="form-label fw-bold">
                  類別
                </label>
                <select id="category" className="form-select">
                  <option value="">請選擇類別</option>
                  <option value="product">產品客訴</option>
                  <option value="service">服務問題</option>
                  <option value="delivery">配送問題</option>
                  <option value="other">其他</option>
                </select>
              </div>

              <div className="col-md-6 ps-2">
                <label htmlFor="phone" className="form-label fw-bold">
                  發票
                </label>
                <input
                  type="tel"
                  className="form-control"
                  id="phone"
                  placeholder="請輸入發票編號"
                />
              </div>

              <div className="col-12">
                <label htmlFor="address" className="form-label fw-bold">
                  原因
                </label>
                <textarea
                  type="text"
                  className="form-control"
                  id="address"
                  placeholder="請輸入原因"
                  rows="3"
                />
              </div>

              <div className="col-12">
                <label htmlFor="address" className="form-label fw-bold">
                  結果
                </label>
                <textarea
                  type="text"
                  className="form-control"
                  id="address"
                  rows="3"
                />
              </div>

              
            </div>

            <div className="text-center mt-4">
              <button type="submit" className="add-button">
                確認送出
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
