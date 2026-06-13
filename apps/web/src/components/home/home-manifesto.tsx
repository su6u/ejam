export function HomeManifesto() {
  return (
    <section
      id="home-manifesto"
      aria-labelledby="home-manifesto-heading"
      className="home-manifesto relative z-20 -mt-52 scroll-mt-[5.5rem] md:-mt-56 md:scroll-mt-[6.25rem]"
    >
      <h2 id="home-manifesto-heading" className="sr-only">
        Manifesto
      </h2>
      <div className="sticky top-[5.5rem] z-20 md:top-[6.25rem]">
        <div className="home-manifesto__cap h-52 shrink-0 rounded-t-full bg-[#0a0a0a] md:h-56" />
        <div className="home-manifesto__body min-h-[calc(100svh-5.5rem-13rem)] scroll-smooth bg-[#0a0a0a] md:min-h-[calc(100svh-6.25rem-14rem)]" />
      </div>
    </section>
  );
}
