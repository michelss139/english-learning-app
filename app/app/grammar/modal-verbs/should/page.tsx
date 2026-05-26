import { ModalWordDetailClient } from "../_components/ModalWordDetailClient";
import { getModalWord } from "@/lib/grammar/modalVerbContent";
import { notFound } from "next/navigation";

export default function ShouldPage() {
  const word = getModalWord("should");
  if (!word) notFound();
  return <ModalWordDetailClient word={word} />;
}
