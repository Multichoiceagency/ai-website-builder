import type { MediaTile5Styles } from "../_styles";
import { cn } from "../../../lib/utils";
export type MediaTile5Data = {
  style?: string;
  text: string;
  text2: string;
  href: string;
  srcSet: string;
  imgSrc: string;
};
/** A media tile. */
export default function MediaTile5({ d, cids, styles }: { d: MediaTile5Data; cids: string[]; styles: MediaTile5Styles }) {
  return (
    <div data-cid={cids[0]} className={cn("max-md:w-70 max-md:h-[31.1125rem]", styles.className)} aria-hidden="true">
      <div data-cid={cids[1]} className={cn("max-md:w-70", styles.className2)} style={d.style}>
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
        <a data-cid={cids[5]} className={cn("before:content-['5'] before:hidden before:absolute before:-ml-8 before:text-background before:text-[2rem] before:leading-8 before:text-left before:opacity-0 after:content-['5'] after:hidden after:absolute after:-ml-[1.6rem] after:text-background after:text-[1.625rem] after:leading-[1.625rem] after:text-left after:opacity-0", styles.className6)} href={d.href}>
          Bekijken
        </a>
      </div>
      <div data-cid={cids[6]} className={styles.className7}>
        <picture data-cid={cids[7]} className={styles.className8}>
          {" "}
          <source data-cid={cids[8]} className={styles.className9} srcSet={d.srcSet} type="image/webp" />
          {" "}
          <img data-cid={cids[9]} className={cn("max-md:h-124.5", styles.className10)} src={d.imgSrc} />
          {" "}
        </picture>
      </div>
    </div>
  );
}
