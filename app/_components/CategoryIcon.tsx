/**
 * Colorful category icons for the vocab pack catalog.
 * Each icon is self-contained with its own background colour.
 *
 * Usage:
 *   <CategoryIcon section="Emocje i nastrój" size={32} />
 */

"use client";

import React from "react";

// ─── Per-category colour palette ─────────────────────────────────────────────

type Palette = { bg: string; stroke: string };

const PALETTES: Record<string, Palette> = {
  "Emocje i nastrój":       { bg: "#fce7f3", stroke: "#db2777" },
  "Emocje":                 { bg: "#fce7f3", stroke: "#db2777" },
  "Charakter i osobowość":  { bg: "#fef3c7", stroke: "#d97706" },
  "Ludzie i komunikacja":   { bg: "#fef3c7", stroke: "#d97706" },
  "Dom i życie codzienne":  { bg: "#dbeafe", stroke: "#2563eb" },
  "Dom":                    { bg: "#dbeafe", stroke: "#2563eb" },
  "Jedzenie i smaki":       { bg: "#ffedd5", stroke: "#ea580c" },
  "Jedzenie i zakupy":      { bg: "#ffedd5", stroke: "#ea580c" },
  "Zdrowie i ciało":        { bg: "#fee2e2", stroke: "#dc2626" },
  "Ciało i zdrowie":        { bg: "#fee2e2", stroke: "#dc2626" },
  "Pogoda":                 { bg: "#e0f2fe", stroke: "#0284c7" },
  "Czas i pogoda":          { bg: "#e0f2fe", stroke: "#0284c7" },
  "Przyroda i otoczenie":   { bg: "#dcfce7", stroke: "#16a34a" },
  "Ogród":                  { bg: "#dcfce7", stroke: "#16a34a" },
  "Podróże i transport":    { bg: "#ccfbf1", stroke: "#0f766e" },
  "Podróże i miejsca":      { bg: "#ccfbf1", stroke: "#0f766e" },
  "Transport":              { bg: "#ccfbf1", stroke: "#0f766e" },
  "Komunikacja i inne":     { bg: "#ede9fe", stroke: "#7c3aed" },
  "Komunikacja":            { bg: "#ede9fe", stroke: "#7c3aed" },
  "Podstawowe czynności":   { bg: "#f1f5f9", stroke: "#475569" },
  "Podstawowe opisowe":     { bg: "#f1f5f9", stroke: "#475569" },
  "Praca i finanse":        { bg: "#d1fae5", stroke: "#059669" },
  "Praca i nauka":          { bg: "#d1fae5", stroke: "#059669" },
  "Pieniądze":              { bg: "#d1fae5", stroke: "#059669" },
  "Biznes i umowy":         { bg: "#d1fae5", stroke: "#059669" },
  "Technologia i edukacja": { bg: "#e0e7ff", stroke: "#4338ca" },
  "Technologia":            { bg: "#e0e7ff", stroke: "#4338ca" },
  "Trudności i problemy":   { bg: "#fff7ed", stroke: "#c2410c" },
  "Zaawansowane czynności": { bg: "#f5f3ff", stroke: "#7c3aed" },
  "Zaawansowane opisowe":   { bg: "#f5f3ff", stroke: "#7c3aed" },
  "Nieregularne":           { bg: "#f0fdf4", stroke: "#166534" },
  // Legacy English
  "Home & Life":            { bg: "#dbeafe", stroke: "#2563eb" },
  "Food & Shopping":        { bg: "#ffedd5", stroke: "#ea580c" },
  "People & Communication": { bg: "#fef3c7", stroke: "#d97706" },
  "Travel & Transport":     { bg: "#ccfbf1", stroke: "#0f766e" },
  "Work & Study":           { bg: "#d1fae5", stroke: "#059669" },
  "Health & Body":          { bg: "#fee2e2", stroke: "#dc2626" },
  "Technology":             { bg: "#e0e7ff", stroke: "#4338ca" },
  "Time & Weather":         { bg: "#e0f2fe", stroke: "#0284c7" },
  "Body & Health":          { bg: "#fee2e2", stroke: "#dc2626" },
  "Business & Contracts":   { bg: "#d1fae5", stroke: "#059669" },
  "Sports":                 { bg: "#fef3c7", stroke: "#d97706" },
  "Specialist Topics":      { bg: "#f5f3ff", stroke: "#7c3aed" },
};

const FALLBACK: Palette = { bg: "#f8fafc", stroke: "#64748b" };

// ─── SVG icon paths ────────────────────────────────────────────────────────────
// All icons: 24×24 viewBox, no fill, stroke-linecap/join="round"

type IconProps = { c: string }; // c = stroke colour

function IEmocje({ c }: IconProps) {
  return <>
    <circle cx="12" cy="12" r="8.5" stroke={c} strokeWidth="2.2" fill="none"/>
    <path d="M8.5 14.5 Q12 17.5 15.5 14.5" stroke={c} strokeWidth="2.2" fill="none" strokeLinecap="round"/>
    <circle cx="9.5" cy="10.5" r="1.3" fill={c}/>
    <circle cx="14.5" cy="10.5" r="1.3" fill={c}/>
  </>;
}

function ICharakter({ c }: IconProps) {
  return <>
    <circle cx="10" cy="7.5" r="3.5" stroke={c} strokeWidth="2.2" fill="none"/>
    <path d="M3.5 21c0-3.5 2.9-6 6.5-6s6.5 2.5 6.5 6" stroke={c} strokeWidth="2.2" fill="none" strokeLinecap="round"/>
    {/* heart top-right */}
    <path d="M18.5 5c.5-1 2.2-1 2.2.8s-2.2 2.7-2.2 2.7-2.2-1-2.2-2.7c0-1.8 1.7-1.8 2.2-.8z" fill={c}/>
  </>;
}

function IDom({ c }: IconProps) {
  return <>
    <path d="M3 12 L12 4 L21 12" stroke={c} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M5 11 v9.5 h14 V11" stroke={c} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="9.5" y="15" width="5" height="5.5" rx="1" stroke={c} strokeWidth="1.8" fill="none"/>
  </>;
}

function IJedzenie({ c }: IconProps) {
  return <>
    {/* fork */}
    <path d="M8 2v4m0 0v14M6.5 3.5h3" stroke={c} strokeWidth="2.2" fill="none" strokeLinecap="round"/>
    <path d="M8 6a2 2 0 0 0 0-3" stroke={c} strokeWidth="0" fill="none"/>
    {/* knife */}
    <path d="M16 2 v4 Q16 8.5 18 8.5 V20" stroke={c} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  </>;
}

function IZdrowie({ c }: IconProps) {
  return <>
    <path d="M20.4 4.6a5.2 5.2 0 0 0-7.4 0L12 5.7l-1-1.1a5.2 5.2 0 0 0-7.4 7.4L12 20.7l8.4-8.7a5.2 5.2 0 0 0 0-7.4z"
      stroke={c} strokeWidth="2.2" fill={c} fillOpacity="0.15"/>
  </>;
}

function IPogoda({ c }: IconProps) {
  return <>
    <circle cx="12" cy="12" r="4.5" stroke={c} strokeWidth="2.2" fill="none"/>
    <path d="M12 3v1.5M12 19.5V21M4.5 4.5l1 1M18.5 18.5l1 1M3 12h1.5M19.5 12H21M4.5 19.5l1-1M18.5 5.5l1-1"
      stroke={c} strokeWidth="2.2" strokeLinecap="round"/>
  </>;
}

function IPrzyroda({ c }: IconProps) {
  return <>
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10z"
      stroke={c} strokeWidth="2.2" fill={c} fillOpacity="0.15" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 21c0-3 1.9-5.4 5.1-6C9.5 14.5 12 13 13 12" stroke={c} strokeWidth="2.2" strokeLinecap="round"/>
  </>;
}

function IPodroze({ c }: IconProps) {
  return <>
    <circle cx="12" cy="12" r="9" stroke={c} strokeWidth="2.2" fill="none"/>
    <path d="M12 3a14 14 0 0 1 4 9 14 14 0 0 1-4 9 14 14 0 0 1-4-9 14 14 0 0 1 4-9z"
      stroke={c} strokeWidth="2.2" fill="none"/>
    <path d="M3 12h18" stroke={c} strokeWidth="2.2" strokeLinecap="round"/>
  </>;
}

function IKomunikacja({ c }: IconProps) {
  return <>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
      stroke={c} strokeWidth="2.2" fill={c} fillOpacity="0.12" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8 9.5h8M8 13h5" stroke={c} strokeWidth="2" strokeLinecap="round"/>
  </>;
}

function IPodstawowe({ c }: IconProps) {
  return <>
    <rect x="3" y="4" width="18" height="4" rx="1.5" stroke={c} strokeWidth="2.2" fill={c} fillOpacity="0.2"/>
    <rect x="3" y="10" width="18" height="4" rx="1.5" stroke={c} strokeWidth="2.2" fill={c} fillOpacity="0.12"/>
    <rect x="3" y="16" width="11" height="4" rx="1.5" stroke={c} strokeWidth="2.2" fill="none"/>
  </>;
}

function IPraca({ c }: IconProps) {
  return <>
    <rect x="2" y="7" width="20" height="14" rx="2" stroke={c} strokeWidth="2.2" fill={c} fillOpacity="0.12"/>
    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" stroke={c} strokeWidth="2.2" fill="none" strokeLinecap="round"/>
    <path d="M12 12v5M9.5 14.5h5" stroke={c} strokeWidth="2.2" strokeLinecap="round"/>
  </>;
}

function ITechnologia({ c }: IconProps) {
  return <>
    <rect x="2" y="3" width="20" height="13" rx="2" stroke={c} strokeWidth="2.2" fill={c} fillOpacity="0.12"/>
    <path d="M8 21h8M12 16v5" stroke={c} strokeWidth="2.2" strokeLinecap="round"/>
    <path d="M8 9l2 2 4-4" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </>;
}

function ITrudnosci({ c }: IconProps) {
  return <>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"
      stroke={c} strokeWidth="2.2" fill={c} fillOpacity="0.18"
      strokeLinecap="round" strokeLinejoin="round"/>
  </>;
}

function IZaawansowane({ c }: IconProps) {
  return <>
    {/* 4-point sparkle */}
    <path d="M12 2 L13.8 10.2 L22 12 L13.8 13.8 L12 22 L10.2 13.8 L2 12 L10.2 10.2 Z"
      stroke={c} strokeWidth="2" fill={c} fillOpacity="0.2"
      strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="12" r="2" fill={c}/>
  </>;
}

function INieregularne({ c }: IconProps) {
  return <>
    <path d="M23 4v6h-6" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M1 20v-6h6" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3.5 9A9 9 0 0 1 18 5.6L23 10" stroke={c} strokeWidth="2.2" strokeLinecap="round"/>
    <path d="M20.5 15A9 9 0 0 1 6 18.4L1 14" stroke={c} strokeWidth="2.2" strokeLinecap="round"/>
  </>;
}

function IDefault({ c }: IconProps) {
  return <>
    <circle cx="12" cy="12" r="9" stroke={c} strokeWidth="2.2" fill="none"/>
    <path d="M12 8v4.5M12 15.5v1" stroke={c} strokeWidth="2.2" strokeLinecap="round"/>
  </>;
}

// ─── Section → Icon renderer mapping ──────────────────────────────────────────

type IconRenderer = (props: IconProps) => React.ReactElement;

const ICON_MAP: Record<string, IconRenderer> = {
  "Emocje i nastrój":       IEmocje,
  "Emocje":                 IEmocje,
  "Charakter i osobowość":  ICharakter,
  "Ludzie i komunikacja":   ICharakter,
  "Dom i życie codzienne":  IDom,
  "Dom":                    IDom,
  "Jedzenie i smaki":       IJedzenie,
  "Jedzenie i zakupy":      IJedzenie,
  "Zdrowie i ciało":        IZdrowie,
  "Ciało i zdrowie":        IZdrowie,
  "Pogoda":                 IPogoda,
  "Czas i pogoda":          IPogoda,
  "Przyroda i otoczenie":   IPrzyroda,
  "Ogród":                  IPrzyroda,
  "Podróże i transport":    IPodroze,
  "Podróże i miejsca":      IPodroze,
  "Transport":              IPodroze,
  "Komunikacja i inne":     IKomunikacja,
  "Komunikacja":            IKomunikacja,
  "Podstawowe czynności":   IPodstawowe,
  "Podstawowe opisowe":     IPodstawowe,
  "Praca i finanse":        IPraca,
  "Praca i nauka":          IPraca,
  "Pieniądze":              IPraca,
  "Biznes i umowy":         IPraca,
  "Technologia i edukacja": ITechnologia,
  "Technologia":            ITechnologia,
  "Trudności i problemy":   ITrudnosci,
  "Zaawansowane czynności": IZaawansowane,
  "Zaawansowane opisowe":   IZaawansowane,
  "Nieregularne":           INieregularne,
  // Legacy English
  "Home & Life":            IDom,
  "Food & Shopping":        IJedzenie,
  "People & Communication": IKomunikacja,
  "Travel & Transport":     IPodroze,
  "Work & Study":           IPraca,
  "Health & Body":          IZdrowie,
  "Technology":             ITechnologia,
  "Time & Weather":         IPogoda,
  "Body & Health":          IZdrowie,
  "Business & Contracts":   IPraca,
  "Sports":                 ICharakter,
  "Specialist Topics":      IZaawansowane,
};

// ─── Public component ─────────────────────────────────────────────────────────

type Props = {
  section: string;
  /** Overall size of the icon (including background). Default 32. */
  size?: number;
  className?: string;
};

export default function CategoryIcon({ section, size = 32, className }: Props) {
  const palette = PALETTES[section] ?? FALLBACK;
  const IconContent = ICON_MAP[section] ?? IDefault;
  const r = Math.round(size * 0.28); // border-radius: ~28% of size

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${className ?? ""}`}
      style={{
        width: size,
        height: size,
        borderRadius: r,
        backgroundColor: palette.bg,
      }}
      aria-hidden="true"
    >
      <svg
        width={Math.round(size * 0.6)}
        height={Math.round(size * 0.6)}
        viewBox="0 0 24 24"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <IconContent c={palette.stroke} />
      </svg>
    </span>
  );
}
