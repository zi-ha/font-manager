import { type ReactNode, useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import appIconUrl from "../../src-tauri/icons/32x32.png";

export function TitleBar({
  title = "字体管理器",
  iconSrc = appIconUrl,
  center,
  right,
}: {
  title?: string;
  iconSrc?: string | null;
  center?: ReactNode;
  right?: ReactNode;
}) {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    const w = getCurrentWindow();
    let unlisten: (() => void) | undefined;

    w.isMaximized().then(setMaximized).catch(() => {});
    w.onResized(() => {
      w.isMaximized().then(setMaximized).catch(() => {});
    })
      .then((fn) => {
        unlisten = fn;
      })
      .catch(() => {});

    return () => {
      unlisten?.();
    };
  }, []);

  const w = getCurrentWindow();

  return (
    <div className="h-12 w-full flex items-center bg-card select-none relative">
      <div
        className="flex-1 min-w-0 flex items-center px-3 h-full"
        onMouseDown={(e) => {
          if (e.buttons !== 1) return;
          if (e.detail === 2) {
            w.toggleMaximize().catch(() => {});
          } else {
            w.startDragging().catch(() => {});
          }
        }}
      >
        {iconSrc && (
          <img
            src={iconSrc}
            alt=""
            className="h-4 w-4 mr-2 rounded-sm opacity-90"
            draggable={false}
          />
        )}
        <div className="font-semibold text-sm truncate">
          {title}
        </div>
      </div>

      {center && (
        <div
          className="absolute left-1/2 -translate-x-1/2 flex items-center"
          onMouseDown={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          {center}
        </div>
      )}

      {right && (
        <div className="flex items-center gap-1 px-1 h-full">
          {right}
        </div>
      )}

      <div className="flex items-center h-full">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-full w-12 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0"
        onClick={async () => {
          try {
            await w.minimize();
          } catch {}
        }}
        title="最小化"
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-full w-12 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0"
        onClick={async () => {
          try {
            await w.toggleMaximize();
            const isMax = await w.isMaximized();
            setMaximized(isMax);
          } catch {}
        }}
        title={maximized ? "还原" : "最大化"}
      >
        {maximized ? <Copy className="h-4 w-4 rotate-180" /> : <Square className="h-4 w-4" />}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-full w-12 rounded-none hover:bg-destructive hover:text-destructive-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
        onClick={async () => {
          try {
            await w.close();
          } catch {}
        }}
        title="关闭"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  </div>
);
}
