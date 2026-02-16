mod fonts;
mod win;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            fonts::enumerate::list_fonts,
            fonts::install::install_fonts,
            fonts::preview::read_font_file_base64,
            fonts::uninstall::uninstall_font
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
