import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { installFonts, InstallResult } from "@/lib/tauri";

interface InstallAreaProps {
  onInstallStart: () => void;
  onInstallComplete: (result: InstallResult) => void;
}

export function InstallArea({ onInstallStart, onInstallComplete }: InstallAreaProps) {
  const [isInstalling, setIsInstalling] = useState(false);

  const handleSelectFiles = async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [
          {
            name: "字体文件",
            extensions: ["ttf", "otf"],
          },
        ],
      });

      if (selected && selected.length > 0) {
        setIsInstalling(true);
        onInstallStart();
        
        const paths = Array.isArray(selected) ? selected : [selected];
        
        try {
            const result = await installFonts(paths);
            onInstallComplete(result);
        } catch (error) {
            console.error("安装失败:", error);
            // Construct a fake failure result
            onInstallComplete({
                successCount: 0,
                failedCount: paths.length,
                errors: [String(error)]
            });
        } finally {
            setIsInstalling(false);
        }
      }
    } catch (error) {
      console.error("无法打开文件对话框:", error);
    }
  };

  return (
    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors">
      <Upload className="h-10 w-10 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">安装字体</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-xs">
        拖拽字体文件到此处，或点击下方按钮选择文件。
      </p>
      <Button onClick={handleSelectFiles} disabled={isInstalling}>
        {isInstalling ? "正在安装..." : "选择字体文件"}
      </Button>
      <p className="text-xs text-muted-foreground mt-4">
        支持 .ttf 和 .otf 格式
      </p>
    </div>
  );
}
