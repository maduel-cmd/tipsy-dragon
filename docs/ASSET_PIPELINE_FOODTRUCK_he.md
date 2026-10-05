# צינור נכסים ריאליסטיים · Food Truck / Bar

## סגנון יצירה (Prompts)

סגנון אחיד: Photorealistic, Commercial Food Photography, 4k, Isolated on pure white background.

דוגמאות לפי קטגוריה — ראו בקשת המוצר (המבורגרים, גבינות, אורז, בוקר, סטייקים).

## חיתוך והטמעה

1. גיליונות מקור: `public/assets/foodtruck_sheets/`
2. סקריפט חיתוך + הסרת רקע: `scripts/extract-food-realism.py`
3. פלט:
   - `public/assets/items/prepared/*.webp` (מנות מוגמרות, 512×512)
   - `public/assets/items/sides/*.webp` (תוספות/בר, 512×512)
4. מיפוי: `public/assets/assets.json` → מפתח `sprites`
5. קטלוג משחק: `src/game/catalog.ts` + מנות מורחבות ב־`src/game/extendedMenu.ts` (`src/config/menuItems.ts` כ־alias)
6. גיליון מורחב: `public/assets/foodtruck_sheets/extended_food_grid.jpg` → `scripts/extract-extended-food.py`
7. סביבות: `public/assets/environments/{id}.webp` + `mobile/` + `icons/` (אייקונים מהרקע — לא emoji)
8. לוחות ישנים: `archive/legacy-sprites/` (לא בבילד)

## QA Loop

שמות אחידים (גם לטייקון האחות):

```bash
npm test
npm run qa:assets
npm run qa:environments
npm run qa:animations
npm run typecheck
npm run build

# חי — HEAD לכל ספרייט בקטלוג
QA_LIVE_URL=https://traillink-foodtruck-bar.netlify.app npm run qa:live
# או tipsy-dragon.netlify.app

# Playwright (אופציונלי; דורש @playwright/test)
PLAYWRIGHT_BASE_URL=http://127.0.0.1:5180 npm run qa:environments:e2e
PLAYWRIGHT_BASE_URL=http://127.0.0.1:5180 npm run qa:animations:e2e
```

### כללי anti-placeholder

1. כל `PRODUCT` חייב `sprite` + קובץ תחת `items/prepared|sides` (≥256px meta).
2. `ProductArt` / `CharacterAvatar` — emoji רק ב־DEV עם באנר אדום.
3. בורר סביבות — `iconAsset` בלבד (לא decor emoji).
4. `public/assets/sprites/` — רק `cursor_neon` + `overlay_lights`.

תיקון ואיטרציה: נכס 404 → עדכון `assets.json` / חיתוך מחדש → בנייה → QA חוזר עד 100%.

## פרומו

- `public/promo/` + `docs/promo/` — ≥3 צילומים ממותגים + `og.jpg`
- `index.html` — `og:image` → `/promo/og.jpg`
- פסקת store HE+EN ב־README

## הערת רזולוציית סביבות (T8)

מקורות נוכחיים ~1024×572. גרסאות `mobile/` (720w) קיימות. שדרוג אמיתי ל־2K דורש לוחות אמנות חדשים (לא upscale ריק).

## יישור fidelity דמויות↔אוכל (T10)

דמויות = sprites מודולריים; אוכל = photoreal לבן. שדרוג אחיד דורש הזמנת ארט (stylize אוכל **או** upgrade דמויות) — מחוץ להיקף ללא לוחות חדשים.
