import type { TrainingDisplayCard } from "@/lib/suggestions/trainingDisplayCards";

/** Gdy API nie zwraca sugestii — te same opcje co wcześniej w pływającym widżecie „Co trenować”. */
export const FALLBACK_TRAINING_CARDS: TrainingDisplayCard[] = [
  {
    title: "Szybka sesja",
    description: "Kilka pytań z gotowego zestawu",
    href: "/app/vocab/pack/shop?limit=5&direction=pl-en&autostart=1",
  },
  {
    title: "Typowe błędy",
    description: "Popraw najczęstsze pomyłki",
    href: "/app/vocab/clusters",
  },
  {
    title: "Czasowniki nieregularne",
    description: "Przećwicz najtrudniejsze formy",
    href: "/app/irregular-verbs/train",
  },
];
