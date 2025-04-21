export default function Setting() {
  return (
    <div className="container mt-5 ms-5">
      <div className="card shadow" style={{ maxWidth: "40%" }}>
        <div className="card-body p-4">
          <h2 className="mb-4 fw-bold">密碼變更</h2>

          <form>
            <div className="row g-4 px-3">
              <div className="col-md-12">
                <label htmlFor="phone" className="form-label fw-bold">
                  姓名
                </label>
                <input
                  type="tel"
                  className="form-control"
                  id="phone"
                  defaultValue="周杰倫"
                  disabled
                />
              </div>

              <div className="col-md-12">
                <label htmlFor="phone" className="form-label fw-bold">
                  帳號
                </label>
                <input
                  type="tel"
                  className="form-control"
                  id="phone"
                  defaultValue="Jay11820"
                  disabled
                />
              </div>

              <div className="col-md-12">
                <label htmlFor="phone" className="form-label fw-bold">
                  原密碼
                </label>
                <input
                  type="tel"
                  className="form-control"
                  id="phone"
                  placeholder="請輸入原密碼"
                />
              </div>

              <div className="col-md-12">
                <label htmlFor="phone" className="form-label fw-bold">
                  新密碼
                </label>
                <input
                  type="tel"
                  className="form-control"
                  id="phone"
                  placeholder="請輸入欲變更之密碼"
                />
              </div>

              <div className="col-md-12">
                <label htmlFor="phone" className="form-label fw-bold">
                  確認密碼
                </label>
                <input
                  type="tel"
                  className="form-control"
                  id="phone"
                  placeholder="再次確認新密碼"
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
