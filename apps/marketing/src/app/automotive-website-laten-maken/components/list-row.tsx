import type { ListRowStyles } from "../_styles";
import { cn } from "../../../lib/utils";
export type ListRowData = {
  kind?: string;
  href?: string;
  label: string;
};
/** A list row. */
export default function ListRow({ d, cids, styles }: { d: ListRowData; cids: string[]; styles: ListRowStyles }) {
  return (
    <li data-cid={cids[0]} className={cn("flex relative mt-2 px-[0.6875rem] items-center text-sm leading-3.5", styles.className)}>
      <a data-cid={cids[1]} className={cn("block relative pb-2 text-color-010 [overflow-wrap:break-word]", styles.className2)} data-component={d.kind} href={d.href}>
        {d.label}
      </a>
    </li>
  );
}
