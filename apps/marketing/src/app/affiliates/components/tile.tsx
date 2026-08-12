export type TileData = {
  text: string;
  text2: string;
};
/** A content tile. */
export default function Tile({ d, cids }: { d: TileData; cids: string[] }) {
  return (
    <tr data-cid={cids[0]} className="table-row align-middle [border-collapse:collapse]">
      <td data-cid={cids[1]} className="border-t border-solid border-t-background table-cell py-1.5 px-6 align-middle [border-collapse:collapse]">
        {d.text}
      </td>
      <td data-cid={cids[2]} className="border-t border-solid border-t-background table-cell py-1.5 px-6 align-middle [border-collapse:collapse]">
        {d.text2}
      </td>
    </tr>
  );
}
