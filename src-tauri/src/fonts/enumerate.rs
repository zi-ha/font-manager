use crate::fonts::{FontFamily, FontVariant, ListFontsResult};
use fontdb::{Database, Source};
use sha1::{Digest, Sha1};
use std::collections::HashMap;
use std::path::Path;
use ttf_parser::Face;

#[tauri::command]
pub fn list_fonts() -> ListFontsResult {
    let mut db = Database::new();
    db.load_system_fonts();

    let mut families_map: HashMap<String, Vec<FontVariant>> = HashMap::new();

    let system_root = std::env::var("SystemRoot").unwrap_or_else(|_| "C:\\Windows".to_string());
    let system_fonts_dir = Path::new(&system_root).join("Fonts");

    // Helper to map weight to string
    fn weight_to_name(weight: u16) -> &'static str {
        match weight {
            100..=199 => "Thin",
            200..=299 => "ExtraLight",
            300..=349 => "Light",
            350..=399 => "DemiLight",
            400..=499 => "Regular",
            500..=599 => "Medium",
            600..=699 => "SemiBold",
            700..=799 => "Bold",
            800..=899 => "ExtraBold",
            900..=999 => "Black",
            _ => "Regular",
        }
    }

    fn is_regular_weight(weight: u16) -> bool {
        weight >= 400 && weight <= 499
    }

    for face_info in db.faces() {
        // Fix for fonts where OS/2 weight is 400 (Regular) but PostScript name indicates otherwise (e.g. MiSans Thin)
        let mut weight = face_info.weight.0;
        if weight == 400 {
             let ps_name_lower = face_info.post_script_name.to_lowercase();
             if ps_name_lower.contains("thin") { weight = 100; }
             else if ps_name_lower.contains("extralight") { weight = 200; }
             else if ps_name_lower.contains("demilight") { weight = 350; }
             else if ps_name_lower.contains("light") { weight = 300; }
             else if ps_name_lower.contains("medium") { weight = 500; }
             else if ps_name_lower.contains("semibold") { weight = 600; }
             else if ps_name_lower.contains("extrabold") { weight = 800; }
             else if ps_name_lower.contains("bold") { weight = 700; }
             else if ps_name_lower.contains("black") { weight = 900; }
             else if ps_name_lower.contains("heavy") { weight = 900; }
        }

        let family = face_info
            .families
            .first()
            .map(|f| f.0.clone())
            .unwrap_or("Unknown".to_string());

        // Generate a stable ID
        let path_str = match &face_info.source {
            Source::File(path) => path.to_string_lossy().to_string(),
            Source::Binary(_) => "memory".to_string(),
            Source::SharedFile(path, _) => path.to_string_lossy().to_string(),
        };

        let mut hasher = Sha1::new();
        hasher.update(path_str.as_bytes());
        hasher.update(face_info.post_script_name.as_bytes());
        let id = hex::encode(hasher.finalize());

        let style_str = match face_info.style {
            fontdb::Style::Normal => "normal",
            fontdb::Style::Italic => "italic",
            fontdb::Style::Oblique => "oblique",
        };

        let is_system_core = if let Source::File(path) = &face_info.source {
            path.starts_with(&system_fonts_dir)
        } else {
            false
        };

        // Try to get the full name using ttf-parser
        let mut full_name = None;
        if let Source::File(path) = &face_info.source {
            if let Ok(file_data) = std::fs::read(path) {
                // Parse the face at the specific index
                if let Ok(face) = Face::parse(&file_data, face_info.index) {
                    // Strategy:
                    // 1. Try to find Preferred Family (ID 16) + Preferred Subfamily (ID 17)
                    // 2. If not found, try Family (ID 1) + Subfamily (ID 2)
                    // 3. Fallback to Full Name (ID 4) if constructed name seems bad or missing parts
                    // We prioritize Chinese (2052) then English (1033) for each ID.

                    fn get_name(face: &Face, name_id: u16) -> Option<String> {
                        let mut best_name = None;
                        let mut best_score = 0; // 0: none, 1: any, 2: en, 3: cn
                        for name in face.names() {
                            if name.name_id == name_id && name.is_unicode() {
                                let score = if name.language_id == 2052 { 3 } else if name.language_id == 1033 { 2 } else { 1 };
                                if score > best_score {
                                    if let Some(name_str) = name.to_string() {
                                        best_name = Some(name_str);
                                        best_score = score;
                                    }
                                }
                            }
                        }
                        best_name
                    }

                    let family_name = get_name(&face, 16).or_else(|| get_name(&face, 1));
                    let subfamily_name = get_name(&face, 17).or_else(|| get_name(&face, 2));
                    
                    if let (Some(f), Some(s)) = (family_name, subfamily_name) {
                         let s_lower = s.to_lowercase();
                         // If subfamily is just "Regular" or "Normal", and weight is NOT regular, 
                         // we suspect this is a compatibility legacy name.
                         // We try to use the weight name instead.
                         if (s_lower == "regular" || s_lower == "normal") && !is_regular_weight(weight) {
                              let weight_name = weight_to_name(weight);
                              full_name = Some(format!("{} {}", f, weight_name));
                         } else {
                             // Clean up: avoid "MiSans MiSans Bold"
                             if s_lower.contains(&f.to_lowercase()) {
                                 full_name = Some(s);
                             } else {
                                 full_name = Some(format!("{} {}", f, s));
                             }
                         }
                    } else {
                         // Fallback to ID 4
                         full_name = get_name(&face, 4);
                    }
                }
            }
        }
        
        // Fallback: If full_name is still None, use PostScript Name
        if full_name.is_none() {
             full_name = Some(face_info.post_script_name.clone());
        }

        // ---------------------------------------------------------------------
        // CRITICAL FIX 2: Even more Aggressive Name Correction
        // ---------------------------------------------------------------------
        
        if let Some(ref name) = full_name {
            // Check if weight is NOT regular (e.g. 200, 700)
            if !is_regular_weight(weight) {
                 let weight_name = weight_to_name(weight);
                 let name_lower = name.to_lowercase();
                 
                 let mut new_name = name.clone();
                 let mut changed = false;

                 // Case insensitive replacement
                 // We need to handle case insensitivity properly for replacement
                 
                 // Find "Normal" or "Regular" (case insensitive) and replace
                 let target_words = ["Normal", "Regular", "normal", "regular"];
                 for target in target_words {
                     if new_name.contains(target) {
                          new_name = new_name.replace(target, weight_name);
                          changed = true;
                     }
                 }
                 
                 // If no replacement happened, maybe the name doesn't have the weight at all?
                 // e.g. "MiSans" (missing weight) but weight is 200
                 if !changed {
                      let weight_lower = weight_name.to_lowercase();
                      if !name_lower.contains(&weight_lower) {
                          // Append the weight
                          new_name = format!("{} {}", name, weight_name);
                      }
                 }
                 
                 full_name = Some(new_name);
            }
        }

        let variant = FontVariant {
            id,
            family: family.clone(),
            style: style_str.to_string(),
            weight: weight,
            path: path_str,
            postscript_name: Some(face_info.post_script_name.clone()),
            full_name,
            is_system_core,
        };

        families_map
            .entry(family)
            .or_insert(Vec::new())
            .push(variant);
    }

    let mut families: Vec<FontFamily> = families_map
        .into_iter()
        .map(|(family, mut variants)| {
            // Sort variants by weight then style
            variants.sort_by(|a, b| {
                if a.weight != b.weight {
                    a.weight.cmp(&b.weight)
                } else {
                    a.style.cmp(&b.style)
                }
            });
            FontFamily { family, variants }
        })
        .collect();

    families.sort_by(|a, b| a.family.cmp(&b.family));

    let total_families = families.len();
    let total_variants = families.iter().map(|f| f.variants.len()).sum();

    ListFontsResult {
        families,
        total_families,
        total_variants,
    }
}
