import { GradientText } from "@/components/gradient-text";
import { cn } from "@/lib/utils";

const indianGradientColors = ["#FF671F", "#4D80E6", "#53C266"] as const;

const taglineRevealStyle = (delayMs: number): React.CSSProperties =>
  ({ "--tagline-delay": `${delayMs}ms` }) as React.CSSProperties;

const WORD_STAGGER_MS = 35;
const TAGLINE_START_MS = 60;

function wordDelay(index: number): React.CSSProperties {
  return taglineRevealStyle(TAGLINE_START_MS + index * WORD_STAGGER_MS);
}

export function HomeTagline({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "home-tagline font-instrument-sans max-w-[24rem] -ml-1.5 text-center text-[1.625rem] font-normal leading-[1.35] tracking-[-0.01em] [word-spacing:0.08em] text-[#2e2e2e] md:max-w-[28rem] md:-ml-2 md:text-[2rem] md:leading-[1.32]",
        className,
      )}
    >
      <span
        className="home-tagline-part font-serif-display italic"
        style={wordDelay(0)}
      >
        Open-source
      </span>{" "}
      <span className="home-tagline-part" style={wordDelay(1)}>
        tools
      </span>{" "}
      <span className="home-tagline-part" style={wordDelay(2)}>
        for
      </span>{" "}
      <span className="home-tagline-part" style={wordDelay(3)}>
        students
      </span>{" "}
      <span className="home-tagline-part" style={wordDelay(4)}>
        around
      </span>{" "}
      <span className="home-tagline-part" style={wordDelay(5)}>
        <GradientText
          className="font-serif-display italic"
          colors={[...indianGradientColors]}
          animate={false}
        >
          Indian
        </GradientText>
      </span>{" "}
      <span className="home-tagline-part" style={wordDelay(6)}>
        exams
      </span>
    </p>
  );
}
