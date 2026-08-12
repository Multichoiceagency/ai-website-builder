import type { FeatureCardStyles } from "../_styles";
import { cn } from "../../../lib/utils";
export type FeatureCardData = {
  title: string;
  description: string;
};
/** A feature card. */
export default function FeatureCard({ d, cids, styles }: { d: FeatureCardData; cids: string[]; styles: FeatureCardStyles }) {
  return (
    <div data-cid={cids[0]} className={cn("h-[18.275rem] min-h-px block relative float-left z-2 p-[1.5625rem] rounded-[10px] col-start-[span_4] overflow-hidden bg-cover [background-position:50%_50%] bg-no-repeat max-lg:hidden 2xl:h-[15.2625rem]", styles.className)}>
      <div data-cid={cids[1]} className={cn("block relative text-left [overflow-wrap:break-word] bg-cover [background-position:50%_50%] bg-no-repeat max-lg:hidden", styles.className2)}>
        <div data-cid={cids[2]} className={cn("block relative max-lg:hidden", styles.className3)}>
          <h3 data-cid={cids[3]} className="block pb-2.5 text-[1.3125rem] font-bold leading-[1.3125rem] max-lg:hidden" data-component="heading">
            {d.title}
          </h3>
          <p data-cid={cids[4]} className="block max-lg:hidden">
            {d.description}
          </p>
        </div>
      </div>
    </div>
  );
}
