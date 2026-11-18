import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open, message } from '@tauri-apps/plugin-dialog';
import './Enclave.css';

export default function Enclave() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showModal, setShowModal] = useState(false);
  const [topTab, setTopTab] = useState('devices');
  const [volumes, setVolumes] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [broadcastInfo, setBroadcastInfo] = useState(null);

  const loadFiles = async () => {
    try {
      const files = await invoke('list_files');
      setVolumes(files);
      if (files.length > 0 && !selectedFile) {
        setSelectedFile(files[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const handleAddFile = async () => {
    try {
      const selected = await open({
        multiple: false,
        title: 'Select File to Encrypt'
      });
      if (selected) {
        await invoke('encrypt_file', { filePath: selected });
        await loadFiles();
      }
    } catch (error) {
      console.error("Failed to add file:", error);
    }
  };

  const handleDeleteClick = async (file) => {
    try {
      await invoke('delete_file', { fileName: file.path });
      setSelectedFile(null);
      await loadFiles();
    } catch (error) {
      console.error("Failed to delete file:", error);
    }
  };

  const [termLines, setTermLines] = useState([
    '> File loaded... OK',
    '> Verifying integrity... OK',
    '> Decryption keys available... OK',
    '> Awaiting command...'
  ]);
  const [isDecrypting, setIsDecrypting] = useState(false);

  useEffect(() => {
    // Reset terminal when a new file is selected
    setTermLines([
      '> File loaded... OK',
      '> Verifying integrity... OK',
      '> Decryption keys available... OK',
      '> Awaiting command...'
    ]);
    setIsDecrypting(false);
  }, [selectedFile]);

  const handleDecryptClick = async (file) => {
    if (isDecrypting) return;
    setIsDecrypting(true);
    setTermLines(prev => [...prev.slice(0, 3), '> Initiating decryption sequence...', '> Unlocking hardware enclave...']);
    
    try {
      // Simulate a small delay for visual effect
      await new Promise(resolve => setTimeout(resolve, 800));
      setTermLines(prev => [...prev, `> Decrypting ${file.path}...`]);
      await new Promise(resolve => setTimeout(resolve, 800));
      
      await invoke('decrypt_and_view', { fileName: file.path });
      
      setTermLines(prev => [...prev, '> Success. File opened securely.', '> Awaiting next command...']);
    } catch (error) {
      console.error("Failed to decrypt file:", error);
      setTermLines(prev => [...prev, `> ERROR: ${error}`, '> Awaiting command...']);
      await message("Decryption failed: " + error, { title: 'CipherVault Error', kind: 'error' });
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleShareClick = async (file) => {
    try {
      const info = await invoke('start_broadcast', { fileName: file.path });
      setBroadcastInfo(info);
      setShowModal(true);
    } catch (error) {
      console.error(error);
      await message(String(error), { title: 'CipherVault Error', kind: 'error' });
    }
  };

  const stopBroadcast = async () => {
    await invoke('stop_broadcast');
    setBroadcastInfo(null);
  };

  const copyToClipboard = async () => {
    navigator.clipboard.writeText(broadcastInfo?.ip || '');
    await message('Share link copied to clipboard!', { title: 'CipherVault', kind: 'info' });
  };

  const logs = [
    { time: '2023-10-27T08:14:02Z', level: 'INFO', node: 'device_8f72', msg: 'Dashboard accessed.' },
    { time: '2023-10-27T08:14:05Z', level: 'INFO', node: 'device_8f72', msg: 'Session established.' },
    { time: '2023-10-27T08:15:12Z', level: 'WARN', node: 'device_2c44', msg: 'Rate limit approached.' },
    { time: '2023-10-27T08:16:00Z', level: 'INFO', node: 'SYSTEM', msg: 'Vault index synchronized.' },
    { time: '2023-10-27T08:17:22Z', level: 'INFO', node: 'device_55p1', msg: 'File read request authorized.' },
  ];

  const renderIcon = (type) => {
    return <svg viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="14 2 14 8 20 8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  };

  return (
    <div className="tauri-app">
      {/* Global transparent drag region at the very top */}
      <div data-tauri-drag-region style={{height: '16px', width: '100%', position: 'absolute', top: 0, left: 0, zIndex: 9999}} />

      {/* Sidebar */}
      <div className="arch-sidebar">
        
        <div className="arch-logo">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline>
          </svg>
          <span>ENCLAVE</span>
        </div>
        
        <div className="arch-status">
          <div className="arch-dot"></div>
          <span className="text-label-caps" style={{color: 'var(--on-surface-variant)'}}>STATUS: SECURE</span>
        </div>

        <div className="arch-nav">
          <div className={`arch-nav-item ${activeTab === 'files' ? 'active' : ''}`} onClick={() => setActiveTab('files')}>
            <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 11V7a5 5 0 0 1 10 0v4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            My Files
          </div>
          <div className={`arch-nav-item ${activeTab === 'transfer' ? 'active' : ''}`} onClick={() => setActiveTab('transfer')}>
            <svg viewBox="0 0 24 24" fill="none"><polyline points="16 3 21 3 21 8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="4" y1="20" x2="21" y2="3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="21 16 21 21 16 21" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="15" y1="15" x2="21" y2="21" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="4" y1="4" x2="9" y2="9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Transfer
          </div>
          <div className={`arch-nav-item ${activeTab === 'keys' ? 'active' : ''}`} onClick={() => setActiveTab('keys')}>
            <svg viewBox="0 0 24 24" fill="none"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Keys
          </div>
          <div className={`arch-nav-item ${activeTab === 'activity' ? 'active' : ''}`} onClick={() => setActiveTab('activity')}>
            <svg viewBox="0 0 24 24" fill="none"><line x1="8" y1="6" x2="21" y2="6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="8" y1="12" x2="21" y2="12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="8" y1="18" x2="21" y2="18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="3" y1="6" x2="3.01" y2="6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="3" y1="12" x2="3.01" y2="12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="3" y1="18" x2="3.01" y2="18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Activity
          </div>
          <div className={`arch-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <svg viewBox="0 0 24 24" fill="none"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="8" y1="21" x2="16" y2="21" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="12" y1="17" x2="12" y2="21" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Dashboard
          </div>
        </div>

        <div className="arch-sidebar-footer">
          <button className="arch-btn-primary" onClick={handleAddFile}>
            + ADD NEW FILE
          </button>
          
          <div className="arch-sidebar-utils">
            <div className="arch-util-item">
              <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="4.93" y1="4.93" x2="9.17" y2="9.17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="14.83" y1="14.83" x2="19.07" y2="19.07" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="14.83" y1="9.17" x2="19.07" y2="4.93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="14.83" y1="9.17" x2="18.36" y2="5.64" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="4.93" y1="19.07" x2="9.17" y2="14.83" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Support
            </div>
            <div className="arch-util-item">
              <svg viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="7 10 12 15 17 10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="12" y1="15" x2="12" y2="3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Logs
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="arch-main">
        {/* Topbar */}
        <div className="arch-topbar">
          <div className="arch-topbar-title">
            {activeTab === 'activity' ? 'System Activity' : 'File Overview'}
          </div>
          
          <div className="arch-topbar-tabs">
            <div className={`arch-tab ${topTab === 'network' ? 'active' : ''}`} onClick={() => setTopTab('network')}>Network</div>
            <div className={`arch-tab ${topTab === 'devices' ? 'active' : ''}`} onClick={() => setTopTab('devices')}>Devices</div>
            <div className={`arch-tab ${topTab === 'history' ? 'active' : ''}`} onClick={() => setTopTab('history')}>History</div>
          </div>

          <div className="arch-topbar-icons">
            <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 11V7a5 5 0 0 1 10 0v4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        </div>

        <div className="arch-content">
          <div className="arch-section-header">
            <div className="arch-section-title">
              {activeTab === 'activity' ? 'System Event Stream' : 'Your Secure Files'}
            </div>
            {activeTab !== 'activity' && (
              <div className="arch-badge">
                <div className="arch-dot" style={{background: 'var(--primary)', width: '6px', height: '6px'}} />
                SYSTEM OPTIMAL
              </div>
            )}
          </div>

          {/* VIEW: DASHBOARD / FILES */}
          {(activeTab === 'dashboard' || activeTab === 'files') && (
            <div className="arch-grid">
              <div className="arch-list-container">
                <div className="arch-list-header">
                  <span>ENCRYPTED FILES</span>
                  <svg viewBox="0 0 24 24" fill="none" style={{width: '12px', height: '12px'}}><line x1="21" y1="10" x2="3" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="21" y1="6" x2="3" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="21" y1="14" x2="3" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="21" y1="18" x2="3" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                {volumes.length === 0 && (
                   <div style={{padding: '24px', textAlign: 'center', color: 'var(--outline)', fontSize: '12px'}}>No files in vault. Click + ADD NEW FILE</div>
                )}
                {volumes.map(vol => (
                  <div className={`arch-list-item ${selectedFile?.id === vol.id ? 'selected' : ''}`} key={vol.id} onClick={() => setSelectedFile(vol)}>
                    <div className="arch-item-icon">{renderIcon(vol.icon)}</div>
                    <div className="arch-item-info">
                      <div className="arch-item-name">{vol.path}</div>
                      <div className="arch-item-sub">Modified: {vol.modified}</div>
                    </div>
                    <div className="arch-item-meta">
                      <div className="arch-item-algo">{vol.algo}</div>
                      <div className={`arch-item-status ${vol.status === 'SECURE' ? 'active' : ''}`}>{vol.status}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="arch-inspect-panel">
                <div className="arch-inspect-header">FILE DETAILS</div>
                
                {selectedFile ? (
                  <>
                    <div className="arch-field-group">
                      <div className="arch-field-label">FILENAME</div>
                      <div className="arch-field-value">{selectedFile.path}</div>
                    </div>

                    <div className="arch-field-group">
                      <div className="arch-field-label">ENCRYPTION</div>
                      <div className="arch-hash-box">
                        {selectedFile.algo} - Hardware Bound
                      </div>
                    </div>

                    <div className="arch-row">
                      <div className="arch-metric-box">
                        <div className="arch-field-label">SIZE</div>
                        <div className="arch-field-value">{selectedFile.size}</div>
                      </div>
                      <div className="arch-metric-box">
                        <div className="arch-field-label">STATUS</div>
                        <div className="arch-field-value">{selectedFile.status}</div>
                      </div>
                    </div>

                    <div style={{marginTop: 'auto', display: 'flex', gap: '12px'}}>
                        <button className="arch-btn-outline" style={{flex: 1}} onClick={() => handleDecryptClick(selectedFile)}>DECRYPT & VIEW</button>
                        <button className="arch-btn-primary" style={{flex: 1, padding: '10px'}} onClick={() => handleShareClick(selectedFile)}>SHARE SECURELY</button>
                    </div>
                    <div style={{marginTop: '12px'}}>
                        <button className="arch-btn-outline" style={{width: '100%', borderColor: 'var(--error)', color: 'var(--error)'}} onClick={() => handleDeleteClick(selectedFile)}>REMOVE FROM VAULT</button>
                    </div>

                    <div className="arch-term-box">
                      {termLines.map((line, idx) => (
                        <div key={idx}>{line}</div>
                      ))}
                      <div style={{animation: 'blink 1s infinite'}}>_</div>
                    </div>
                  </>
                ) : (
                    <div style={{color: 'var(--outline)', fontSize: '11px', textAlign: 'center', marginTop: '40px'}}>Select a file to view details.</div>
                )}
              </div>
            </div>
          )}

          {/* VIEW: ACTIVITY LOGS */}
          {activeTab === 'activity' && (
            <div className="arch-logs-container">
              <div className="arch-log-viewer">
                <div className="arch-log-header">
                  <div style={{display: 'flex', gap: '8px'}}>
                    <div className="arch-dot" style={{background: 'var(--outline-variant)'}}></div>
                    <div className="arch-dot" style={{background: 'var(--outline-variant)'}}></div>
                    <div className="arch-dot" style={{background: 'var(--outline-variant)'}}></div>
                  </div>
                  <div>/VAR/LOG/SYSTEM.LOG</div>
                  <div style={{display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)'}}>
                    <div className="arch-dot" style={{background: 'var(--primary)', boxShadow: '0 0 6px var(--primary)'}}></div>
                    STREAMING
                  </div>
                </div>

                <div className="arch-log-table">
                  <div className="arch-log-row" style={{borderBottom: '1px solid var(--outline-variant)', background: 'var(--surface)'}}>
                    <div className="arch-field-label">TIMESTAMP</div>
                    <div className="arch-field-label">LEVEL</div>
                    <div className="arch-field-label">DEVICE</div>
                    <div className="arch-field-label">EVENT</div>
                  </div>
                  {logs.map((log, i) => (
                    <div className="arch-log-row" key={i}>
                      <div className="arch-log-time">{log.time}</div>
                      <div><span className={`arch-tag ${log.level.toLowerCase()}`}>{log.level}</span></div>
                      <div className="arch-log-node">{log.node}</div>
                      <div className="arch-log-msg">{log.msg}</div>
                    </div>
                  ))}
                  <div className="arch-log-row" style={{borderBottom: 'none'}}>
                    <div colSpan={4} style={{display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--outline)'}}>
                      <svg viewBox="0 0 24 24" fill="none" style={{width: '12px'}}><polyline points="1 4 1 10 7 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Awaiting new events...
                    </div>
                  </div>
                </div>
              </div>

              <div className="arch-telemetry">
                <div className="arch-tel-section">
                  <div className="arch-tel-title">SYSTEM STATS</div>
                  <div className="arch-tel-grid">
                    <div className="arch-tel-item">
                      <div className="arch-tel-label">Vault Size</div>
                      <div className="arch-tel-val">{(volumes.length * 14.2).toFixed(1)}MB</div>
                    </div>
                    <div className="arch-tel-item">
                      <div className="arch-tel-label">Files</div>
                      <div className="arch-tel-val">{volumes.length}</div>
                    </div>
                    {broadcastInfo && (
                        <div style={{marginTop: '16px', padding: '16px', background: '#201f22', border: '1px solid #444748'}}>
                            <div style={{fontSize: '12px', color: '#ffb4ab', marginBottom: '12px', fontWeight: 'bold'}}>BROADCAST ACTIVE</div>
                            
                            <div style={{fontSize: '12px', color: '#c4c7c8', marginBottom: '4px'}}>LOCAL NETWORK URL</div>
                            <div style={{fontFamily: "'JetBrains Mono', monospace", color: '#ffffff', fontSize: '14px', marginBottom: '12px', wordBreak: 'break-all'}}>{broadcastInfo.ip}</div>
                            
                            <div style={{fontSize: '12px', color: '#c4c7c8', marginBottom: '4px'}}>DECRYPTION PIN</div>
                            <div style={{fontFamily: "'JetBrains Mono', monospace", color: '#ffffff', fontSize: '24px', marginBottom: '16px', letterSpacing: '4px', fontWeight: 'bold'}}>{broadcastInfo.pin}</div>
                            
                            <button className="arch-btn-outline" style={{width: '100%', borderColor: '#ffb4ab', color: '#ffb4ab'}} onClick={stopBroadcast}>KILL BROADCAST</button>
                        </div>
                    )}
                    <div className="arch-tel-item">
                      <div className="arch-tel-label">Sync Status</div>
                      <div className="arch-tel-val" style={{fontSize: '16px', marginTop: '6px'}}>Synced</div>
                    </div>
                    <div className="arch-tel-item">
                      <div className="arch-tel-label">Uptime</div>
                      <div className="arch-tel-val">99.9%</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Share Modal Overlay */}
      {showModal && broadcastInfo && (
        <div className="arch-overlay">
          <div className="arch-modal">
            <div className="arch-modal-header">
              <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                <svg viewBox="0 0 24 24" fill="none" style={{width: '18px', height: '18px'}}><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="16 6 12 2 8 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="12" y1="2" x2="12" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Broadcast Active
              </div>
              <svg viewBox="0 0 24 24" fill="none" style={{width: '18px', height: '18px', cursor: 'pointer', color: 'var(--outline)'}} onClick={() => { setShowModal(false); stopBroadcast(); }}><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            
            <div className="arch-modal-body">
              <p style={{color: 'var(--outline)', fontSize: '14px', lineHeight: '1.5', marginTop: '0', marginBottom: '24px'}}>
                CipherVault is hosting a secure global relay via SSH tunnel. Share the link below with anyone, anywhere.
              </p>
              
              <div className="arch-input-group">
                <div className="arch-input-label">GLOBAL RELAY URL</div>
                <div className="arch-input-wrapper">
                  <input type="text" className="arch-input" readOnly value={broadcastInfo.ip} />
                  <button className="arch-input-btn" onClick={() => navigator.clipboard.writeText(broadcastInfo.ip)}>COPY</button>
                </div>
              </div>

              <div className="arch-input-group" style={{marginTop: '16px'}}>
                <div className="arch-input-label">DECRYPTION PIN</div>
                <div className="arch-input-wrapper">
                  <input type="text" className="arch-input" readOnly value={broadcastInfo.pin} style={{fontSize: '24px', letterSpacing: '8px', textAlign: 'center', color: '#ffb4ab', fontWeight: 'bold'}} />
                </div>
              </div>
                
              <div className="arch-warning-box" style={{marginTop: '24px'}}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{minWidth: '16px'}}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <div>Keep this tab open. The broadcast will shut down automatically if this window is closed.</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
