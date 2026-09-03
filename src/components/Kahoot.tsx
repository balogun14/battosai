"use client";

export type KahootShape = "triangle" | "diamond" | "circle" | "square";

export const KAHOOT_COLORS: Record<KahootShape, string> = {
  triangle: "#e21b3c",
  diamond: "#1368ce",
  circle: "#d89e00",
  square: "#26890c",
};

export function ShapeIcon({
  shape,
  size = 32,
  className = "",
}: {
  shape: KahootShape;
  size?: number;
  className?: string;
}) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "white", className };
  switch (shape) {
    case "triangle":
      return (
        <svg {...common}>
          <path d="M12 3 22 20 2 20Z" />
        </svg>
      );
    case "diamond":
      return (
        <svg {...common}>
          <path d="M12 2 22 12 12 22 2 12Z" />
        </svg>
      );
    case "circle":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
        </svg>
      );
    case "square":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
        </svg>
      );
  }
}

const ORDER: KahootShape[] = ["triangle", "diamond", "circle", "square"];

/** Host-screen option tiles: colored boxes with shape + option text. */
export function OptionTiles({
  options,
  distribution,
}: {
  options: string[];
  distribution?: Record<string, number>;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {options.slice(0, 4).map((opt, i) => {
        const shape = ORDER[i];
        const count = distribution?.[opt];
        return (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-white font-semibold shadow-sm"
            style={{ backgroundColor: KAHOOT_COLORS[shape] }}
          >
            <ShapeIcon shape={shape} size={22} className="shrink-0 opacity-90" />
            <span className="truncate">{opt}</span>
            {distribution && (
              <span className="ml-auto text-lg font-bold tabular-nums">{count ?? 0}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Player answer buttons: big Kahoot shape buttons (no text, like the app). */
export function ShapeButtons({
  options,
  disabled,
  onSelect,
}: {
  options: string[];
  disabled?: boolean;
  onSelect: (option: string, index: number) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 w-full">
      {options.slice(0, 4).map((opt, i) => {
        const shape = ORDER[i];
        return (
          <button
            key={i}
            disabled={disabled}
            onClick={() => onSelect(opt, i)}
            className="aspect-[4/3] rounded-2xl flex items-center justify-center active:scale-95 transition-transform disabled:opacity-60"
            style={{ backgroundColor: KAHOOT_COLORS[shape] }}
            aria-label={`Answer ${i + 1}`}
          >
            <ShapeIcon shape={shape} size={56} className="opacity-95 drop-shadow" />
          </button>
        );
      })}
    </div>
  );
}
