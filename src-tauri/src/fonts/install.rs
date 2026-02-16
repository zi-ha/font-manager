use std::path::{Path, PathBuf};
use std::fs;
use winapi::um::winuser::{SendMessageTimeoutW, HWND_BROADCAST, WM_FONTCHANGE, SMTO_ABORTIFHUNG};
use crate::win::registry::register_font;
use fontdb::Database;
use serde::Serialize;
use sha2::{Sha256, Digest};
use std::io::Read;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallResult {
    pub success_count: usize,
    pub failed_count: usize,
    pub errors: Vec<String>,
}

fn calculate_file_hash(path: &Path) -> std::io::Result<String> {
    let mut file = fs::File::open(path)?;
    let mut hasher = Sha256::new();
    let mut buffer = [0; 8192];
    loop {
        let count = file.read(&mut buffer)?;
        if count == 0 {
            break;
        }
        hasher.update(&buffer[..count]);
    }
    Ok(format!("{:x}", hasher.finalize()))
}

#[tauri::command]
pub async fn install_fonts(paths: Vec<String>) -> InstallResult {
    let mut success_count = 0;
    let mut failed_count = 0;
    let mut errors = Vec::new();

    // Get the user fonts directory: %LOCALAPPDATA%\Microsoft\Windows\Fonts
    let local_app_data = std::env::var("LOCALAPPDATA").unwrap_or_default();
    if local_app_data.is_empty() {
        return InstallResult {
            success_count: 0,
            failed_count: paths.len(),
            errors: vec!["Could not determine LOCALAPPDATA directory".to_string()],
        };
    }
    
    let fonts_dir = PathBuf::from(local_app_data).join("Microsoft").join("Windows").join("Fonts");
    if !fonts_dir.exists() {
        if let Err(e) = fs::create_dir_all(&fonts_dir) {
             return InstallResult {
                success_count: 0,
                failed_count: paths.len(),
                errors: vec![format!("Failed to create fonts directory: {}", e)],
            };
        }
    }

    for path_str in paths {
        let path = Path::new(&path_str);
        if !path.exists() {
            failed_count += 1;
            errors.push(format!("File not found: {}", path_str));
            continue;
        }

        // Basic validation
        let ext = path.extension().and_then(|e| e.to_str()).map(|e| e.to_lowercase());
        if !matches!(ext.as_deref(), Some("ttf") | Some("otf")) {
            failed_count += 1;
            errors.push(format!("Unsupported file type: {}", path_str));
            continue;
        }
        
        // Parse font metadata to get family name (needed for registry key)
        // Optimization: scope the Database usage to ensure file handle is dropped as soon as possible
        let family = {
            let mut db = Database::new();
            if let Err(e) = db.load_font_file(path) {
                 failed_count += 1;
                 errors.push(format!("Failed to parse font file {}: {}", path_str, e));
                 continue;
            }
            
            if db.faces().count() == 0 {
                 failed_count += 1;
                 errors.push(format!("No font faces found in file: {}", path_str));
                 continue;
            }

            // Use the first face to determine the registry name
            let face = db.faces().next().unwrap();
            face.families.first().map(|f| f.0.clone()).unwrap_or("Unknown".to_string())
        };
        
        // Construct the registry value name, e.g., "Arial (TrueType)"
        // This is a simplification; handling multiple faces in a single file requires more complex logic
        let registry_name = format!("{} (TrueType)", family); // Simplified
        
        let file_name = path.file_name().unwrap();
        let dest_path = fonts_dir.join(file_name);

        // Check if destination file already exists
        if dest_path.exists() {
            // Compare source and destination to see if they are the same file
            // First check file size
            let mut is_identical = false;
            if let (Ok(src_meta), Ok(dest_meta)) = (fs::metadata(path), fs::metadata(&dest_path)) {
                if src_meta.len() == dest_meta.len() {
                    // Size matches, calculate hash
                    if let (Ok(src_hash), Ok(dest_hash)) = (calculate_file_hash(path), calculate_file_hash(&dest_path)) {
                        if src_hash == dest_hash {
                            is_identical = true;
                        }
                    }
                }
            }

            if is_identical {
                 // File already exists and seems identical, consider it a success or skip
                 // We still proceed to register in registry just in case
                 if let Err(e) = register_font(&registry_name, dest_path.to_str().unwrap()) {
                    failed_count += 1;
                    errors.push(format!("Failed to register font {}: {}", path_str, e));
                 } else {
                    success_count += 1;
                 }
                 continue;
            }
            
            // If exists but different, try to overwrite.
            // fs::copy will attempt to overwrite, but if file is in use (loaded by OS), it will fail with "Text file busy" or "Access denied"
        }

        // Copy file
        // Retry logic for file copy to handle temporary file locks
        let mut copy_success = false;
        for _ in 0..3 {
            if let Ok(_) = fs::copy(path, &dest_path) {
                copy_success = true;
                break;
            }
            // Wait a bit before retrying
            std::thread::sleep(std::time::Duration::from_millis(100));
        }

        if !copy_success {
            failed_count += 1;
            // Capture the last error for reporting
            let err = fs::copy(path, &dest_path).err().unwrap();
            errors.push(format!("Failed to copy file {}: {}", path_str, err));
            continue;
        }

        // Register in registry
        // Note: For user-installed fonts in %LOCALAPPDATA%, the registry value should be the full path or relative path?
        // Usually, for user fonts, it's the full path.
        if let Err(e) = register_font(&registry_name, dest_path.to_str().unwrap()) {
             failed_count += 1;
             errors.push(format!("Failed to register font {}: {}", path_str, e));
             // Cleanup: remove copied file
             let _ = fs::remove_file(&dest_path);
             continue;
        }

        success_count += 1;
    }

    // Broadcast WM_FONTCHANGE
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

    InstallResult {
        success_count,
        failed_count,
        errors,
    }
}
