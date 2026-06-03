import { GradientText } from "@/components/gradient-text";
import { cn } from "@/lib/utils";

const indianGradientColors = ["#FF671F", "#4D80E6", "#53C266"] as const;

export function HomeTagline({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "home-tagline home-enter-item font-instrument-sans max-w-[24rem] -ml-1.5 text-center text-[1.625rem] font-normal leading-[1.35] tracking-[-0.01em] [word-spacing:0.08em] text-[#2e2e2e] md:max-w-[28rem] md:-ml-2 md:text-[2rem] md:leading-[1.32]",
        className,
      )}
      style={{ animationDelay: "80ms" }}
    >
      <span className="font-serif-display italic">Open-source</span>
      {" tools for students around "}
      <GradientText
        className="font-serif-display italic"
        colors={[...indianGradientColors]}
        animate={false}
      >
        Indian
      </GradientText>
      {" exams"}
    </p>
  );
}
