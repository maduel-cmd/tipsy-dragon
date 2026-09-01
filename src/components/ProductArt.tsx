import { useEffect, useState } from "react";
import { onAssetsReady, spriteUrl } from "../game/assetLoader";

type Props = {
  spriteId?: string;
  emoji: string;
  accent: string;
  alt: string;
  className?: string;
};

/** תמונת מוצר מאסטים — מתעדכן כשהאסטים נטענים; נפילה לאימוג׳י אם אין ספרייט */
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
    return (
      <span
        className={`product-art emoji-fallback ${className ?? ""}`}
        style={{ background: accent }}
        aria-hidden
      >
        {emoji}
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
