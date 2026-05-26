import { ModalWordDetailClient } from "../_components/ModalWordDetailClient";
import { getModalWord } from "@/lib/grammar/modalVerbContent";
import { notFound } from "next/navigation";

export default function CanPage() {
  const word = getModalWord("can");
  if (!word) notFound();
  return <ModalWordDetailClient word={word} />;
}
