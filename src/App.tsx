import { useCallback, useEffect, useState, useMemo } from "react";
import { listFonts, uninstallFont, InstallResult } from "@/lib/tauri";
import { FontFamily, FontVariant } from "@/types/fonts";
import { Input } from "@/components/ui/input";
import { FontFamilyCard } from "@/components/FontFamilyCard";
import { PreviewPane } from "@/components/PreviewPane";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Search, RotateCw, Settings, Upload } from "lucide-react";
import { getLocalizedFontName } from "@/lib/font-names";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InstallArea } from "@/components/InstallArea";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TitleBar } from "@/components/TitleBar";
import { Virtuoso } from "react-virtuoso";

function App() {
  const [families, setFamilies] = useState<FontFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [hideSystemFonts, setHideSystemFonts] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<FontVariant | null>(null);
  const [isInstallDialogOpen, setIsInstallDialogOpen] = useState(false);
  const [installResult, setInstallResult] = useState<InstallResult | null>(null);
  const { toast } = useToast();

  const loadFonts = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listFonts();
      setFamilies(result.families);
    } catch (error) {
      console.error("Failed to load fonts:", error);
      toast({
        title: "加载字体失败",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadFonts();
  }, [loadFonts]);

  const filteredFamilies = useMemo(() => {
    return families.filter((f) => {
      if (hideSystemFonts && f.variants.every(v => v.isSystemCore)) {
        return false;
      }

      const localizedName = getLocalizedFontName(f.family);
      const searchLower = search.toLowerCase();
      return (
        f.family.toLowerCase().includes(searchLower) ||
        localizedName.toLowerCase().includes(searchLower)
      );
    });
  }, [families, search, hideSystemFonts]);

  const handleInstallComplete = (result: InstallResult) => {
    setInstallResult(result);
    // Refresh fonts after installation
    if (result.successCount > 0) {
      loadFonts();
      toast({
        title: "安装完成",
        description: `成功安装 ${result.successCount} 个字体`,
      });
    }
  };

  const handleUninstall = useCallback(async (variant: FontVariant) => {
    try {
        const result = await uninstallFont(variant.path);
        if (result.success) {
            toast({
                title: "卸载成功",
                description: result.message,
            });
            // Reload fonts to update list
            loadFonts();
            // Clear selection if deleted
            setSelectedVariant((prev) => (prev?.id === variant.id ? null : prev));
        } else {
            toast({
                title: "卸载失败",
                description: result.message,
                variant: "destructive",
            });
        }
    } catch (error) {
        console.error("Uninstall failed:", error);
        toast({
            title: "卸载出错",
            description: String(error),
            variant: "destructive",
        });
    }
  }, [loadFonts, toast]);

  const handlePreview = useCallback((variant: FontVariant) => {
    setSelectedVariant(variant);
  }, []);

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-background text-foreground">
      <TitleBar
        center={
          <div className="hidden md:flex items-center relative">
            <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索字体..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-80 pl-8 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
        }
        right={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
              variant="ghost"
              size="icon"
              className="h-full w-10 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0"
            >
              <Settings className="h-4 w-4" />
              <span className="sr-only">设置</span>
            </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>显示选项</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="flex items-center justify-between px-2 py-2">
                  <Label htmlFor="hide-system-fonts-titlebar" className="text-sm cursor-pointer">
                    隐藏系统内置字体
                  </Label>
                  <Switch
                    id="hide-system-fonts-titlebar"
                    checked={hideSystemFonts}
                    onCheckedChange={setHideSystemFonts}
                  />
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>外观</DropdownMenuLabel>
                <ThemeToggle />
                <DropdownMenuSeparator />
                <DropdownMenuLabel>统计信息</DropdownMenuLabel>
                <DropdownMenuItem disabled className="flex justify-between cursor-default opacity-100">
                  <span>总计</span>
                  <span className="text-muted-foreground">{families.length}</span>
                </DropdownMenuItem>
                <DropdownMenuItem disabled className="flex justify-between cursor-default opacity-100">
                  <span>显示</span>
                  <span className="text-muted-foreground">{filteredFamilies.length}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-full w-10 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0"
              onClick={loadFonts}
              title="刷新列表"
            >
              <RotateCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-full w-10 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0"
              onClick={() => {
                setInstallResult(null);
                setIsInstallDialogOpen(true);
              }}
              title="安装字体"
            >
              <Upload className="h-4 w-4" />
            </Button>
          </>
        }
      />

      <Dialog open={isInstallDialogOpen} onOpenChange={setIsInstallDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>安装字体</DialogTitle>
          </DialogHeader>
          {!installResult ? (
            <InstallArea onInstallStart={() => {}} onInstallComplete={handleInstallComplete} />
          ) : (
            <div className="flex flex-col gap-4 py-4">
              <div className="text-center">
                <h3 className="text-lg font-medium">安装完成</h3>
                <p className="text-muted-foreground mt-2">
                  成功: {installResult.successCount} | 失败: {installResult.failedCount}
                </p>
              </div>
              {installResult.errors.length > 0 && (
                <ScrollArea className="h-40 w-full rounded border p-2 bg-muted/50 text-sm">
                  {installResult.errors.map((err, i) => (
                    <p key={i} className="text-destructive mb-1">
                      {err}
                    </p>
                  ))}
                </ScrollArea>
              )}
              <Button
                onClick={() => {
                  setIsInstallDialogOpen(false);
                  setInstallResult(null);
                }}
              >
                关闭
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="flex flex-1 min-h-0 w-full overflow-hidden">
      {/* Main Content: Font List */}
      <main className="flex-1 md:flex-[0_0_50%] flex flex-col min-w-0 bg-muted/10">
        <div className="p-4 md:hidden flex flex-col gap-2">
          <Input
              placeholder="搜索字体..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
        </div>

        <div className="flex-1 px-4 py-4 min-h-0">
          {loading ? (
             <div className="flex items-center justify-center h-full">
               <p className="text-muted-foreground">正在加载字体...</p>
             </div>
          ) : (
            <>
              {filteredFamilies.length === 0 ? (
                <div className="text-center text-muted-foreground py-10">
                  未找到匹配 "{search}" 的字体
                </div>
              ) : (
                <Virtuoso
                  style={{ height: "100%" }}
                  data={filteredFamilies}
                  itemContent={(index, family) => (
                    <div 
                      className="pb-3 pr-2"
                      style={{ 
                        animation: `slideIn 0.10s ease-out ${Math.min(index, 3) * 0.01}s backwards`
                      }}
                    >
                      <FontFamilyCard
                        family={family}
                        onPreview={handlePreview}
                        onUninstall={handleUninstall}
                        selectedVariantId={selectedVariant?.family === family.family ? selectedVariant.id : null}
                      />
                    </div>
                  )}
                />
              )}
            </>
          )}
        </div>
      </main>

      {/* Right Sidebar: Preview */}
      <aside className="hidden md:block md:flex-[0_0_50%] min-w-0 bg-card">
        <div className="h-full p-4">
           <PreviewPane selectedVariant={selectedVariant} />
        </div>
      </aside>
      
      <Toaster />
      </div>
    </div>
  );
}

export default App;
