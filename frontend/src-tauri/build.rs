use std::path::PathBuf;
use std::env;

fn main() {
  // Standard Tauri build
  tauri_build::build();
  
  // Only check for backend binary in release builds
  if env::var("PROFILE").unwrap_or_default() == "release" {
    let backend_binary = PathBuf::from("binaries").join("backend-server");
    
    if !backend_binary.exists() {
      println!("cargo:warning=Backend binary not found at {:?}", backend_binary);
      println!("cargo:warning=Run the backend build script first: npm run tauri:build-backend");
      println!("cargo:warning=This is only needed for production builds");
    } else {
      println!("cargo:warning=Backend binary found at {:?}", backend_binary);
    }
  } else {
    println!("cargo:warning=Development mode: Backend binary check skipped");
    println!("cargo:warning=Make sure to start the backend manually: cd backend && uvicorn main:app --reload");
  }
}
