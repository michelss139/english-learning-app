# Instrukcje dla Claude — English Platform

## UI / Styling

### ⚠️ Białe przyciski na ciemnym tle — WAŻNE

W `/app` działa klasa `.app-light`, która zawiera globalny override w `globals.css`:

```css
.app-light .text-white { color: #0f172a !important; }
```

Efekt: `bg-slate-900 + text-white` = **czarny tekst na czarnym tle = niewidoczny przycisk**.

**Rozwiązanie:** Zawsze używaj klasy `btn-primary` dla ciemnych przycisków CTA:

```tsx
// ✅ DOBRZE
<button className="btn-primary">Zacznij →</button>

// ❌ ŹLE — text-white jest nadpisywane przez .app-light
<button className="bg-slate-900 text-white ...">Zacznij →</button>
```

Klasa `.btn-primary` jest zdefiniowana w `app/globals.css` i ma `color: #ffffff !important` — omija override.

---

### Paleta kolorów CEFR

| Poziom | Klasy Tailwind |
|--------|---------------|
| A1 | `bg-emerald-100 text-emerald-700` |
| A2 | `bg-teal-100 text-teal-700` |
| B1 | `bg-sky-100 text-sky-700` |
| B2 | `bg-indigo-100 text-indigo-700` |
| C1 | `bg-violet-100 text-violet-700` |
| C2 | `bg-purple-100 text-purple-700` |

Używane w `cefrColor()` w `PackTrainingClient.tsx` i w `lib/story/tenseGroups.ts`.

---

### Motywy vocab (`data-vocab-theme`)

Sekcja fiszek używa CSS variables przez `data-vocab-theme="daily|precise|mixed"`:

- `daily` → akcent różowy (`#ec4899`)
- `precise` → akcent fioletowy (`#a78bfa`)
- `mixed` → akcent zielony (`#10b981`)

---

### Klasy pomocnicze (`globals.css`)

| Klasa | Zastosowanie |
|-------|-------------|
| `.btn-primary` | Ciemny przycisk CTA z białym tekstem |
| `.tile-frame` | Karta/kafelek dashboard (slate-50, subtelna ramka, hover lift) |
| `.tile-frame-practice-cta` | Modyfikator `.tile-frame` dla wyraźnego CTA (grubsza ramka) |
| `.premium-row` | Wiersz z hover-translateX w listach |
| `.grammar-aside-item` | Element sidebara gramatyki |
| `.verb-tile` | Kafelek nieregularnego czasownika (flip na hover) |
