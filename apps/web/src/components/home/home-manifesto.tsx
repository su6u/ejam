import { HomeManifestoScrollHint } from "@/components/home/home-manifesto-scroll-hint";

export function HomeManifesto() {
  return (
    <section
      id="home-manifesto"
      aria-labelledby="home-manifesto-heading"
      className="relative z-20 -mt-52 scroll-mt-[5.5rem] md:-mt-56 md:scroll-mt-[6.25rem]"
    >
      <div className="sticky top-[5.5rem] z-20 md:top-[6.25rem]">
        <div className="flex h-52 w-full shrink-0 flex-col items-center justify-center gap-4 rounded-t-full bg-[#0a0a0a] px-6 md:h-56 md:px-10">
          <h2
            id="home-manifesto-heading"
            className="font-serif-display w-full max-w-3xl text-balance text-center text-4xl italic leading-tight tracking-[0.02em] text-white [word-spacing:0.14em] md:text-[2.5rem] lg:text-5xl"
          >
            The [Purpose]*
          </h2>
          <HomeManifestoScrollHint />
        </div>
        <div
          className="min-h-[calc(100svh-5.5rem-13rem)] bg-[#0a0a0a] md:min-h-[calc(100svh-6.25rem-14rem)]"
          aria-hidden
        />
      </div>
    </section>
  );
}
