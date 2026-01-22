use serde::{Deserialize, Serialize};
use std::fs;
use tauri::{AppHandle, Manager};
use uuid::Uuid;
use chrono::Utc;

#[derive(Serialize, Deserialize, Clone)]
struct Note {
    id: String,
    title: String,
    content: String,
    timestamp: i64,
}

#[tauri::command]
fn save_note(app: AppHandle, title: String, content: String) -> Result<String, String> {
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    
    // Create app data directory if it doesn't exist
    if !app_data_dir.exists() {
        fs::create_dir_all(&app_data_dir)
            .map_err(|e| format!("Failed to create app data directory: {}", e))?;
    }
    
    let notes_file = app_data_dir.join("notes.json");
    
    // Load existing notes or create new list
    let mut notes: Vec<Note> = if notes_file.exists() {
        let content = fs::read_to_string(&notes_file)
            .map_err(|e| format!("Failed to read notes file: {}", e))?;
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        Vec::new()
    };
    
    // Create new note
    let note = Note {
        id: Uuid::new_v4().to_string(),
        title,
        content,
        timestamp: Utc::now().timestamp(),
    };
    
    notes.push(note.clone());
    
    // Save notes back to file
    let notes_json = serde_json::to_string_pretty(&notes)
        .map_err(|e| format!("Failed to serialize notes: {}", e))?;
    
    fs::write(&notes_file, notes_json)
        .map_err(|e| format!("Failed to write notes file: {}", e))?;
    
    Ok(note.id)
}

#[tauri::command]
fn load_notes(app: AppHandle) -> Result<Vec<Note>, String> {
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    
    let notes_file = app_data_dir.join("notes.json");
    
    if !notes_file.exists() {
        return Ok(Vec::new());
    }
    
    let content = fs::read_to_string(&notes_file)
        .map_err(|e| format!("Failed to read notes file: {}", e))?;
    
    let notes: Vec<Note> = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse notes file: {}", e))?;
    
    Ok(notes)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![save_note, load_notes])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
