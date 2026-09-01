import { useEffect, useState } from "react";
import {
  characterSpriteUrl,
  getCharacterManifest,
  onCharactersReady,
  type CharacterLoadout,
  type CharacterCategory,
} from "../game/characterCatalog";

type Props = {
  loadout: CharacterLoadout;
  className?: string;
  alt?: string;
};

type Layer = {
  id: string;
  category: CharacterCategory | "base" | "example";
  src: string;
};

function buildLayers(loadout: CharacterLoadout): Layer[] {
  const layers: Layer[] = [];
  const baseSrc = characterSpriteUrl(loadout.baseId);
  if (baseSrc) {
    layers.push({ id: loadout.baseId, category: "base", src: baseSrc });
  }

  const extras: Array<[string | undefined, CharacterCategory]> = [
    [loadout.hairId, "hair"],
    [loadout.hatId, "hat"],
    [loadout.glassesId, "glasses"],
    [loadout.headphonesId, "headphones"],
    [loadout.accessoryId, "accessory"],
  ];

  for (const [id, cat] of extras) {
    if (!id) continue;
    const src = characterSpriteUrl(id);
    if (src) layers.push({ id, category: cat, src });
  }

  return layers;
}

/**
 * אווטאר לקוח מודולרי — שכבות מעל גוף בסיס לפי עוגנים ב־characters.json
 */
export function CharacterAvatar({ loadout, className, alt }: Props) {
  const [, setTick] = useState(0);
  const [failed, setFailed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    return onCharactersReady(() => setTick((t) => t + 1));
  }, []);

  useEffect(() => {
    setFailed({});
  }, [loadout.baseId, loadout.hatId, loadout.glassesId, loadout.headphonesId, loadout.accessoryId, loadout.hairId]);

  const layers = buildLayers(loadout);
  const anchors = getCharacterManifest()?.anchors ?? {};

  if (layers.length === 0) {
    return (
      <span className={`character-avatar emoji-fallback ${className ?? ""}`} aria-hidden>
        {loadout.gender === "kid" ? "🧒" : loadout.gender === "woman" ? "👩" : "🧑"}
      </span>
    );
  }

  return (
    <span className={`character-avatar ${className ?? ""}`} role="img" aria-label={alt ?? "לקוח"}>
      {layers.map((layer, index) => {
        if (failed[layer.id]) return null;
        const isBase = index === 0;
        const anchor = !isBase ? anchors[layer.category] : undefined;
        const style = isBase
          ? undefined
          : {
              left: `${((anchor?.x ?? 0.5) - (anchor?.scale ?? 0.8) / 2) * 100}%`,
              top: `${(anchor?.y ?? 0.1) * 100}%`,
              width: `${(anchor?.scale ?? 0.8) * 100}%`,
            };
        return (
          <img
            key={layer.id}
            className={`character-layer${isBase ? " base" : " overlay"}`}
            src={layer.src}
            alt=""
            draggable={false}
            style={style}
            onError={() => setFailed((f) => ({ ...f, [layer.id]: true }))}
          />
        );
      })}
    </span>
  );
}
