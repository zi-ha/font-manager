use std::io;
use winreg::enums::*;
use winreg::RegKey;

pub fn register_font(font_name: &str, file_name: &str) -> io::Result<()> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let path = r"Software\Microsoft\Windows NT\CurrentVersion\Fonts";
    let (key, _) = hkcu.create_subkey(path)?;
    
    // The value name is the font name (e.g., "Arial (TrueType)"), and the data is the file name
    key.set_value(font_name, &file_name)?;
    Ok(())
}

pub fn remove_font_registry_entry(target_path: &str) -> io::Result<bool> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let path = r"Software\Microsoft\Windows NT\CurrentVersion\Fonts";
    let key = hkcu.open_subkey_with_flags(path, KEY_READ | KEY_WRITE)?;
    
    let mut found = false;
    let target_lower = target_path.to_lowercase();
    
    // We need to collect keys to delete first to avoid modifying while iterating
    let mut keys_to_delete = Vec::new();

    for i in key.enum_values() {
        if let Ok((name, value)) = i {
            // Font registry values are typically REG_SZ containing the file path or filename
            let val_str = value.to_string(); 
            if val_str.to_lowercase() == target_lower {
                keys_to_delete.push(name);
            }
        }
    }

    for name in keys_to_delete {
        key.delete_value(&name)?;
        found = true;
    }
    
    Ok(found)
}
