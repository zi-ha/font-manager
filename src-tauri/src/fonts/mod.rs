use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FontVariant {
    pub id: String,
    pub family: String,
    pub style: String,
    pub weight: u16,
    pub path: String,
    pub postscript_name: Option<String>,
    pub full_name: Option<String>,
    pub is_system_core: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FontFamily {
    pub family: String,
    pub variants: Vec<FontVariant>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ListFontsResult {
    pub families: Vec<FontFamily>,
    pub total_families: usize,
    pub total_variants: usize,
}

pub mod enumerate;
pub mod install;
pub mod preview;
pub mod uninstall;
