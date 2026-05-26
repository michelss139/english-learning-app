import { ModalWordDetailClient } from "../_components/ModalWordDetailClient";
import { getModalWord } from "@/lib/grammar/modalVerbContent";
import { notFound } from "next/navigation";

export default function CouldPage() {
  const word = getModalWord("could");
  if (!word) notFound();
  return <ModalWordDetailClient word={word} />;
}
