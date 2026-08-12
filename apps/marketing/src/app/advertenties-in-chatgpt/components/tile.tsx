export type TileData = {
  id: string;
  text: string;
  description: string;
};
/** A content tile. */
export default function Tile({ d, cids }: { d: TileData; cids: string[] }) {
  return (
    <div data-cid={cids[0]} className="block mb-5 p-2.5 rounded-[10px] bg-background" id={d.id}>
      <strong data-cid={cids[1]} className="inline font-bold">
        {d.text}
      </strong>
      <p data-cid={cids[2]} className="block">
        {d.description}
      </p>
    </div>
  );
}
