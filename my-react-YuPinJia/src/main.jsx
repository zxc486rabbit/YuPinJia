import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import "./index.css";  // ✅ 引入全域 CSS
import "bootstrap/dist/css/bootstrap.min.css"; // 全域載入 Bootstrap 樣式
import "bootstrap/dist/js/bootstrap.bundle.min.js"; // 可選，僅當需要 Bootstrap JS 功能


ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
