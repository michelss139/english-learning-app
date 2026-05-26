import { ModalWordDetailClient } from "../_components/ModalWordDetailClient";
import { getModalWord } from "@/lib/grammar/modalVerbContent";
import { notFound } from "next/navigation";

export default function HaveToPage() {
  const word = getModalWord("have-to");
  if (!word) notFound();
  return <ModalWordDetailClient word={word} />;
}
