use std::process::{Child, Command};
use std::sync::Mutex;
use std::thread;
use std::time::Duration;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

// Global state to hold the backend process
struct BackendProcess(Mutex<Option<Child>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
    .plugin(tauri_plugin_updater::Builder::new().build())
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

        // Get and start the sidecar binary path.
        let result = tauri::async_runtime::spawn_blocking(move || -> Result<Child, String> {
            let sidecar_path = resolve_backend_sidecar_path(&handle_clone)
                .ok_or_else(|| "Unable to resolve backend sidecar path in app bundle".to_string())?;

            log::info!("Backend sidecar path: {:?}", sidecar_path);

            Command::new(&sidecar_path)
                .spawn()
                .map_err(|err| format!("Failed to start backend sidecar at {:?}: {}", sidecar_path, err))
        })
        .await;

        match result {
            Ok(Ok(child)) => {
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
            Ok(Err(e)) => {
                log::error!("Failed to start backend sidecar: {}", e);
            }
            Err(e) => {
                log::error!("Failed to start backend sidecar task: {}", e);
            }
        }
    });
}

fn backend_binary_name() -> &'static str {
    if cfg!(target_os = "windows") {
        "backend-server.exe"
    } else {
        "backend-server"
    }
}

fn resolve_backend_sidecar_path(app_handle: &AppHandle) -> Option<PathBuf> {
    let binary_name = backend_binary_name();
    let mut candidates: Vec<PathBuf> = Vec::new();

    if let Ok(executable_dir) = app_handle.path().executable_dir() {
        candidates.push(executable_dir.join(binary_name));
    }

    if let Ok(resource_dir) = app_handle.path().resource_dir() {
        candidates.push(resource_dir.join("binaries").join(binary_name));
        candidates.push(resource_dir.join(binary_name));
    }

    if let Ok(current_exe) = std::env::current_exe() {
        if let Some(parent) = current_exe.parent() {
            candidates.push(parent.join(binary_name));
        }
    }

    for candidate in &candidates {
        if candidate.exists() {
            return Some(candidate.clone());
        }
    }

    log::error!(
        "Backend sidecar not found. Checked locations: {:?}",
        candidates
    );
    None
}
