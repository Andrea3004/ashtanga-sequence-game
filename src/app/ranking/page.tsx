import { Suspense } from "react";
import type { Metadata } from "next";
import PublicRanking from "@/components/PublicRanking";

export const metadata: Metadata = {
  title: "Public Ranking | Ashtanga Sequence Game",
  description: "Game-by-game public ranking for Ashtanga Sequence Game scores.",
};

export default function RankingPage() {
  return (
    <Suspense fallback={null}>
      <PublicRanking />
    </Suspense>
  );
}
