import { useEffect, useState } from "react";
import { onAssetsReady, spriteUrl } from "../game/assetLoader";
import { allowEmojiFallback } from "../game/prodPlaceholders";

type Props = {
  spriteId?: string;
  emoji: string;
  accent: string;
  alt: string;
  className?: string;
};

/**
 * תמונת מוצר מאסטים — מתעדכן כשהאסטים נטענים.
 * בפרוד: אין emoji כשיש sprite מוכן (או כשהמניפסט נכשל) — רק שלד ריק.
 * ב־dev: emoji + באנר אדום לזיהוי חסרים.
 */
export function ProductArt({ spriteId, emoji, accent, alt, className }: Props) {
  const [src, setSrc] = useState<string | undefined>(() =>
    spriteId ? spriteUrl(spriteId) : undefined,
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setSrc(spriteId ? spriteUrl(spriteId) : undefined);
      setFailed(false);
    };
    refresh();
    return onAssetsReady(refresh);
  }, [spriteId]);

  if (!src || failed) {
    const showEmoji = allowEmojiFallback();
    return (
      <span
        className={`product-art ${showEmoji ? "emoji-fallback" : "asset-missing"} ${className ?? ""}`}
        style={{ background: accent }}
        aria-hidden
        title={showEmoji ? `DEV fallback · ${spriteId ?? "no-sprite"}` : undefined}
        data-placeholder={showEmoji ? "emoji-dev" : "missing-prod"}
      >
        {showEmoji ? emoji : null}
      </span>
    );
  }

  return (
    <img
      className={`product-art food-item-img ${className ?? ""}`}
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}
