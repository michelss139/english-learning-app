import { ModalWordDetailClient } from "../_components/ModalWordDetailClient";
import { getModalWord } from "@/lib/grammar/modalVerbContent";
import { notFound } from "next/navigation";

export default function MustPage() {
  const word = getModalWord("must");
  if (!word) notFound();
  return <ModalWordDetailClient word={word} />;
}
