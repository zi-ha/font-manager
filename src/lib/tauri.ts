import { invoke } from "@tauri-apps/api/core";
import { ListFontsResult } from "@/types/fonts";

export interface InstallResult {
  successCount: number;
  failedCount: number;
  errors: string[];
}

export interface UninstallResult {
  success: boolean;
  message: string;
}

export interface FontFileBase64Result {
  base64: string;
  mime: string;
}

export async function listFonts(): Promise<ListFontsResult> {
  return await invoke("list_fonts");
}

export async function installFonts(paths: string[]): Promise<InstallResult> {
  return await invoke("install_fonts", { paths });
}

export async function uninstallFont(path: string): Promise<UninstallResult> {
  return await invoke("uninstall_font", { path });
}

export async function readFontFileBase64(path: string): Promise<FontFileBase64Result> {
  return await invoke("read_font_file_base64", { path });
}
