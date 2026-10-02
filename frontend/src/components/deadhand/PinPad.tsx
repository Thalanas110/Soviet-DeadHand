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
  const [visible, setVisible] = useState(false);

  function updatePassword(value: string) {
    setPin(value.slice(0, 64));
  }

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
        <div className="relative mt-4">
          <label
            htmlFor="operator-password"
            className="text-[10px] uppercase tracking-widest text-muted-foreground"
          >
            Password
          </label>
          <input
            id="operator-password"
            autoComplete="current-password"
            autoFocus
            maxLength={64}
            minLength={8}
            onChange={(event) => updatePassword(event.target.value)}
            type={visible ? "text" : "password"}
            value={pin}
            className="mt-1 w-full border border-input bg-panel px-3 py-3 pr-24 text-base text-foreground outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? "Hide password" : "Show password"}
            className="absolute right-2 bottom-2 border border-border px-2 py-1 text-[10px] uppercase tracking-widest text-muted-foreground hover:border-primary hover:text-primary"
          >
            {visible ? "Hide" : "Show"}
          </button>
          <p className="mt-1 text-right text-[10px] tabular-nums text-muted-foreground">
            {pin.length}/64
          </p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="border border-border py-3 text-xs uppercase tracking-widest"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={pin.length < 8 || busy}
            onClick={() => onSubmit(pin)}
            aria-label="Confirm password"
            className="bg-primary py-3 font-display text-sm uppercase tracking-widest text-primary-foreground disabled:opacity-40"
          >
            {busy ? "Working..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
