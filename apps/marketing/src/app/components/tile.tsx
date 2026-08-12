import type { TileStyles } from "../_styles";
import { cn } from "../../lib/utils";
export type TileData = {
  label: string;
  kind?: string;
};
/** A content tile. */
export default function Tile({ d, cids, styles }: { d: TileData; cids: string[]; styles: TileStyles }) {
  return (
    <button data-cid={cids[0]} className={cn("w-full p-4 rounded-[3px] font-medium text-center cursor-pointer [pointer-events:all]", styles.className)} data-component={d.kind}>
      {d.label}
    </button>
  );
}
