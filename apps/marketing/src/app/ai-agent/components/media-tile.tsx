import type { MediaTileStyles } from "../_styles";
import { cn } from "../../../lib/utils";
export type MediaTileData = {
  ariahidden: string;
  text: string;
  text2: string;
  href: string;
  srcSet: string;
  imgSrc: string;
  kind2?: string;
  kind?: string;
};
/** A media tile. */
export default function MediaTile({ d, cids, styles }: { d: MediaTileData; cids: string[]; styles: MediaTileStyles }) {
  return (
    <div data-cid={cids[0]} className={cn("w-67 h-[29.775rem] min-h-px flex relative float-left mr-5 rounded-[20px] overflow-hidden md:max-lg:w-81.5 md:max-lg:h-[579.5px]", styles.className)} aria-hidden={d.ariahidden}>
      <div data-cid={cids[1]} className={cn("h-[13.175rem] block absolute bottom-0 min-w-0 pt-25 pb-[0.9375rem] px-[0.9375rem]", styles.className2)} style={{ backgroundImage: "linear-gradient(var(--clr-4) 0%, var(--foreground) 100%)" }}>
        <div data-cid={cids[2]} className={cn("block", styles.className3)}>
          <span data-cid={cids[3]} className={cn("block text-background text-[1.625rem] font-bold", styles.className4)}>
            {d.text}
          </span>
          {" "}
          <span data-cid={cids[4]} className={cn("block text-background", styles.className5)}>
            {d.text2}
          </span>
        </div>
        {" "}
        <a data-cid={cids[5]} className={cn("border border-solid border-background inline-block relative mt-2.5 py-1 px-[0.8rem] rounded-[5px] text-background text-[0.8125rem] font-medium leading-[1.375rem] cursor-pointer before:content-['5'] before:hidden before:absolute before:-ml-8 before:text-background before:text-[2rem] before:leading-8 before:text-left before:opacity-0 after:content-['5'] after:hidden after:absolute after:-ml-[1.6rem] after:text-background after:text-[1.625rem] after:leading-[1.625rem] after:text-left after:opacity-0", styles.className6)} href={d.href} data-component={d.kind}>
          Bekijken
        </a>
      </div>
      <div data-cid={cids[6]} className={cn("block", styles.className7)}>
        <picture data-cid={cids[7]} className={cn("inline", styles.className8)}>
          {" "}
          <source data-cid={cids[8]} className={cn("inline", styles.className9)} srcSet={d.srcSet} type="image/webp" />
          {" "}
          <img data-cid={cids[9]} className={cn("w-full h-119 block max-w-full overflow-clip object-cover aspect-[9/16] md:max-lg:h-145", styles.className10)} src={d.imgSrc} data-component={d.kind2} />
          {" "}
        </picture>
      </div>
    </div>
  );
}
