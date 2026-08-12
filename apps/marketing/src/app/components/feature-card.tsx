import type { FeatureCardStyles } from "../_styles";
import { cn } from "../../lib/utils";
export type FeatureCardData = {
  title: string;
  description: string;
};
/** A feature card. */
export default function FeatureCard({ d, cids, styles }: { d: FeatureCardData; cids: string[]; styles: FeatureCardStyles }) {
  return (
    <div data-cid={cids[0]} className={cn("block relative p-5 rounded-[10px] overflow-hidden text-left [overflow-wrap:break-word] cursor-pointer", styles.className)}>
      <div data-cid={cids[1]} className={cn("block relative", styles.className2)}>
        <h3 data-cid={cids[2]} className="block pb-2.5 text-[1.3125rem] font-bold leading-[1.3125rem]" data-component="heading">
          {d.title}
        </h3>
        <p data-cid={cids[3]} className="block">
          {d.description}
        </p>
      </div>
    </div>
  );
}
