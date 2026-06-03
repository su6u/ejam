export type ToolCatalogEntry = {
  id: string;
  href: string;
  title: string;
  description: string;
  examLogo?: string;
  examLabel?: string;
  status: "live" | "soon";
};

export type ToolCatalogGroup = {
  id: string;
  label: string;
  tools: readonly ToolCatalogEntry[];
};

export const TOOL_CATALOG_GROUPS: readonly ToolCatalogGroup[] = [
  {
    id: "engineering",
    label: "Engineering/Tools",
    tools: [
      {
        id: "college-predictor",
        href: "/college-predictor",
        title: "College Predictor",
        description:
          "Counselling rank and profile → colleges and branches from JoSAA, CSAB, and JEE Advanced cutoffs.",
        examLogo: "/exams/jee_main.svg",
        examLabel: "JEE",
        status: "live",
      },
      {
        id: "jee-marks-calculator",
        href: "#",
        title: "JEE Marks Calculator",
        description: "Raw marks to normalized score across JEE Main papers and sessions.",
        examLogo: "/exams/jee_main.svg",
        examLabel: "JEE",
        status: "soon",
      },
      {
        id: "branch-finder",
        href: "#",
        title: "Branch Finder",
        description: "Placeholder for side-by-side folder layout testing.",
        examLogo: "/exams/jee_adv.svg",
        examLabel: "JEE",
        status: "soon",
      },
    ],
  },
  {
    id: "medical",
    label: "Medical/Tools",
    tools: [
      {
        id: "neet-college-predictor",
        href: "#",
        title: "NEET College Predictor",
        description:
          "Counselling rank and profile → medical colleges from NEET UG cutoffs.",
        examLabel: "NEET",
        status: "soon",
      },
    ],
  },
] as const;
