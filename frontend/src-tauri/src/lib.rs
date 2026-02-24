use std::io::{Read, Write};
use std::net::{SocketAddr, TcpStream};
use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::Mutex;
use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Manager};

// Global state to hold the backend process
struct BackendProcess(Mutex<Option<Child>>);

const BACKEND_PORT: u16 = 8000;
const BACKEND_READY_TIMEOUT_SECONDS: u64 = 15;
const BACKEND_READY_POLL_MS: u64 = 250;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_process::init())
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
            let sidecar_path = resolve_backend_sidecar_path(&handle_clone).ok_or_else(|| {
                "Unable to resolve backend sidecar path in app bundle".to_string()
            })?;

            log::info!("Backend sidecar path: {:?}", sidecar_path);

            Command::new(&sidecar_path).spawn().map_err(|err| {
                format!(
                    "Failed to start backend sidecar at {:?}: {}",
                    sidecar_path, err
                )
            })
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

                let ready_result = tauri::async_runtime::spawn_blocking(|| {
                    wait_for_backend_ready(Duration::from_secs(BACKEND_READY_TIMEOUT_SECONDS))
                })
                .await;

                match ready_result {
                    Ok(true) => {
                        log::info!("Backend ready on http://127.0.0.1:{}", BACKEND_PORT);
                    }
                    Ok(false) => {
                        log::error!(
                            "Backend did not become ready within {} seconds",
                            BACKEND_READY_TIMEOUT_SECONDS
                        );
                    }
                    Err(err) => {
                        log::error!("Backend readiness check task failed: {}", err);
                    }
                }
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

fn wait_for_backend_ready(timeout: Duration) -> bool {
    let deadline = Instant::now() + timeout;

    loop {
        if backend_health_ok(BACKEND_PORT) {
            return true;
        }

        if Instant::now() >= deadline {
            return false;
        }

        thread::sleep(Duration::from_millis(BACKEND_READY_POLL_MS));
    }
}

fn backend_health_ok(port: u16) -> bool {
    let socket = SocketAddr::from(([127, 0, 0, 1], port));
    let timeout = Duration::from_millis(500);

    let mut stream = match TcpStream::connect_timeout(&socket, timeout) {
        Ok(stream) => stream,
        Err(_) => return false,
    };

    let _ = stream.set_read_timeout(Some(timeout));
    let _ = stream.set_write_timeout(Some(timeout));

    let request = b"GET /health HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n";
    if stream.write_all(request).is_err() {
        return false;
    }

    let mut response = String::new();
    if stream.read_to_string(&mut response).is_err() {
        return false;
    }

    response_is_success(&response)
}

fn response_is_success(response: &str) -> bool {
    response
        .lines()
        .next()
        .is_some_and(|line| line.starts_with("HTTP/1.1 200") || line.starts_with("HTTP/1.0 200"))
}

#[cfg(test)]
mod tests {
    use super::response_is_success;

    #[test]
    fn response_is_success_for_http_11_200() {
        let response = "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n{}";
        assert!(response_is_success(response));
    }

    #[test]
    fn response_is_success_for_http_10_200() {
        let response = "HTTP/1.0 200 OK\r\nContent-Type: text/plain\r\n\r\nok";
        assert!(response_is_success(response));
    }

    #[test]
    fn response_is_not_success_for_non_200() {
        let response = "HTTP/1.1 503 Service Unavailable\r\n\r\n";
        assert!(!response_is_success(response));
    }

    #[test]
    fn response_is_not_success_for_invalid_payload() {
        assert!(!response_is_success("not-http"));
    }
}
