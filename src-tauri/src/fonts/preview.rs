use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde::Serialize;
use std::{fs, path::Path};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FontFileBase64Result {
    pub base64: String,
    pub mime: String,
}

#[tauri::command]
pub fn read_font_file_base64(path: String) -> Result<FontFileBase64Result, String> {
    let p = Path::new(&path);

    if !p.exists() {
        return Err("Font file not found".to_string());
    }

    let ext = p
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    if ext != "ttf" && ext != "otf" {
        return Err("Unsupported file type".to_string());
    }

    let canonical = p
        .canonicalize()
        .map_err(|e| format!("Failed to resolve font path: {}", e))?;

    let system_root = std::env::var("SystemRoot").unwrap_or_else(|_| "C:\\Windows".to_string());
    let system_fonts_dir = Path::new(&system_root).join("Fonts");

    let local_app_data = std::env::var("LOCALAPPDATA").unwrap_or_default();
    let user_fonts_dir = Path::new(&local_app_data)
        .join("Microsoft")
        .join("Windows")
        .join("Fonts");

    let system_fonts_dir = system_fonts_dir
        .canonicalize()
        .unwrap_or(system_fonts_dir);
    let user_fonts_dir = user_fonts_dir.canonicalize().unwrap_or(user_fonts_dir);

    if !canonical.starts_with(&system_fonts_dir) && !canonical.starts_with(&user_fonts_dir) {
        return Err("Font path is not in an allowed directory".to_string());
    }

    let meta = fs::metadata(&canonical)
        .map_err(|e| format!("Failed to read font metadata: {}", e))?;

    if meta.len() > 25 * 1024 * 1024 {
        return Err("Font file too large".to_string());
    }

    let bytes = fs::read(&canonical).map_err(|e| format!("Failed to read font file: {}", e))?;
    let mime = if ext == "otf" { "font/otf" } else { "font/ttf" }.to_string();

    Ok(FontFileBase64Result {
        base64: STANDARD.encode(bytes),
        mime,
    })
}

