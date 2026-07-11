import type { Metadata } from "next";
import SequenceGame from "@/components/SequenceGame";

export const metadata: Metadata = {
  title: "Intermediate Sequence Game | Ashtanga Sequence Game",
  description: "아쉬탕가 인터미디어트 시리즈 순서를 반복 학습하는 무료 게임",
};

export default function IntermediatePage() {
  return <SequenceGame initialMode="intermediate-level-select" />;
}
