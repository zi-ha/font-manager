import { FontFamily, FontVariant } from "@/types/fonts";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { getLocalizedFontName } from "@/lib/font-names";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { prefetchFontPreviewSrc } from "@/lib/font-preview";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { memo, useState } from "react";

interface FontFamilyCardProps {
  family: FontFamily;
  onPreview: (variant: FontVariant) => void;
  onUninstall: (variant: FontVariant) => void;
  selectedVariantId?: string | null;
}

function toChineseStyleTag(token: string): string | null {
  const t = token.replace(/_/g, "").toLowerCase();

  if (t.includes("italic") || t.includes("oblique")) return "斜体";

  if (t.includes("ultralight")) return "超细";
  if (t.includes("extralight")) return "特细";
  if (t.includes("demilight") || t.includes("semilight")) return "半细";
  if (t === "thin" || t.includes("thin")) return "细";
  if (t === "light" || t.includes("light")) return "轻";

  if (t === "regular" || t === "normal" || t === "book" || t === "roman") return "常规";
  if (t === "medium" || t.includes("medium")) return "中等";
  if (t.includes("semibold") || t.includes("demibold")) return "半粗";
  if (t === "bold" || t.includes("bold")) return "粗";
  if (t.includes("extrabold") || t.includes("ultrabold")) return "特粗";
  if (t === "black" || t.includes("black")) return "黑";
  if (t === "heavy" || t.includes("heavy")) return "特黑";

  return null;
}

function fallbackWeightTag(weight: number): string {
  if (weight <= 200) return "超细";
  if (weight <= 300) return "细";
  if (weight <= 400) return "常规";
  if (weight <= 500) return "中等";
  if (weight <= 600) return "半粗";
  if (weight <= 700) return "粗";
  if (weight <= 800) return "特粗";
  return "黑";
}

function getVariantTags(variant: FontVariant): string[] {
  const raw = variant.postscriptName?.replace(/^\./, "") || variant.fullName || "";
  const parts = raw.split("-");
  const stylePart = parts.length > 1 ? parts.slice(1).join("-") : "";
  const styleTokens = stylePart
    .split(/[\s-]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const tags: string[] = [];
  for (const tok of styleTokens) {
    const mapped = toChineseStyleTag(tok);
    if (mapped && !tags.includes(mapped)) tags.push(mapped);
  }

  if (tags.length === 0) tags.push(fallbackWeightTag(variant.weight));
  return tags.slice(0, 2);
}

export const FontFamilyCard = memo(function FontFamilyCard({
  family,
  onPreview,
  onUninstall,
  selectedVariantId,
}: FontFamilyCardProps) {
  const localizedFamilyName = getLocalizedFontName(family.family);
  const [variantToDelete, setVariantToDelete] = useState<FontVariant | null>(null);
  const [variantsOpen, setVariantsOpen] = useState(false);
  

  const handleDeleteClick = (e: React.MouseEvent, variant: FontVariant) => {
    e.stopPropagation();
    setVariantToDelete(variant);
  };

  return (
    <div
      className={`relative rounded-xl border bg-background px-4 py-3 transition-colors duration-150 motion-reduce:transition-none ${
        selectedVariantId ? "border-primary/25 bg-background" : "border-border/60 hover:border-border"
      }`}
    >
      <div
        className={`absolute left-0 top-2 bottom-2 w-0.5 rounded-r bg-primary/40 transition-opacity duration-150 motion-reduce:transition-none ${
          selectedVariantId ? "opacity-100" : "opacity-0"
        }`}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="font-semibold text-[15px] truncate leading-tight tracking-tight" title={localizedFamilyName}>
            {localizedFamilyName}
            </div>
            {selectedVariantId && (
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
            )}
          </div>
          {localizedFamilyName !== family.family && (
            <div className="text-[11px] text-muted-foreground/80 truncate" title={family.family}>
              {family.family}
            </div>
          )}
        </div>
        <Badge variant="secondary" className="shrink-0 h-6 px-2 text-xs font-medium bg-muted/35 text-foreground/80">
          {family.variants.length}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-2">
           {family.variants.slice(0, 3).map(v => (
             <Badge key={v.id} variant="outline" className="text-[10px] px-2 py-0 h-5 font-normal rounded-full border-border/60 bg-background/30 text-foreground/80">
               {v.weight}
             </Badge>
           ))}
           {family.variants.length > 3 && (
             <Badge variant="outline" className="text-[10px] px-2 py-0 h-5 font-normal rounded-full border-border/60 bg-background/30 text-foreground/80">
               +{family.variants.length - 3}
             </Badge>
           )}
      </div>

      <Accordion
        type="single"
        collapsible
        className="w-full mt-2"
        value={variantsOpen ? "variants" : ""}
        onValueChange={(v) => setVariantsOpen(v === "variants")}
      >
          <AccordionItem value="variants" className="border-b-0">
            <AccordionTrigger className="py-2 text-xs text-muted-foreground/80 hover:text-foreground hover:no-underline">
              {variantsOpen ? "收起变体" : "查看变体"}
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col gap-2 mt-1 max-h-32 overflow-y-auto pr-1">
                {family.variants.map((variant, index) => (
                  <div
                    key={variant.id}
                    className={`group flex justify-between items-center px-3 py-2 rounded-md cursor-pointer border outline-none transition-all duration-300 ease-out ${
                      selectedVariantId === variant.id
                        ? "bg-secondary/60 border-border"
                        : "border-transparent hover:bg-muted/25"
                    } focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-1 focus-visible:ring-offset-background`}
                    style={{ 
                      animation: variantsOpen ? `slideIn 0.3s ease-out ${index * 0.05}s backwards` : 'none',
                    }}
                    onClick={() => onPreview(variant)}
                    onPointerEnter={() => prefetchFontPreviewSrc(variant.path)}
                    onFocus={() => prefetchFontPreviewSrc(variant.path)}
                    onPointerDown={() => prefetchFontPreviewSrc(variant.path)}
                    tabIndex={0}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="hidden sm:inline-flex h-6 w-8 items-center justify-center rounded bg-muted/40 text-xs text-muted-foreground shrink-0 group-hover:bg-muted/60"
                        style={{
                          fontFamily: `"${variant.family}"`,
                          fontWeight: variant.weight,
                          fontStyle: variant.style,
                        }}
                      >
                        Aa
                      </span>
                      <span className="font-medium text-sm truncate">{localizedFamilyName}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        {getVariantTags(variant).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-normal">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    {!variant.isSystemCore && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => handleDeleteClick(e, variant)}
                          title="卸载字体"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                    )}
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <AlertDialog open={!!variantToDelete} onOpenChange={(open) => !open && setVariantToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认卸载字体?</AlertDialogTitle>
              <AlertDialogDescription>
                您确定要卸载 "{variantToDelete?.fullName || variantToDelete?.family}" 吗？此操作无法撤销。
                <br/>
                <span className="text-xs mt-2 block break-all">文件: {variantToDelete?.path}</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction 
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (variantToDelete) {
                    onUninstall(variantToDelete);
                    setVariantToDelete(null);
                  }
                }}
              >
                卸载
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  );
});
