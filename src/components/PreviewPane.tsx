import { useEffect, useMemo, useState, useRef } from "react";
import { FontVariant } from "@/types/fonts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getLocalizedFontName } from "@/lib/font-names";
import { getFontPreviewSrc } from "@/lib/font-preview";

interface PreviewPaneProps {
  selectedVariant: FontVariant | null;
}

function PreviewPaneContent({
  selectedVariant,
  text,
  setText,
  fontSize,
  setFontSize,
}: {
  selectedVariant: FontVariant;
  text: string;
  setText: (value: string) => void;
  fontSize: number[];
  setFontSize: (value: number[]) => void;
}) {
  const tauriAvailable =
    typeof window !== "undefined" &&
    ((window as any).__TAURI_INTERNALS__ != null || (window as any).__TAURI__ != null);
  
  const [fontUrl, setFontUrl] = useState<string | null>(null);
  const [loadingFont, setLoadingFont] = useState(false);
  const [displayVariant, setDisplayVariant] = useState(selectedVariant);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Track the current loaded FontFace to clean it up
  const currentFontFace = useRef<FontFace | null>(null);

  // Sync basic info immediately
  const displayStyle = {
    fontWeight: selectedVariant.weight,
    fontStyle: selectedVariant.style,
    fontSize: `${fontSize[0]}px`,
  };

  const postscriptNameRaw = selectedVariant.postscriptName;
  const postscriptName = postscriptNameRaw?.replace(/^\./, "");
  const localizedFamily = getLocalizedFontName(selectedVariant.family);
  const styleLabel = selectedVariant.style ? selectedVariant.style[0].toUpperCase() + selectedVariant.style.slice(1) : "";
  const displayName = postscriptName || selectedVariant.fullName || `${localizedFamily} ${styleLabel}`;

  const previewFamily = useMemo(() => `__preview_${displayVariant.id}`, [displayVariant.id]);
  const previewSrc = fontUrl;

  useEffect(() => {
    if (!tauriAvailable) {
      setFontUrl(null);
      return;
    }

    let cancelled = false;
    setLoadingFont(true);
    setIsTransitioning(true);
    const startTime = Date.now();

    (async () => {
      try {
        const src = await getFontPreviewSrc(selectedVariant.path);
        
        if (cancelled) return;

        // Use FontFace API to ensure font is loaded before showing
        const familyName = `__preview_${selectedVariant.id}`;
        const fontFace = new FontFace(familyName, `url("${src}")`, {
            weight: String(selectedVariant.weight),
            style: selectedVariant.style
        });

        try {
            await fontFace.load();
        } catch (e) {
            console.error("Failed to load font:", e);
            throw e; 
        }

        if (cancelled) return;

        // Ensure loading state lasts at least 0.5s for the animation to be seen
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 500 - elapsed);
        
        if (remaining > 0) {
          await new Promise(resolve => setTimeout(resolve, remaining));
        }

        if (cancelled) return;

        // Add loaded font to document
        document.fonts.add(fontFace);
        
        // Clean up previous font
        if (currentFontFace.current) {
            document.fonts.delete(currentFontFace.current);
        }
        currentFontFace.current = fontFace;

        setFontUrl(src);
        setDisplayVariant(selectedVariant);

      } catch {
        if (!cancelled) {
          setFontUrl(null);
          setDisplayVariant(selectedVariant);
        }
      } finally {
        if (!cancelled) {
          setLoadingFont(false);
          // Small delay to allow font to apply
          setTimeout(() => setIsTransitioning(false), 50);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedVariant, tauriAvailable]);

  // Clean up font on unmount
  useEffect(() => {
      return () => {
          if (currentFontFace.current) {
              document.fonts.delete(currentFontFace.current);
          }
      };
  }, []);

  const previewStyle = {
    ...displayStyle,
    fontFamily: previewSrc ? `"${previewFamily}", "${displayVariant.family}"` : `"${displayVariant.family}"`,
    opacity: isTransitioning ? 0 : 1,
    transition: isTransitioning ? 'none' : 'opacity 0.6s ease-out'
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-xl">预览</CardTitle>
        <p className="text-sm text-muted-foreground">{displayName}</p>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4 min-h-0 overflow-hidden">
        <div className="flex flex-col gap-2">
          <Label>预览文本</Label>
          <Input value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between">
            <Label>字号</Label>
            <span className="text-sm text-muted-foreground">{fontSize[0]}px</span>
          </div>
          <Slider value={fontSize} onValueChange={setFontSize} min={12} max={120} step={1} />
        </div>

        <div className="flex-1 border rounded bg-secondary/10 min-h-[200px] flex overflow-auto relative">
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center text-xs text-muted-foreground bg-background/40 transition-opacity duration-150 motion-reduce:transition-none ${
              loadingFont ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <div className="loading-7 mb-4"></div>
            正在加载字体...
          </div>
          <p
            style={previewStyle}
            className={`text-center break-words max-w-full m-auto p-4 transition-opacity duration-150 motion-reduce:transition-none ${
              loadingFont ? "opacity-0" : "opacity-100"
            }`}
          >
            {text}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function PreviewPane({ selectedVariant }: PreviewPaneProps) {
  const [text, setText] = useState("天地玄黄，宇宙洪荒。The quick brown fox jumps over the lazy dog.");
  const [fontSize, setFontSize] = useState([40]);

  if (!selectedVariant) {
    return (
      <Card className="h-full flex items-center justify-center text-muted-foreground p-6">
        <p>选择一个字体变体以预览</p>
      </Card>
    );
  }
  return (
    <PreviewPaneContent
      selectedVariant={selectedVariant}
      text={text}
      setText={setText}
      fontSize={fontSize}
      setFontSize={setFontSize}
    />
  );
}
