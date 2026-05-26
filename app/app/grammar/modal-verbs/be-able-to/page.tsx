import { ModalWordDetailClient } from "../_components/ModalWordDetailClient";
import { getModalWord } from "@/lib/grammar/modalVerbContent";
import { notFound } from "next/navigation";

export default function BeAbleToPage() {
  const word = getModalWord("be-able-to");
  if (!word) notFound();
  return <ModalWordDetailClient word={word} />;
}
