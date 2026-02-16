import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";

export function ThemeToggle({ label = "深色模式" }: { label?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const checked = mounted ? resolvedTheme === "dark" : false;

  return (
    <div className="flex items-center justify-between px-2 py-2">
      <span className="text-sm cursor-pointer">{label}</span>
      <Switch checked={checked} onCheckedChange={(v) => setTheme(v ? "dark" : "light")} />
    </div>
  );
}
