import QuantityControl from "./QuantityControl";

export default function CartTable() {
  return (
    <table className="table my-2" style={{ fontSize: "1.2rem" }}>
      <thead className="table-light" style={{ borderTop: "1px solid #c5c6c7" }}>
        <tr>
          <th scope="col">名稱</th>
          <th scope="col">數量</th>
          <th scope="col">小計</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>御品家大禮包</td>
          <td className="quantity-control">
            <QuantityControl defaultValue={2} />
          </td>
          <td>900</td>
        </tr>
        <tr>
          <td>花生酥不起(小)</td>
          <td className="quantity-control">
            <QuantityControl defaultValue={5} />
          </td>
          <td>600</td>
        </tr>
      </tbody>
    </table>
  )
}
