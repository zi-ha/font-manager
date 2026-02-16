use crate::win::registry::remove_font_registry_entry;
use serde::Serialize;
use std::fs;
use std::path::Path;
use winapi::um::winuser::{SendMessageTimeoutW, HWND_BROADCAST, WM_FONTCHANGE, SMTO_ABORTIFHUNG};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UninstallResult {
    pub success: bool,
    pub message: String,
}

#[tauri::command]
pub fn uninstall_font(path: String) -> UninstallResult {
    // 1. Safety Check: Is it a system font?
    let system_root = std::env::var("SystemRoot").unwrap_or_else(|_| "C:\\Windows".to_string());
    let system_fonts_dir = Path::new(&system_root).join("Fonts");
    let font_path = Path::new(&path);
    
    if font_path.starts_with(&system_fonts_dir) {
        return UninstallResult {
            success: false,
            message: "Cannot uninstall system core fonts.".to_string(),
        };
    }
    
    if !font_path.exists() {
         return UninstallResult {
            success: false,
            message: "Font file not found.".to_string(),
        };
    }

    // 2. Remove from Registry
    match remove_font_registry_entry(&path) {
        Ok(found) => {
            if !found {
                // If not found in registry, check if it is in user fonts directory
                 let local_app_data = std::env::var("LOCALAPPDATA").unwrap_or_default();
                 let user_fonts_dir = Path::new(&local_app_data).join("Microsoft").join("Windows").join("Fonts");
                 
                 if !font_path.starts_with(&user_fonts_dir) {
                     return UninstallResult {
                        success: false,
                        message: "Registry entry not found and file is not in user fonts directory.".to_string(),
                    };
                 }
            }
        }
        Err(e) => {
             return UninstallResult {
                success: false,
                message: format!("Failed to access registry: {}", e),
            };
        }
    }

    // 3. Delete File
    if let Err(e) = fs::remove_file(&path) {
         return UninstallResult {
            success: false,
            message: format!("Failed to delete file: {}. You might need to close applications using this font.", e),
        };
    }
    
    // 4. Broadcast Change
    unsafe {
        SendMessageTimeoutW(
            HWND_BROADCAST,
            WM_FONTCHANGE,
            0,
            0,
            SMTO_ABORTIFHUNG,
            1000,
            std::ptr::null_mut(),
        );
    }

    UninstallResult {
        success: true,
        message: "Font uninstalled successfully.".to_string(),
    }
}
