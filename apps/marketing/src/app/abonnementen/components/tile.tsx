export type TileData = {
  text: string;
  text2: string;
  text3: string;
  text4: string;
  text5: string;
  text6: string;
  text7: string;
};
/** A content tile. */
export default function Tile({ d, cids }: { d: TileData; cids: string[] }) {
  return (
    <tr data-cid={cids[0]} className="border-b border-solid border-b-surface-2 table-row align-middle [border-collapse:collapse]">
      <td data-cid={cids[1]} className="w-37.5 border-t border-solid border-t-surface-3 border-b border-b-surface-2 table-cell min-w-37.5 py-[1.5625rem] px-[0.9375rem] align-middle font-bold [border-collapse:collapse] 2xl:w-45">
        {d.text}
      </td>
      <td data-cid={cids[2]} className="w-37.5 border-t border-solid border-t-surface-3 border-b border-b-surface-2 table-cell min-w-37.5 py-[1.5625rem] px-[0.9375rem] align-middle text-sm leading-5 [border-collapse:collapse] 2xl:w-45">
        {d.text2}
      </td>
      <td data-cid={cids[3]} className="w-37.5 border-t border-solid border-t-surface-3 border-b border-b-surface-2 table-cell min-w-37.5 py-[1.5625rem] px-[0.9375rem] align-middle text-sm leading-5 [border-collapse:collapse] 2xl:w-45">
        {d.text3}
      </td>
      <td data-cid={cids[4]} className="w-37.5 border-t border-solid border-t-surface-3 border-b border-b-surface-2 table-cell min-w-37.5 py-[1.5625rem] px-[0.9375rem] align-middle text-sm leading-5 [border-collapse:collapse] 2xl:w-45">
        {d.text4}
      </td>
      <td data-cid={cids[5]} className="w-37.5 border-t border-solid border-t-surface-3 border-b border-b-surface-2 table-cell min-w-37.5 py-[1.5625rem] px-[0.9375rem] align-middle text-sm leading-5 [border-collapse:collapse] 2xl:w-45">
        {d.text5}
      </td>
      <td data-cid={cids[6]} className="w-37.5 border-t border-solid border-t-surface-3 border-b border-b-surface-2 table-cell min-w-37.5 py-[1.5625rem] px-[0.9375rem] align-middle text-sm leading-5 [border-collapse:collapse] 2xl:w-45">
        {d.text6}
      </td>
      <td data-cid={cids[7]} className="w-37.5 border-t border-solid border-t-surface-3 border-b border-b-surface-2 table-cell min-w-37.5 py-[1.5625rem] px-[0.9375rem] align-middle text-sm leading-5 [border-collapse:collapse] 2xl:w-45">
        {d.text7}
      </td>
    </tr>
  );
}
