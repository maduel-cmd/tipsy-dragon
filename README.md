# The Tipsy Dragon 🐉

משחק תגובה בעברית: אתם מפעילים בר בתוך פוד־טרק (משקאות + גלידות + ארטיקים + אוכל חם).
מצב **אינסופי** — שלבים שהולכים ונהיים קשים יותר עד שנגמרים החיים.

ריפו עצמאי, חולץ מתוך [TrailLink](https://github.com/maduel-cmd/TrailLink) (`apps/foodtruck-bar`).

## הרצה

```bash
npm install
npm run dev
```

פותחים: http://127.0.0.1:5180

בנייה:

```bash
npm run build
```

בדיקות:

```bash
npm test
```

## פריסה ל-Netlify

**אתר חי:** https://traillink-foodtruck-bar.netlify.app

מוגדר דרך `netlify.toml` בשורש הריפו: `npm run build`, publish `dist`, Node 22.

בטלפון: פתחו את הקישור → שתפו / «הוסף למסך הבית» (PWA).

## איך משחקים

1. בחרו סביבה ותחנת עבודה (אופציונלי).
2. לחצו על לקוח בתור כדי לבחור הזמנה.
3. לחצו מוצרים מהמדף עד שהמגש תואם — ואז **הגישו**.
4. שלבים מוקדמים נוחים למתחילים; אחר כך קבוצות גדולות יותר ופחות זמן.
5. הלילה נגמר רק כשנגמרים החיים — נסו לשבור שיא שלב.

### שטח / מובייל

- **מצב שמש** — ניגודיות גבוהה לקריאה באור חזק
- **אופליין** — Service Worker + שבב סטטוס רשת
- **יעדי מגע גדולים** + זוהר ללקוח דחוף
- **טיפים קצרים** במקום מדריך ארוך

פירוט: [`docs/GEMINI_FIELD_UX_he.md`](docs/GEMINI_FIELD_UX_he.md)

## מבנה

- `src/game/catalog.ts` — קטלוג מוצרים (כולל אוכל חם)
- `src/config/environments.ts` — 6 סביבות
- `src/game/waves.ts` — `getStageConfig` לשלבים אינסופיים מתגברים
- `src/game/progress.ts`, `sfx.ts`, `moodLines.ts`, `fieldUx.ts` — התקדמות, סאונד, מצב־רוח, UX שטח
- `src/components/PwaUpdateBanner.tsx` — עדכון PWA
- `public/assets/` — כל אמנות המשחק (environments, items, characters, sprites)
- `src/App.tsx` — לולאת המשחק
