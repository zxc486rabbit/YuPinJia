import { useState } from "react";
import Cart from "./components/Cart";
import Navbar from "./components/Navbar";

export default function Home({ products =[] }) {
  const [cartItems, setCartItems] = useState([]); //購物車內的商品，預設為空

  const addToCart = (product) => {
    // setCartItems：用來更新購物車項目
    // prevItems：目前購物車裡的所有商品陣列
    setCartItems((prevItems) => {
      // 檢查是否已經有這個商品（依照 id 做判斷）
      const exist = prevItems.find((item) => item.id === product.id);
      if (exist) {
        // 如果商品已存在，使用 map 將對應商品的數量加 1
        return prevItems.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 } // 增加數量
            : item
        );
      } else {
        // 如果商品尚未存在於購物車，將新商品加入陣列，並設定數量為 1
        return [...prevItems, { ...product, quantity: 1,  unitPrice : Number(product.price.replace(/[^0-9.]/g, "")) }];
      }
    });
  };

  const updateQuantity = (id, quantity) => {
    setCartItems((items) =>
      items.map((item) =>
        item.id === id ? { ...item, quantity: quantity } : item
      )
    );
  };

  return (
    <>
      <div className="d-flex">
        <div className="col-5">
          <Cart items={cartItems} updateQuantity={updateQuantity} />
        </div>
        <div className="col">
          {/* <CardTable products={products} /> */}
          <Navbar  products={products} addToCart={addToCart}/>
        </div>
      </div>
    </>
  );
}
