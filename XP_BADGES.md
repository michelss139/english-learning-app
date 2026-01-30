# XP + Odznaki

## Zasady XP

- Każda ukończona sesja daje 10 XP.
- Perfekcyjna sesja (bez błędów) daje 20 XP.
- XP jest przyznawane raz dziennie per `dedupe_key` (strefa: Europe/Warsaw).

### Dedupe key

- Packi: `pack:{slug}:{direction}:{count_mode}`
- Clustery: `cluster:{slug}`
- Nieregularne: `irregular:default`

## Poziomy

Wymagane XP na poziom:

```
levelRequirement(level) = (level + 1) * 50
```

Funkcja źródłowa: `lib/xp/levels.ts`.

## Dodawanie nowej odznaki

1. Dodaj wpis w tabeli `badges` (migration).
2. Uzupełnij logikę w `lib/xp/award.ts`:
   - dodaj warunek w funkcji przyznawania (np. `awardPackShopBadge`)
   - zapisz rekord do `user_badges`
   - zwróć odznakę w `newly_awarded_badges`

## API

- `GET /api/profile/xp` – bieżące XP i poziom
- `GET /api/profile/badges` – lista aktywnych odznak z informacją o zdobyciu
- `POST /api/vocab/packs/[slug]/complete`
- `POST /api/vocab/clusters/[slug]/complete`
- `POST /api/irregular-verbs/complete`
