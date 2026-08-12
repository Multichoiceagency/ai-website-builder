import type { FeatureCardStyles } from "../_styles";
import { cn } from "../../../lib/utils";
export type FeatureCardData = {
  description: string;
  description2: string;
  title: string;
  description3: string;
};
/** A feature card. */
export default function FeatureCard({ d, cids, styles }: { d: FeatureCardData; cids: string[]; styles: FeatureCardStyles }) {
  return (
    <div data-cid={cids[0]} className={cn("w-[13.3625rem] min-h-px block relative float-left z-2 bg-cover [background-position:50%_50%] bg-no-repeat max-md:w-75 md:max-lg:w-[290.3px] 2xl:w-[14.0875rem]", styles.className)}>
      <div data-cid={cids[1]} className="h-[4.6875rem] block relative mb-7 text-center [overflow-wrap:break-word] bg-foreground bg-cover [background-position:50%_50%] bg-no-repeat max-lg:mb-7.5 2xl:mb-[29.7px]">
        <div data-cid={cids[2]} className="block relative">
          <p data-cid={cids[3]} className="block">
            {d.description}
          </p>
        </div>
      </div>
      <div data-cid={cids[4]} className="block relative mb-7 text-left [overflow-wrap:break-word] bg-cover [background-position:50%_50%] bg-no-repeat max-lg:mb-7.5 2xl:mb-[29.7px]">
        <div data-cid={cids[5]} className="block relative">
          <p data-cid={cids[6]} className="block">
            {d.description2}
          </p>
        </div>
      </div>
      <div data-cid={cids[7]} className="block relative text-left [overflow-wrap:break-word] bg-cover [background-position:50%_50%] bg-no-repeat">
        <div data-cid={cids[8]} className="block relative">
          <h3 data-cid={cids[9]} className="block pb-2.5 text-xl font-bold leading-5" data-component="heading">
            {d.title}
          </h3>
          <p data-cid={cids[10]} className="block">
            {d.description3}
          </p>
        </div>
      </div>
    </div>
  );
}
