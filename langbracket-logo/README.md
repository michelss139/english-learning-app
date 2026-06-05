# LANGBracket — Logo Assets

## Pliki

| Plik | Zastosowanie |
|------|-------------|
| `langbracket-logo-light.svg` | Nagłówek strony, jasne tło |
| `langbracket-logo-dark.svg`  | Nagłówek strony, ciemne tło |
| `langbracket-icon.svg`       | Favicon źródłowy (512×512) |
| `Logo.tsx`                   | Komponent React/Next.js |

---

## Użycie komponentu React

```tsx
import { Logo } from '@/components/Logo'

// Navbar — jasny motyw
<Logo size="md" variant="light" />

// Navbar — ciemny motyw
<Logo size="md" variant="dark" />

// Z tagline
<Logo size="lg" variant="light" showTagline />

// Tylko ikona (np. mobile sidebar zwinięty)
<Logo size="sm" iconOnly />
```

### Rozmiary
- `sm` — 32px wysokości (mobile nav, sidebar)
- `md` — 48px wysokości (desktop nav — domyślny)
- `lg` — 64px wysokości (hero, splash screen)

---

## Favicon — instrukcja dla Claude Code

1. Skopiuj `langbracket-icon.svg` do `/public/`
2. Dodaj do `app/layout.tsx`:

```tsx
export const metadata = {
  icons: {
    icon: '/langbracket-icon.svg',
    apple: '/langbracket-icon.svg',
  },
}
```

3. Opcjonalnie wygeneruj PNG przez: https://squoosh.app lub `sharp` w Node.js:

```js
// scripts/generate-icons.mjs
import sharp from 'sharp'

const sizes = [16, 32, 48, 180, 192, 512]
for (const size of sizes) {
  await sharp('public/langbracket-icon.svg')
    .resize(size, size)
    .png()
    .toFile(`public/icons/icon-${size}.png`)
}
```

---

## Kolory

| Token | Hex | Zastosowanie |
|-------|-----|-------------|
| Brand Blue (light) | `#178CF2` | Symbol + Bracket wordmark na jasnym tle |
| Brand Blue (dark)  | `#60A5FA` | Symbol + Bracket wordmark na ciemnym tle |
| LANG bold          | `#0F172A` (light) / `#FFFFFF` (dark) | Część LANG w wordmarku |
| Tagline            | `#94A3B8` (light) / `#475569` (dark) | Podtytuł |
