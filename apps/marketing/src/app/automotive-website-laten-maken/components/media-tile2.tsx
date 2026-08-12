import type { MediaTile2Styles } from "../_styles";
import { cn } from "../../../lib/utils";
export type MediaTile2Data = {
  text: string;
  text2: string;
  href: string;
  imgSrc: string;
  srcSet: string;
  imgSrc2: string;
};
/** A media tile. */
export default function MediaTile2({ d, cids, styles }: { d: MediaTile2Data; cids: string[]; styles: MediaTile2Styles }) {
  return (
    <div data-cid={cids[0]} className="w-59 h-[419.5px] min-h-px flex relative float-left mr-5 rounded-[20px] overflow-hidden max-md:w-70 max-md:h-[31.1125rem] md:max-lg:w-72 md:max-lg:h-128 2xl:w-62.5 2xl:h-[27.775rem]" aria-hidden="true">
      <div data-cid={cids[1]} className={cn("w-59 block absolute bottom-0 min-w-0 pt-25 pb-[0.9375rem] px-[0.9375rem] max-md:w-70 md:max-lg:w-72", styles.className)} style={{ backgroundImage: "linear-gradient(var(--clr-4) 0%, var(--foreground) 100%)" }}>
        <div data-cid={cids[2]} className={cn("block", styles.className2)}>
          <span data-cid={cids[3]} className="block text-background text-[1.625rem] font-bold">
            {d.text}
          </span>
          {" "}
          <span data-cid={cids[4]} className="block text-background">
            {d.text2}
          </span>
        </div>
        {" "}
        <a data-cid={cids[5]} className="border border-solid border-background inline-block relative mt-2.5 py-1 px-[0.8rem] rounded-[5px] text-background text-[0.8125rem] font-medium leading-[1.375rem] cursor-pointer before:content-['5'] before:hidden before:absolute before:-ml-8 before:text-background before:text-[2rem] before:leading-8 before:text-left before:opacity-0 after:content-['5'] after:hidden after:absolute after:-ml-[1.6rem] after:text-background after:text-[1.625rem] after:leading-[1.625rem] after:text-left after:opacity-0" href={d.href}>
          Bekijken
        </a>
      </div>
      <div data-cid={cids[6]} className="block">
        <img data-cid={cids[7]} className={cn("hidden", styles.className3)} src={d.imgSrc} />
        <picture data-cid={cids[8]} className={cn("inline", styles.className4)}>
          {" "}
          <source data-cid={cids[9]} className={cn("inline", styles.className5)} srcSet={d.srcSet} type="image/webp" />
          {" "}
          <img data-cid={cids[10]} className={cn("w-full h-105 block max-w-full overflow-clip object-cover aspect-[9/16] 2xl:h-111", styles.className6)} src={d.imgSrc2} />
          {" "}
        </picture>
      </div>
    </div>
  );
}
