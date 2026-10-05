# Tipsy Dragon · Asset Mapping (Food Truck ריאליסטי)

## מבנה תיקיות

```
public/assets/
├── items/
│   ├── prepared/   # מנות מוגמרות 512×512 (המבורגר, סטייק, בוקר…)
│   └── sides/      # תוספות ובר (צ׳יפס, הוט־דוג, כנפיים, בירה…)
├── environments/
│   ├── *.webp      # רקע שולחן־עבודה (~1024×572)
│   ├── mobile/     # WebP צר למובייל (~720w)
│   └── icons/      # אייקוני בורר סביבה (256×256, לא emoji)
├── foodtruck_sheets/  # גיליונות מקור לחיתוך
├── characters/sprites/ # דמויות מודולריות
├── sprites/           # UI בלבד: cursor_neon, overlay_lights
└── assets.json

archive/legacy-sprites/  # לוחות ישנים מחוץ לבילד (לא ב־public)
public/promo/            # צילומי פרומו + og.jpg
```

## מפתחות ספרייט פעילים (קטלוג נוכחי)

בסיס: `burger_double`, `cheeseburger`, `steak_ribeye`, `hotdog`, `bbq_wings`, `buffalo_wings`, `tacos`,
`breakfast_eggs`, `breakfast_meats`, `pancakes`, `waffle_fruit`, `chicken_waffles`, `croissant`,
`fries`, `onion_rings`, `nachos`, `calamari`, `dipping_sauces`, `rice_bowl`, `cheese_platter`,
`draft_beer`

מורחב: ראו `extendedMenu.ts` (`salmon_fillet` … `ice_cream_cone`) — כולם תחת `items/prepared/`.

## מדיניות placeholder

- בפרוד: **אין emoji** כשיש `sprite` / `iconAsset` על דיסק.
- ב־dev: emoji מותר עם באנר אדום (`emoji-fallback`) לזיהוי חסרים.
- Asserts: `src/game/assetsQa.test.ts` + `npm run qa:assets`.

## צינור

ראו `ASSET_PIPELINE_FOODTRUCK_he.md`.
