export type Rank = {
  label: string;
  icon: string;
  next: { label: string; daysNeeded: number } | null;
};

export function getRank(streak: number): Rank {
  if (streak >= 60) return { label: "Tytan pracy",           icon: "ti-flame",        next: null };
  if (streak >= 30) return { label: "Weteran",               icon: "ti-shield",       next: { label: "Tytan pracy",           daysNeeded: 60 - streak } };
  if (streak >= 21) return { label: "Ekspert",               icon: "ti-award",        next: { label: "Weteran",               daysNeeded: 30 - streak } };
  if (streak >= 14) return { label: "Prawdziwy profesjonał", icon: "ti-certificate",  next: { label: "Ekspert",               daysNeeded: 21 - streak } };
  if (streak >= 7)  return { label: "Zaufany pracownik",     icon: "ti-badge",        next: { label: "Prawdziwy profesjonał", daysNeeded: 14 - streak } };
  if (streak >= 3)  return { label: "Regularny pracownik",   icon: "ti-briefcase",    next: { label: "Zaufany pracownik",     daysNeeded: 7 - streak } };
  if (streak >= 1)  return { label: "Nowy w biurze",         icon: "ti-coffee",       next: { label: "Regularny pracownik",   daysNeeded: 3 - streak } };
  return                   { label: "Świeży rekrut",         icon: "ti-door-enter",   next: { label: "Nowy w biurze",         daysNeeded: 1 } };
}
