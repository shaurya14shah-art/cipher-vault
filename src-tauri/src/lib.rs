use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Key, Nonce,
};
use std::fs;

#[tauri::command]
fn encrypt_file(file_path: String) -> Result<String, String> {
    let data = fs::read(&file_path).map_err(|e| e.to_string())?;
    
    // Simulated Hardware-Bound Enclave Key
    let key = Key::<Aes256Gcm>::from_slice(b"ciphervault_hardware_key_32bytes");
    let cipher = Aes256Gcm::new(key);
    
    let nonce_bytes: [u8; 12] = rand::random();
    let nonce = Nonce::from_slice(&nonce_bytes);
    
    let mut payload = b"CVLT".to_vec();
    payload.push(0); // share_count = 0
    payload.extend_from_slice(&data);
    
    let encrypted_data = cipher.encrypt(nonce, payload.as_ref()).map_err(|e| format!("Encryption failed: {}", e))?;
    
    let mut final_payload = nonce_bytes.to_vec();
    final_payload.extend_from_slice(&encrypted_data);
    
    // Create dedicated vault folder on Desktop for easy access
    let home = std::env::var("HOME").unwrap_or_else(|_| "/Users/shauryashah".to_string());
    let vault_dir = format!("{}/Desktop/CipherVault_Enclave", home);
    fs::create_dir_all(&vault_dir).map_err(|e| e.to_string())?;
    
    let original_name = std::path::Path::new(&file_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("encrypted_file");
        
    let out_path = format!("{}/{}.cvault", vault_dir, original_name);
    fs::write(&out_path, final_payload).map_err(|e| e.to_string())?;
    
    Ok(out_path)
}

#[derive(serde::Serialize)]
struct VaultFile {
    id: usize,
    path: String,
    modified: String,
    algo: String,
    status: String,
    icon: String,
    size: String,
}

#[tauri::command]
fn list_files() -> Result<Vec<VaultFile>, String> {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/Users/shauryashah".to_string());
    let vault_dir = format!("{}/Desktop/CipherVault_Enclave", home);
    
    let _ = fs::create_dir_all(&vault_dir);
    
    let mut files = Vec::new();
    if let Ok(entries) = fs::read_dir(&vault_dir) {
        for (i, entry) in entries.flatten().enumerate() {
            if let Ok(meta) = entry.metadata() {
                if meta.is_file() {
                    let name = entry.file_name().to_string_lossy().to_string();
                    let size_mb = (meta.len() as f64) / 1_048_576.0;
                    
                    files.push(VaultFile {
                        id: i,
                        path: name,
                        modified: "Just now".to_string(),
                        algo: "AES-256-GCM".to_string(),
                        status: "SECURE".to_string(),
                        icon: "file".to_string(),
                        size: format!("{:.2} MB", size_mb),
                    });
                }
            }
        }
    }
    Ok(files)
}

#[tauri::command]
fn delete_file(file_name: String) -> Result<(), String> {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/Users/shauryashah".to_string());
    let vault_dir = format!("{}/Desktop/CipherVault_Enclave", home);
    
    if file_name.contains('/') || file_name.contains('\\') {
        return Err("Invalid file name".to_string());
    }
    
    let file_path = format!("{}/{}", vault_dir, file_name);
    fs::remove_file(&file_path).map_err(|e| format!("Failed to delete file: {}", e))?;
    
    Ok(())
}

use tauri_plugin_opener::OpenerExt;

#[tauri::command]
fn decrypt_and_view(app: tauri::AppHandle, file_name: String) -> Result<(), String> {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/Users/shauryashah".to_string());
    let vault_dir = format!("{}/Desktop/CipherVault_Enclave", home);
    let out_dir = format!("{}/Desktop/CipherVault_Decrypted", home);
    
    let _ = fs::create_dir_all(&out_dir);
    
    if file_name.contains('/') || file_name.contains('\\') {
        return Err("Invalid file name".to_string());
    }
    
    let file_path = format!("{}/{}", vault_dir, file_name);
    let data = fs::read(&file_path).map_err(|e| format!("Failed to read file: {}", e))?;
    
    if data.len() < 12 {
        return Err("Invalid or corrupted file payload".to_string());
    }
    
    let (nonce_bytes, ciphertext) = data.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);
    
    let key = Key::<Aes256Gcm>::from_slice(b"ciphervault_hardware_key_32bytes");
    let cipher = Aes256Gcm::new(key);
    
    let decrypted_data = cipher.decrypt(nonce, ciphertext).map_err(|e| format!("Decryption failed: {}", e))?;
    
    let actual_data = if decrypted_data.starts_with(b"CVLT") && decrypted_data.len() >= 5 {
        &decrypted_data[5..]
    } else {
        &decrypted_data[..]
    };
    
    let raw_name = file_name.strip_suffix(".cvault").unwrap_or(&file_name);
    let out_path = format!("{}/{}", out_dir, raw_name);
    
    fs::write(&out_path, actual_data).map_err(|e| e.to_string())?;
    
    app.opener().open_path(&out_path, None::<&str>).map_err(|e| e.to_string())?;
    
    Ok(())
}

use std::process::{Command, Stdio, Child};
use std::io::{Read, Write, BufReader, BufRead};
use std::thread;
use std::sync::Mutex;
use sha2::{Sha256, Digest};

struct ServerState {
    active: bool,
    tunnel_child: Option<Child>,
}

lazy_static::lazy_static! {
    static ref BROADCAST_ACTIVE: Mutex<ServerState> = Mutex::new(ServerState {
        active: false,
        tunnel_child: None,
    });
}

#[derive(serde::Serialize)]
struct BroadcastInfo {
    ip: String,
    pin: String,
}

#[tauri::command]
async fn start_broadcast(file_name: String) -> Result<BroadcastInfo, String> {
        {
            let mut state = BROADCAST_ACTIVE.lock().unwrap();
            if state.active {
                return Err("A broadcast is already active. Please stop it first.".to_string());
            }
            state.active = true;
        }
        
        let pin_num: u32 = rand::random::<u32>() % 1000000;
        let pin = format!("{:06}", pin_num);
        
        let home = std::env::var("HOME").unwrap_or_else(|_| "/Users/shauryashah".to_string());
        let vault_dir = format!("{}/Desktop/CipherVault_Enclave", home);
        let file_path = format!("{}/{}", vault_dir, file_name);
        
        let data = match fs::read(&file_path) {
            Ok(d) => d,
            Err(e) => {
                BROADCAST_ACTIVE.lock().unwrap().active = false;
                return Err(format!("Failed to read file: {}", e));
            }
        };
        
        if data.len() < 12 {
            BROADCAST_ACTIVE.lock().unwrap().active = false;
            return Err("Invalid payload".to_string());
        }
        
        let (nonce_bytes, ciphertext) = data.split_at(12);
        let master_nonce = Nonce::from_slice(nonce_bytes);
        let master_key = Key::<Aes256Gcm>::from_slice(b"ciphervault_hardware_key_32bytes");
        let master_cipher = Aes256Gcm::new(master_key);
        let raw_data = match master_cipher.decrypt(master_nonce, ciphertext) {
            Ok(d) => d,
            Err(e) => {
                BROADCAST_ACTIVE.lock().unwrap().active = false;
                return Err(e.to_string());
            }
        };
        
        let (share_count, actual_data) = if raw_data.starts_with(b"CVLT") && raw_data.len() >= 5 {
            (raw_data[4], &raw_data[5..])
        } else {
            (0u8, &raw_data[..])
        };
        
        if share_count > 0 {
            if let Ok(mut f) = fs::File::create(&file_path) {
                let garbage: Vec<u8> = (0..1024).map(|_| rand::random::<u8>()).collect();
                let _ = std::io::Write::write_all(&mut f, &garbage);
            }
            BROADCAST_ACTIVE.lock().unwrap().active = false;
            return Err("SECURITY BREACH: Resharing is prohibited. The file has been corrupted and destroyed.".to_string());
        }
        
        let mut receiver_payload = b"CVLT".to_vec();
        receiver_payload.push(1);
        receiver_payload.extend_from_slice(actual_data);
        
        let receiver_nonce_bytes: [u8; 12] = rand::random();
        let receiver_nonce = Nonce::from_slice(&receiver_nonce_bytes);
        let receiver_ciphertext = match master_cipher.encrypt(receiver_nonce, receiver_payload.as_ref()) {
            Ok(d) => d,
            Err(e) => {
                BROADCAST_ACTIVE.lock().unwrap().active = false;
                return Err(e.to_string());
            }
        };
        
        let mut receiver_cvault = receiver_nonce_bytes.to_vec();
        receiver_cvault.extend_from_slice(&receiver_ciphertext);
        
        let mut hasher = Sha256::new();
        hasher.update(pin.as_bytes());
        let pin_key_bytes = hasher.finalize();
        
        let pin_key = Key::<Aes256Gcm>::from_slice(&pin_key_bytes);
        let pin_cipher = Aes256Gcm::new(pin_key);
        
        let new_nonce_bytes: [u8; 12] = rand::random();
        let new_nonce = Nonce::from_slice(&new_nonce_bytes);
        let encrypted_for_web = match pin_cipher.encrypt(new_nonce, receiver_cvault.as_ref()) {
            Ok(d) => d,
            Err(e) => {
                BROADCAST_ACTIVE.lock().unwrap().active = false;
                return Err(e.to_string());
            }
        };
        
        let mut web_payload = new_nonce_bytes.to_vec();
        web_payload.extend_from_slice(&encrypted_for_web);
        
        let raw_name = file_name.strip_suffix(".cvault").unwrap_or(&file_name).to_string();
        
        thread::spawn(move || {
            let listener = match std::net::TcpListener::bind("0.0.0.0:8765") {
                Ok(l) => l,
                Err(_) => {
                    let mut st = BROADCAST_ACTIVE.lock().unwrap();
                    st.active = false;
                    if let Some(mut child) = st.tunnel_child.take() {
                        let _ = child.kill();
                    }
                    return;
                }
            };
            
            for stream in listener.incoming() {
                if !BROADCAST_ACTIVE.lock().unwrap().active {
                    break;
                }
                
                if let Ok(mut stream) = stream {
                    let _ = stream.set_read_timeout(Some(std::time::Duration::from_secs(2)));
                    let mut buffer = [0; 1024];
                    if stream.read(&mut buffer).is_ok() {
                        let request = String::from_utf8_lossy(&buffer);
                        if request.starts_with("GET / ") {
                            let html = include_str!("webdrop.html");
                            let response = format!(
                                "HTTP/1.1 200 OK\r\nConnection: close\r\nCache-Control: no-cache, no-store, must-revalidate\r\nContent-Length: {}\r\nContent-Type: text/html\r\n\r\n{}",
                                html.len(),
                                html
                            );
                            let _ = stream.write_all(response.as_bytes());
                            let _ = stream.flush();
                        } else if request.starts_with("GET /payload") {
                            let response_header = format!(
                                "HTTP/1.1 200 OK\r\nConnection: close\r\nCache-Control: no-cache, no-store, must-revalidate\r\nContent-Length: {}\r\nContent-Type: application/octet-stream\r\nAccess-Control-Allow-Origin: *\r\n\r\n",
                                web_payload.len()
                            );
                            let _ = stream.write_all(response_header.as_bytes());
                            let _ = stream.write_all(&web_payload);
                            let _ = stream.flush();
                        } else if request.starts_with("GET /meta") {
                            let json = format!(r#"{{"filename": "{}.cvault"}}"#, raw_name);
                            let response = format!(
                                "HTTP/1.1 200 OK\r\nConnection: close\r\nCache-Control: no-cache, no-store, must-revalidate\r\nContent-Length: {}\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\n\r\n{}",
                                json.len(),
                                json
                            );
                            let _ = stream.write_all(response.as_bytes());
                            let _ = stream.flush();
                        } else {
                            let response = "HTTP/1.1 404 Not Found\r\nConnection: close\r\nContent-Length: 0\r\n\r\n";
                            let _ = stream.write_all(response.as_bytes());
                            let _ = stream.flush();
                        }
                    }
                    let _ = stream.shutdown(std::net::Shutdown::Both);
                }
            }
        });

        let mut tunnel_child = match Command::new("ssh")
            .args(&[
                "-o", "StrictHostKeyChecking=no",
                "-o", "BatchMode=yes",
                "-o", "PasswordAuthentication=no",
                "-o", "PubkeyAuthentication=no",
                "-o", "KbdInteractiveAuthentication=no",
                "-R", "80:localhost:8765",
                "nokey@localhost.run"
            ])
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn() {
                Ok(child) => child,
                Err(e) => {
                    BROADCAST_ACTIVE.lock().unwrap().active = false;
                    return Err(e.to_string());
                }
            };

        let stdout = tunnel_child.stdout.take().unwrap();
        let (tx, rx) = std::sync::mpsc::channel();
        
        thread::spawn(move || {
            let mut reader = BufReader::new(stdout);
            let mut line = String::new();
            for _ in 0..30 {
                line.clear();
                if let Ok(bytes) = reader.read_line(&mut line) {
                    if bytes == 0 { break; }
                    if line.contains(" tunneled with tls termination, ") {
                        let _ = tx.send(line.clone());
                        break;
                    }
                } else {
                    break;
                }
            }
        });

        let mut url = String::new();
        match rx.recv_timeout(std::time::Duration::from_secs(25)) {
            Ok(line) => {
                if let Some(pos) = line.find("https://") {
                    let raw_url = line[pos..].trim().to_string();
                    let numeric_id: String = raw_url.chars().map(|c| format!("{:03}", c as u8)).collect();
                    url = format!("https://ciphervault-app.surge.sh/{}", numeric_id);
                }
            },
            Err(_) => {
                let _ = tunnel_child.kill();
                BROADCAST_ACTIVE.lock().unwrap().active = false;
                return Err("Network timeout: Could not connect to relay. Your network may be blocking SSH (port 22).".to_string());
            }
        }

        if url.is_empty() {
            let _ = tunnel_child.kill();
            BROADCAST_ACTIVE.lock().unwrap().active = false;
            return Err("Failed to establish secure tunnel via Serveo. Please try again.".to_string());
        }

        {
            let mut state = BROADCAST_ACTIVE.lock().unwrap();
            state.tunnel_child = Some(tunnel_child);
        }

        Ok(BroadcastInfo {
            ip: url,
            pin,
        })
}

#[tauri::command]
fn stop_broadcast() {
    let mut state = BROADCAST_ACTIVE.lock().unwrap();
    state.active = false;
    if let Some(mut child) = state.tunnel_child.take() {
        let _ = child.kill();
    }
    let _ = std::net::TcpStream::connect("127.0.0.1:8765");
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![encrypt_file, list_files, delete_file, decrypt_and_view, start_broadcast, stop_broadcast])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
