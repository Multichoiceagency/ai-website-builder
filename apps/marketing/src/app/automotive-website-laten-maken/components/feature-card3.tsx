import type { FeatureCard3Styles } from "../_styles";
import { cn } from "../../../lib/utils";
export type FeatureCard3Data = {
  title: string;
  description: string;
};
/** A feature card. */
export default function FeatureCard3({ d, cids, styles }: { d: FeatureCard3Data; cids: string[]; styles: FeatureCard3Styles }) {
  return (
    <div data-cid={cids[0]} className={cn("block relative text-left [overflow-wrap:break-word] cursor-pointer", styles.className)}>
      <div data-cid={cids[1]} className="block relative">
        <h3 data-cid={cids[2]} className="block pb-2.5 text-xl font-bold leading-5" data-component="heading">
          {d.title}
        </h3>
        <p data-cid={cids[3]} className="block">
          {d.description}
        </p>
      </div>
    </div>
  );
}
