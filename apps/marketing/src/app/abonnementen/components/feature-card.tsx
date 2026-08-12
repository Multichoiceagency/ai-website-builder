import type { FeatureCardStyles } from "../_styles";
import { cn } from "../../../lib/utils";
export type FeatureCardData = {
  title: string;
  title2: string;
  description: string;
  description2: string;
  text: string;
  text2: string;
  text3: string;
  text4: string;
  href: string;
};
/** A feature card. */
export default function FeatureCard({ d, cids, styles }: { d: FeatureCardData; cids: string[]; styles: FeatureCardStyles }) {
  return (
    <div data-cid={cids[0]} className={cn("w-[16.375rem] h-[22.5375rem] min-h-px block relative float-left z-2 p-5 rounded-[10px] overflow-hidden bg-color-003 bg-cover [background-position:50%_50%] bg-no-repeat max-md:w-[337.5px] md:max-lg:w-[290.3px] 2xl:w-[318.5px]", styles.className)}>
      <div data-cid={cids[1]} className="block relative mb-2.5 text-left [overflow-wrap:break-word] bg-cover [background-position:50%_50%] bg-no-repeat">
        <div data-cid={cids[2]} className="block relative">
          <h3 data-cid={cids[3]} className={cn("block pb-2.5 text-[1.3125rem] font-bold leading-[1.3125rem]", styles.className2)} data-component="heading">
            {d.title}
            <br data-cid={cids[4]} className="inline" />
            {d.title2}
          </h3>
        </div>
      </div>
      <div data-cid={cids[5]} className="inline-block relative text-[0.75rem] font-bold text-left [overflow-wrap:break-word] bg-cover [background-position:50%_50%] bg-no-repeat">
        <div data-cid={cids[6]} className="block relative">
          <p data-cid={cids[7]} className="block">
            Eenmalig
          </p>
        </div>
      </div>
      <div data-cid={cids[8]} className="inline-block relative text-[0.75rem] font-bold text-left [overflow-wrap:break-word] bg-cover [background-position:50%_50%] bg-no-repeat">
        <div data-cid={cids[9]} className="block relative">
          <p data-cid={cids[10]} className="block">
            Maandelijks
          </p>
        </div>
      </div>
      <div data-cid={cids[11]} className="inline-block relative text-left [overflow-wrap:break-word] bg-cover [background-position:50%_50%] bg-no-repeat">
        <div data-cid={cids[12]} className="block relative">
          <p data-cid={cids[13]} className="block">
            {d.description}
          </p>
        </div>
      </div>
      <div data-cid={cids[14]} className="inline-block relative text-left [overflow-wrap:break-word] bg-cover [background-position:50%_50%] bg-no-repeat">
        <div data-cid={cids[15]} className="block relative">
          <p data-cid={cids[16]} className="block">
            {d.description2}
          </p>
        </div>
      </div>
      <div data-cid={cids[17]} className="block relative mt-5 mb-2.5 text-left [overflow-wrap:break-word] bg-cover [background-position:50%_50%] bg-no-repeat">
        <div data-cid={cids[18]} className="block relative">
          <ul data-cid={cids[19]} className="block pb-4 pl-px leading-6.5 [list-style-type:none] list-outside">
            <li data-cid={cids[20]} className="border-b border-solid border-b-color-008 list-item mb-[0.3125rem] pb-[0.3125rem] text-[0.9375rem] leading-5">
              {d.text}
            </li>
            <li data-cid={cids[21]} className="border-b border-solid border-b-color-008 list-item mb-[0.3125rem] pb-[0.3125rem] text-[0.9375rem] leading-5">
              {d.text2}
            </li>
            <li data-cid={cids[22]} className="border-b border-solid border-b-color-008 list-item mb-[0.3125rem] pb-[0.3125rem] text-[0.9375rem] leading-5">
              {d.text3}
            </li>
            <li data-cid={cids[23]} className="list-item text-[0.9375rem] leading-5">
              {d.text4}
            </li>
          </ul>
        </div>
      </div>
      <div data-cid={cids[24]} className="block relative mr-2.5 mb-2.5 bg-cover [background-position:50%_50%] bg-no-repeat">
        <a data-cid={cids[25]} className="border border-solid border-primary inline-block relative py-1 px-3.5 rounded-[5px] text-background text-sm font-medium leading-[1.5rem] bg-primary bg-cover [background-position:50%_50%] bg-no-repeat cursor-pointer before:content-['5'] before:hidden before:absolute before:-ml-8 before:text-background before:text-[2rem] before:leading-8 before:opacity-0 after:content-['5'] after:hidden after:absolute after:-ml-[1.6rem] after:text-background after:text-[1.625rem] after:leading-[1.625rem] after:opacity-0" data-component="button" href={d.href}>
          Meer informatie
        </a>
      </div>
    </div>
  );
}
