import { ModalWordDetailClient } from "../_components/ModalWordDetailClient";
import { getModalWord } from "@/lib/grammar/modalVerbContent";
import { notFound } from "next/navigation";

export default function MightPage() {
  const word = getModalWord("might");
  if (!word) notFound();
  return <ModalWordDetailClient word={word} />;
}
