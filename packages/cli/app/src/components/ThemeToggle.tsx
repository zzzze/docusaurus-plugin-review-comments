import { Sun, Moon, Monitor } from "lucide-react";
import type { ThemeMode } from "../hooks/useTheme";

const cycle: ThemeMode[] = ["light", "dark", "system"];
const icons: Record<ThemeMode, typeof Sun> = { light: Sun, dark: Moon, system: Monitor };
const labels: Record<ThemeMode, string> = { light: "Light", dark: "Dark", system: "System" };

export function ThemeToggle({
  mode,
  onChange,
}: {
  mode: ThemeMode;
  onChange: (mode: ThemeMode) => void;
}) {
  const Icon = icons[mode];
  const next = cycle[(cycle.indexOf(mode) + 1) % cycle.length]!;

  return (
    <button
      onClick={() => onChange(next)}
      className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      aria-label={`Theme: ${labels[mode]}. Click to switch to ${labels[next]}`}
      title={labels[mode]}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
