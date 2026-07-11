import type { Metadata } from "next";
import SequenceGame from "@/components/SequenceGame";

export const metadata: Metadata = {
  title: "Full Reverse Game | Ashtanga Sequence Game",
  description: "아쉬탕가 전체 시퀀스를 역순으로 반복 학습하는 무료 게임",
};

export default function FullReversePage() {
  return <SequenceGame initialMode="full-reverse-level-select" />;
}
