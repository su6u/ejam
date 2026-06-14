import { HomeManifestoScrollHint } from "@/components/home/home-manifesto-scroll-hint";

export function HomeManifesto() {
  return (
    <section
      id="home-manifesto"
      aria-labelledby="home-manifesto-heading"
      className="relative z-20 -mt-36 scroll-mt-[5.5rem] md:-mt-40 md:scroll-mt-[6.25rem]"
    >
      <div className="sticky top-[5.5rem] z-20 md:top-[6.25rem]">
        <div className="flex h-56 w-full shrink-0 flex-col items-center justify-center rounded-t-full bg-[#0a0a0a] px-6 md:h-60 md:px-10">
          <div className="flex w-full max-w-2xl flex-col items-center gap-2 -translate-y-9 md:-translate-y-11">
            <h2
              id="home-manifesto-heading"
              className="font-serif-display w-full text-balance text-center text-4xl italic leading-tight tracking-[0.02em] text-white [word-spacing:0.14em] md:text-[2.5rem] lg:text-5xl"
            >
              manifesto
            </h2>
            <HomeManifestoScrollHint />
          </div>
        </div>
        <div className="min-h-[calc(100svh-5.5rem-14rem)] bg-[#0a0a0a] px-5 pb-16 md:min-h-[calc(100svh-6.25rem-15rem)] md:px-10 md:pb-20">
          <div className="mx-auto -mt-10 w-full max-w-[38rem] md:-mt-12">
            <p className="whitespace-pre-line text-left font-instrument-sans text-lg leading-[1.72] tracking-[-0.015em] text-white sm:text-xl md:text-[1.375rem] md:leading-[1.68] lg:text-2xl lg:leading-[1.64]">
              {`ejam began as a personal frustration.

students needed useful tools.
instead we get paywalls,
or a trade:
your personal information
for access to something
that should never have cost you anything.

i genuinely never wanted ejam to exist.

this should have already been built
by those so-called "BIG" coaching institutes.

the funny part?

they have the data, the teams, the resources,
and yet, every year,
the same bargain:
hand over your privacy
to use a tool that should just be there.

it should not have come to this.
but it did.

this is a hobby project.
built in the open.
code, data, everything open-sourced.

there is only one tool shipped right now.
if it gets traction,
and if it helps the people around me,
i would love to keep adding more.

ejam will always be open-sourced.
built by students,
for students.`}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
