import type { MediaTile4Styles } from "../_styles";
import { cn } from "../../../lib/utils";
export type MediaTile4Data = {
  text: string;
  text2: string;
  href: string;
  srcSet: string;
  imgSrc: string;
};
/** A media tile. */
export default function MediaTile4({ d, cids, styles }: { d: MediaTile4Data; cids: string[]; styles: MediaTile4Styles }) {
  return (
    <div data-cid={cids[0]} className="w-59 h-[419.5px] min-h-px flex relative float-left mr-5 rounded-[20px] overflow-hidden max-md:w-70 max-md:h-[31.1125rem] md:max-lg:w-72 md:max-lg:h-128 2xl:w-62.5 2xl:h-[27.775rem]" aria-hidden="true">
      <div data-cid={cids[1]} className={cn("w-59 h-[13.175rem] block absolute bottom-0 min-w-0 pt-25 pb-[0.9375rem] px-[0.9375rem] max-md:w-70 md:max-lg:w-72", styles.className)} style={{ backgroundImage: "linear-gradient(var(--clr-4) 0%, var(--foreground) 100%)" }}>
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
        <picture data-cid={cids[7]} className={styles.className3}>
          {" "}
          <source data-cid={cids[8]} className={styles.className4} srcSet={d.srcSet} type="image/webp" />
          {" "}
          <img data-cid={cids[9]} className={cn("max-md:h-124.5 md:max-lg:h-128", styles.className5)} src={d.imgSrc} />
          {" "}
        </picture>
      </div>
    </div>
  );
}
