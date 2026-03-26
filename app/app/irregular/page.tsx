import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Short URL alias → irregular training (forwards query e.g. assignmentId). */
export default async function IrregularShortcutPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  for (const [key, raw] of Object.entries(sp)) {
    if (typeof raw === "string") {
      q.set(key, raw);
    } else if (Array.isArray(raw)) {
      raw.forEach((v) => q.append(key, v));
    }
  }
  const suffix = q.toString();
  redirect(`/app/irregular-verbs/train${suffix ? `?${suffix}` : ""}`);
}
