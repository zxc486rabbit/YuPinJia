import Cart from "./components/Cart";
import Card from "./components/Card";


export default function Home() {
  return (
    <>
         <div className="d-flex">    
        <Cart />
        <Card />
         </div>
    </>
  )
}
