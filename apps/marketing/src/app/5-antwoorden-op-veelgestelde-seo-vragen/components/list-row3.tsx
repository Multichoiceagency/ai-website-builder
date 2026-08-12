import type { ListRow3Styles } from "../_styles";
import { cn } from "../../../lib/utils";
export type ListRow3Data = {
  ariadisabled?: string;
  text: string;
};
/** A list row. */
export default function ListRow3({ d, cids, styles }: { d: ListRow3Data; cids: string[]; styles: ListRow3Styles }) {
  return (
    <li data-cid={cids[0]} className={cn("flex mr-3.5 items-center text-sm leading-[1.3125rem] [pointer-events:all]", styles.className)}>
      <label data-cid={cids[1]} className={cn("flex relative items-center gap-[0.4375rem] [pointer-events:all]", styles.className2)} aria-checked="true" aria-disabled={d.ariadisabled} role="checkbox">
        {"  "}
        <span data-cid={cids[2]} className={cn("box-content w-[33.5px] h-[17.7px] border-2 border-solid block relative max-w-[33.5px] rounded-xl [pointer-events:all] before:content-[''] before:block before:absolute before:inset-y-px before:right-[1.05rem] before:left-px before:w-4 before:h-4 before:transform-[matrix(1,0,0,1,15.75,0)] before:origin-[7.875px_7.875px] before:rounded-tl-[50%] after:content-[''] after:block after:absolute after:inset-y-px after:right-[1.05rem] after:left-px after:z-1 after:w-4 after:h-4 after:transform-[matrix(1,0,0,1,15.75,0)] after:origin-[7.875px_7.875px]", styles.className3)} />
        {" "}
        <span data-cid={cids[3]} className="block text-base font-medium leading-6 [pointer-events:all]">
          {d.text}
        </span>
        {" "}
      </label>
      {" "}
    </li>
  );
}
