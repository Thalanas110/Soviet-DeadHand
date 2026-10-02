import { useState } from "react";

export function PinPad({
  title,
  sub,
  busy,
  onSubmit,
  onCancel,
}: {
  title: string;
  sub?: string;
  busy?: boolean;
  onSubmit: (pin: string) => void;
  onCancel: () => void;
}) {
  const [pin, setPin] = useState("");
  const press = (k: string) => setPin((p) => (p.length < 8 ? p + k : p));
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/85 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-label={title}
    >
      <div className="plate w-full max-w-sm p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <p className="font-display text-lg uppercase text-primary glow-amber">{title}</p>
        {sub && (
          <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">{sub}</p>
        )}
        <div className="crt mt-4 flex h-14 items-center justify-center font-display text-3xl tracking-[0.5em] text-radar glow-radar">
          {pin.replace(/./g, "●") || <span className="text-muted-foreground/50">— — — —</span>}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => press(k)}
              className="border border-border bg-secondary py-4 font-display text-xl active:bg-primary active:text-primary-foreground"
            >
              {k}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPin("")}
            className="border border-border py-4 text-xs uppercase tracking-widest text-muted-foreground"
          >
            Сброс
          </button>
          <button
            type="button"
            onClick={() => press("0")}
            className="border border-border bg-secondary py-4 font-display text-xl active:bg-primary active:text-primary-foreground"
          >
            0
          </button>
          <button
            type="button"
            onClick={() => setPin((p) => p.slice(0, -1))}
            className="border border-border py-4 text-xs uppercase tracking-widest text-muted-foreground"
          >
            ⌫
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="border border-border py-3 text-xs uppercase tracking-widest"
          >
            Отмена
          </button>
          <button
            type="button"
            disabled={pin.length < 4 || busy}
            onClick={() => onSubmit(pin)}
            className="bg-primary py-3 font-display text-sm uppercase tracking-widest text-primary-foreground disabled:opacity-40"
          >
            {busy ? "…" : "Подтвердить"}
          </button>
        </div>
      </div>
    </div>
  );
}
