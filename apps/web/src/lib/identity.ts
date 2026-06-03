export type AppIdentity = {
  logoSrc: string;
  logoWidth: number;
  logoHeight: number;
  homeHref: string;
  homeAriaLabel: string;
  /** When set, the tool header shows Docs instead of Sponsor. */
  docsHref?: string;
};

export const ejamIdentity: AppIdentity = {
  logoSrc: "/identity/logo.svg",
  logoWidth: 116,
  logoHeight: 92,
  homeHref: "/",
  homeAriaLabel: "Ejam home",
};

export const collegePredictorIdentity: AppIdentity = {
  logoSrc: "/identity/p-logo.svg",
  logoWidth: 612,
  logoHeight: 94,
  homeHref: "/",
  homeAriaLabel: "All tools",
  docsHref:
    "https://github.com/su6u/ejam/blob/main/docs/college-predictor/README.md",
};
