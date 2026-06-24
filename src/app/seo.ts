export const siteConfig = {
  name: "Ashtanga Sequence Game",
  koreanName: "아쉬탕가 요가 시퀀스 게임",
  title: "Ashtanga Sequence Game | 아쉬탕가 요가 시퀀스 게임",
  description:
    "아쉬탕가 요가 프라이머리 시리즈 순서와 산스크리트 아사나 이름을 게임으로 학습하는 무료 수련 앱",
  socialDescription: "프라이머리 시리즈 순서를 게임으로 학습하세요",
  url: "https://ashtanga-sequence-game.vercel.app",
  image: "/logo.png",
  socialImage: "/og-image.png",
  themeColor: "#070711",
  keywords: [
    "아쉬탕가 요가",
    "아쉬탕가 시퀀스",
    "프라이머리 시리즈",
    "산스크리트 아사나",
    "Mysore",
    "Ashtanga Yoga",
    "Ashtanga Sequence",
    "Ashtanga Sequence Game",
    "Ashtanga Primary Series",
    "Primary Series Training",
    "Learn Ashtanga Sequence",
    "Sanskrit Asana Names",
    "Mysore Practice",
    "Yoga Sequence",
    "Yoga Sequence Game",
    "Yoga Game",
    "Yoga Training",
  ],
} as const;

export const publicPages = [
  {
    path: "/",
    changeFrequency: "weekly",
    priority: 1,
  },
] as const;

export function absoluteUrl(path = "/") {
  return new URL(path, siteConfig.url).toString();
}
