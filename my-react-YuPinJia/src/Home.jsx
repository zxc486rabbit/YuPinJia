import Cart from "./components/Cart";
import Card from "./components/Card";
import CardTable from "./components/CardTable";

export default function Home({ products }) {
  return (
    <>
      <div className="d-flex">
        <div className="col-5">
          <Cart />
        </div>
        <div className="col">
          <CardTable products={products} />
        </div>
      </div>
    </>
  );
}
