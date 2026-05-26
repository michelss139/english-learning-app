import { ModalWordDetailClient } from "../_components/ModalWordDetailClient";
import { getModalWord } from "@/lib/grammar/modalVerbContent";
import { notFound } from "next/navigation";

export default function MayPage() {
  const word = getModalWord("may");
  if (!word) notFound();
  return <ModalWordDetailClient word={word} />;
}
