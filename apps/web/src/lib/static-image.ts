export type StaticImageSource = {
  webp: string;
  fallback: string;
  blurDataURL?: string;
};

export type LoopIllustrationSource = {
  poster: StaticImageSource;
  webm: string;
};

export const EXAM_LOGO_SIZE = 36;
export const EXAM_LOGO_ASSET_PX = 72;

export const EXAM_LOGOS = {
  "jee-main": {
    webp: "/exams/jee_main.webp",
    fallback: "/exams/jee_main.webp",
  },
  "jee-advanced": {
    webp: "/exams/jee_adv.webp",
    fallback: "/exams/jee_adv.webp",
  },
  bitsat: {
    webp: "/exams/bitsat.webp",
    fallback: "/exams/bitsat.webp",
  },
} as const satisfies Record<string, StaticImageSource>;

export const PREDICTOR_ILLUSTRATIONS = {
  empty: {
    poster: {
      webp: "/media/empty.webp",
      fallback: "/media/empty.webp",
      blurDataURL:
        "data:image/webp;base64,UklGRj4AAABXRUJQVlA4IDIAAACwAQCdASoIAAgABUB8JaQAAlyw3yaAAP7tINuXpV0+hi1qkoqdMW8YTeEOTjwsRAAAAA==",
    },
    webm: "/media/empty.webm",
  },
  error: {
    poster: {
      webp: "/media/404.webp",
      fallback: "/media/404.webp",
      blurDataURL:
        "data:image/webp;base64,UklGRj4AAABXRUJQVlA4IDIAAACwAQCdASoIAAgABUB8JaQAAlyw3yaAAP7tINuXpV0+hi1qkoXq4Atf3QF0X7v2AAAAAA==",
    },
    webm: "/media/404.webm",
  },
} as const satisfies Record<string, LoopIllustrationSource>;

export const PREDICTOR_CARD_ART = {
  webp: "/media/predict.webp",
  fallback: "/media/predict.webp",
} as const satisfies StaticImageSource;

export const COLLEGE_PREDICTOR_LCP_PRELOAD =
  PREDICTOR_ILLUSTRATIONS.empty.poster.webp;
