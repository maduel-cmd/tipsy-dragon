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

## QA Loop

```bash
npm run test -w @traillink/foodtruck-bar
npm run qa:assets -w @traillink/foodtruck-bar
# אחרי פריסה:
QA_LIVE_URL=https://traillink-foodtruck-bar.netlify.app npm run qa:assets -w @traillink/foodtruck-bar
```

תיקון ואיטרציה: נכס 404 → עדכון `assets.json` / חיתוך מחדש → בנייה → פריסה → QA חוזר עד 100%.
