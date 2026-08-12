import type { MediaTileStyles } from "../_styles";
import { cn } from "../../../lib/utils";
export type MediaTileData = {
  ariahidden: string;
  style?: string;
  text: string;
  text2: string;
  href: string;
  srcSet: string;
  kind2?: string;
  imgSrc: string;
  kind?: string;
};
/** A media tile. */
export default function MediaTile({ d, cids, styles }: { d: MediaTileData; cids: string[]; styles: MediaTileStyles }) {
  return (
    <div data-cid={cids[0]} className={cn("2xl:w-82.5 2xl:h-[586.7px]", styles.className)} aria-hidden={d.ariahidden}>
      <div data-cid={cids[1]} className={styles.className2} style={d.style}>
        <div data-cid={cids[2]} className={styles.className3}>
          <span data-cid={cids[3]} className={styles.className4}>
            {d.text}
          </span>
          {" "}
          <span data-cid={cids[4]} className={styles.className5}>
            {d.text2}
          </span>
        </div>
        {" "}
        <a data-cid={cids[5]} className={cn("before:content-['5'] before:hidden before:absolute before:-ml-8 before:text-background before:text-[2rem] before:leading-8 before:text-left before:opacity-0 after:content-['5'] after:hidden after:absolute after:-ml-[1.6rem] after:text-background after:text-[1.625rem] after:leading-[1.625rem] after:text-left after:opacity-0", styles.className6)} href={d.href} data-component={d.kind}>
          Bekijken
        </a>
      </div>
      <div data-cid={cids[6]} className={styles.className7}>
        <picture data-cid={cids[7]} className={styles.className8}>
          {" "}
          <source data-cid={cids[8]} className={styles.className9} srcSet={d.srcSet} type="image/webp" />
          {" "}
          <img data-cid={cids[9]} className={cn("2xl:h-[36.6875rem]", styles.className10)} data-component={d.kind2} src={d.imgSrc} />
          {" "}
        </picture>
      </div>
    </div>
  );
}
