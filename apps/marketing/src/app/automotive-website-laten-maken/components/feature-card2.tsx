export type FeatureCard2Data = {
  title: string;
  description: string;
};
/** A feature card. */
export default function FeatureCard2({ d, cids }: { d: FeatureCard2Data; cids: string[] }) {
  return (
    <div data-cid={cids[0]} className="h-[10.375rem] min-h-px block relative float-left z-2 col-start-[span_4] bg-background bg-cover [background-position:50%_50%] bg-no-repeat max-md:h-[12.075rem] max-lg:mb-5 max-lg:[grid-column-start:initial] md:max-lg:h-[6.975rem]">
      <div data-cid={cids[1]} className="h-full block relative text-left [overflow-wrap:break-word] bg-cover [background-position:50%_50%] bg-no-repeat">
        <div data-cid={cids[2]} className="h-full block relative">
          <h3 data-cid={cids[3]} className="block pb-2.5 text-xl font-bold leading-5" data-component="heading">
            {d.title}
          </h3>
          <p data-cid={cids[4]} className="block">
            {d.description}
          </p>
        </div>
      </div>
    </div>
  );
}
