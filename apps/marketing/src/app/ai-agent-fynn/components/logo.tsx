export type LogoData = {
  imgSrc: string;
};
/** A logo. */
export default function Logo({ d, cids }: { d: LogoData; cids: string[] }) {
  return (
    <div data-cid={cids[0]} className="w-[168.3px] flex relative mr-7.5 justify-center self-start shrink-0 text-[0.875rem] bg-cover [background-position:50%_50%] bg-no-repeat max-md:w-[8.5625rem] md:max-lg:w-[164.3px] 2xl:w-[209.5px]">
      <div data-cid={cids[1]} className="block relative grow bg-cover [background-position:50%_50%] bg-no-repeat">
        <div data-cid={cids[2]} className="flex flex-col shrink-0">
          <div data-cid={cids[3]} className="block relative z-10 overflow-hidden leading-0 text-center">
            <span data-cid={cids[4]} className="inline-block relative z-10 max-w-full overflow-hidden">
              <img data-cid={cids[5]} className="w-29 h-[4.0625rem] block relative max-w-full max-h-[4.0625rem] overflow-clip aspect-[auto_1920/1080]" data-component="image" alt="" height="1080" src={d.imgSrc} width="1920" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
