import type { Tile2Styles } from "../_styles";
import { cn } from "../../../lib/utils";
export type Tile2Data = {
  label: string;
  kind?: string;
};
/** A content tile. */
export default function Tile2({ d, cids, styles }: { d: Tile2Data; cids: string[]; styles: Tile2Styles }) {
  return (
    <button data-cid={cids[0]} className={cn("w-full p-4 rounded-[3px] font-medium text-center cursor-pointer [pointer-events:all]", styles.className)} data-component={d.kind}>
      {d.label}
    </button>
  );
}
