use tauri::{Manager, AppHandle};
use std::process::{Command, Child};
use std::sync::Mutex;
use std::time::Duration;
use std::thread;

// Global state to hold the backend process
struct BackendProcess(Mutex<Option<Child>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_log::Builder::default().build())
    .manage(BackendProcess(Mutex::new(None)))
    .setup(|app| {
      let handle = app.handle().clone();
      
      // Only start sidecar in production builds
      if !cfg!(debug_assertions) {
        start_backend_sidecar(handle);
      } else {
        log::info!("Development mode: Backend should be started manually with `uvicorn main:app --reload` in backend directory");
      }
      
      Ok(())
    })
    .on_window_event(|window, event| {
      if let tauri::WindowEvent::CloseRequested { .. } = event {
        // Cleanup backend process on window close
        if let Some(backend_state) = window.try_state::<BackendProcess>() {
          if let Ok(mut process_guard) = backend_state.0.lock() {
            if let Some(mut child) = process_guard.take() {
              log::info!("Terminating backend process...");
              let _ = child.kill();
              let _ = child.wait();
            }
          }
        }
      }
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

fn start_backend_sidecar(app_handle: AppHandle) {
  let handle_clone = app_handle.clone();
  
  tauri::async_runtime::spawn(async move {
    log::info!("Starting backend sidecar...");
    
    // Get the sidecar binary path
    let result = tauri::async_runtime::spawn_blocking(move || {
      // Resolve the sidecar path based on platform
      let binary_name = if cfg!(target_os = "windows") {
        "backend-server.exe"
      } else {
        "backend-server"
      };
      
      let sidecar_path = handle_clone
        .path()
        .resource_dir()
        .expect("Failed to get resource dir")
        .join("binaries")
        .join(binary_name);
      
      log::info!("Backend sidecar path: {:?}", sidecar_path);
      
      // Start the backend process
      Command::new(&sidecar_path)
        .spawn()
        .expect("Failed to start backend sidecar")
    }).await;
    
    match result {
      Ok(child) => {
        log::info!("Backend sidecar started successfully");
        
        // Store the process handle
        if let Some(backend_state) = app_handle.try_state::<BackendProcess>() {
          if let Ok(mut process_guard) = backend_state.0.lock() {
            *process_guard = Some(child);
          }
        }
        
        // Wait a bit for backend to start
        thread::sleep(Duration::from_secs(2));
        log::info!("Backend should be ready on http://localhost:8000");
      }
      Err(e) => {
        log::error!("Failed to start backend sidecar: {}", e);
      }
    }
  });
}
