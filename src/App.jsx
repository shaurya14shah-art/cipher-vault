import React, { useEffect, useRef, useState } from 'react';
import Enclave from './Enclave.jsx';
import './index.css';

// Simple lerp function for smooth physics
const lerp = (start, end, amt) => start + (end - start) * amt;
const lerpColor = (start, end, amt) => Math.round(start + (end - start) * amt);

function App() {
  const isDesktop = window.__TAURI_INTERNALS__ !== undefined || window.__TAURI__ !== undefined;
  
  if (isDesktop) {
    return <Enclave />;
  }

  // Web Browser Routing Check
  const rawPath = window.location.pathname.replace(/^\/+/, '');
  if (rawPath.length > 5 && !isNaN(rawPath)) {
    // Decode numeric ID back to ASCII URL
    let decodedUrl = '';
    for(let i=0; i<rawPath.length; i+=3) {
      decodedUrl += String.fromCharCode(parseInt(rawPath.substr(i, 3), 10));
    }
    return (
      <iframe 
        title="Secure Sandbox"
        src={`/viewer.html?relay=${encodeURIComponent(decodedUrl)}`} 
        style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', border: 'none', zIndex: 9999, background: '#0a0a0c' }} 
      />
    );
  }

  const [isEnclaveOpen, setIsEnclaveOpen] = useState(false);
  const [hovering, setHovering] = useState(false);
  const canvasRef = useRef(null);
  const scrollState = useRef({ target: 0, current: 0 });
  const containerRef = useRef(null);

  const heroRef = useRef(null);
  const feature1Ref = useRef(null);
  const feature2Ref = useRef(null);
  const feature3Ref = useRef(null);
  const vaultExplorerRef = useRef(null);
  const downloadBoxRef = useRef(null);
  const thankYouRef = useRef(null);
  
  const cursorRef = useRef(null);
  const cursorDotRef = useRef(null);
  const mouseState = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2, cursorX: window.innerWidth / 2, cursorY: window.innerHeight / 2 });

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      scrollState.current.target = y / 1000;
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const onMouseMove = (e) => {
      mouseState.current.x = e.clientX;
      mouseState.current.y = e.clientY;
      if (cursorDotRef.current) {
        cursorDotRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
      }
      
      document.querySelectorAll('.feature-card').forEach(card => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
      });
    };

    let animId;
    const animateCursor = () => {
      let { x, y, cursorX, cursorY } = mouseState.current;
      cursorX += (x - cursorX) * 0.15;
      cursorY += (y - cursorY) * 0.15;
      mouseState.current.cursorX = cursorX;
      mouseState.current.cursorY = cursorY;
      
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0) translate(-50%, -50%)`;
      }
      animId = requestAnimationFrame(animateCursor);
    };

    window.addEventListener('mousemove', onMouseMove);
    animId = requestAnimationFrame(animateCursor);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(animId);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const particles = [];
    const spacing = 16;
    const cols = Math.floor(width / spacing) + 2;
    const rows = Math.floor(height / spacing) + 2;

    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        particles.push({
          index: particles.length,
          baseX: x * spacing,
          baseY: y * spacing,
          x: x * spacing,
          y: y * spacing,
          vx: 0,
          vy: 0,
          char: Math.random() > 0.5 ? '1' : '0'
        });
      }
    }

    let frameId;
    let time = 0;
    const GOLDEN_ANGLE = 137.5 * (Math.PI / 180);

    const draw = () => {
      time += 0.02;
      
      scrollState.current.current = lerp(scrollState.current.current, scrollState.current.target, 0.06);
      const S = scrollState.current.current; 

      if (heroRef.current) {
        const fade = Math.min(1, Math.max(0, S / 0.6));
        heroRef.current.style.opacity = 1 - fade;
        heroRef.current.style.transform = `translate(-50%, -50%) scale(${1 - (fade * 0.1)})`;
        heroRef.current.style.filter = `blur(${fade * 15}px)`;
      }

      if (feature1Ref.current) {
        const inFade = Math.min(1, Math.max(0, (S - 1.4) / 0.4));
        const outFade = Math.min(1, Math.max(0, (S - 3.0) / 0.4));
        feature1Ref.current.style.opacity = inFade * (1 - outFade);
        feature1Ref.current.style.transform = `translate(-50%, -50%) translateX(${(1 - inFade) * 100}px) translateY(${outFade * -100}px)`;
      }

      if (feature2Ref.current) {
        const inFade = Math.min(1, Math.max(0, (S - 3.5) / 0.4));
        const outFade = Math.min(1, Math.max(0, (S - 5.1) / 0.4));
        feature2Ref.current.style.opacity = inFade * (1 - outFade);
        feature2Ref.current.style.transform = `translate(-50%, -50%) translateX(${(1 - inFade) * -100}px) translateY(${outFade * -100}px)`;
      }

      if (vaultExplorerRef.current) {
        const inFade = Math.min(1, Math.max(0, (S - 5.9) / 0.4));
        const outFade = Math.min(1, Math.max(0, (S - 8.0) / 0.4));
        vaultExplorerRef.current.style.opacity = inFade * (1 - outFade);
        vaultExplorerRef.current.style.transform = `translate(-50%, -50%) scale(${0.8 + (inFade * 0.2) + (outFade * 0.2)})`;
        vaultExplorerRef.current.style.pointerEvents = (inFade > 0.8 && outFade < 0.2) ? 'auto' : 'none';
      }

      if (feature3Ref.current) {
        const inFade = Math.min(1, Math.max(0, (S - 8.6) / 0.4));
        const outFade = Math.min(1, Math.max(0, (S - 10.2) / 0.4));
        feature3Ref.current.style.opacity = inFade * (1 - outFade);
        feature3Ref.current.style.transform = `translate(-50%, -50%) translateY(${(1 - inFade) * 100}px) translateY(${outFade * -100}px)`;
      }

      if (downloadBoxRef.current) {
        const inFade = Math.min(1, Math.max(0, (S - 10.7) / 0.4));
        const outFade = Math.min(1, Math.max(0, (S - 12.2) / 0.4));
        downloadBoxRef.current.style.opacity = inFade * (1 - outFade);
        downloadBoxRef.current.style.transform = `translate(-50%, -50%) translateY(${(1 - inFade) * 50}px) translateY(${outFade * -50}px)`;
        downloadBoxRef.current.style.pointerEvents = (inFade > 0.8 && outFade < 0.2) ? 'auto' : 'none';
      }

      if (thankYouRef.current) {
        const inFade = Math.min(1, Math.max(0, (S - 12.7) / 0.4));
        thankYouRef.current.style.opacity = inFade;
        thankYouRef.current.style.transform = `translate(-50%, -50%) scale(${0.8 + (inFade * 0.2)})`;
      }

      let lightMode = 0;
      if (S >= 5.2 && S < 5.8) lightMode = (S - 5.2) / 0.6;
      else if (S >= 5.8 && S < 8.0) lightMode = 1;
      else if (S >= 8.0 && S < 8.6) lightMode = 1 - ((S - 8.0) / 0.6);

      const bgVal = lerpColor(3, 250, lightMode); 
      document.documentElement.style.setProperty('--bg-color', `rgb(${bgVal}, ${bgVal}, ${bgVal})`);
      const textVal = lerpColor(224, 20, lightMode);
      document.documentElement.style.setProperty('--text-main', `rgb(${textVal}, ${textVal}, ${textVal})`);
      const textDimVal = lerpColor(136, 100, lightMode);
      document.documentElement.style.setProperty('--text-dim', `rgb(${textDimVal}, ${textDimVal}, ${textDimVal})`);

      ctx.fillStyle = `rgb(${bgVal}, ${bgVal}, ${bgVal})`;
      ctx.fillRect(0, 0, width, height);

      const baseParticleRgb = lerpColor(120, 80, lightMode);
      const activeColor = `rgb(${baseParticleRgb}, ${baseParticleRgb}, ${baseParticleRgb})`;

      const lockCenterX = width / 2;
      const lockCenterY = height / 2;
      
      let spiralProgress = 0;
      if (S > 0.3) spiralProgress = Math.min(1, (S - 0.3) / 1.0);

      ctx.font = '14px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const mx = mouseState.current.x;
      const my = mouseState.current.y;

      particles.forEach(p => {
        let targetX = p.baseX;
        let targetY = p.baseY;

        if (spiralProgress > 0 && S < 5) {
          const theta = p.index * GOLDEN_ANGLE + (time * 3);
          const spiralRadius = Math.sqrt(p.index) * 12;
          const spiralX = lockCenterX + Math.cos(theta) * spiralRadius;
          const spiralY = lockCenterY + Math.sin(theta) * spiralRadius;
          
          targetX = lerp(targetX, spiralX, spiralProgress);
          targetY = lerp(targetY, spiralY, spiralProgress);
        }

        const dx = mx - p.x;
        const dy = my - p.y;
        const distSq = dx*dx + dy*dy;
        if (distSq < 150*150) {
          const dist = Math.sqrt(distSq);
          const force = (150 - dist) / 150;
          p.vx -= (dx / dist) * force * 2;
          p.vy -= (dy / dist) * force * 2;
        }

        p.vx += (targetX - p.x) * 0.05;
        p.vy += (targetY - p.y) * 0.05;
        p.vx *= 0.85;
        p.vy *= 0.85;
        p.x += p.vx;
        p.y += p.vy;

        ctx.fillStyle = activeColor;
        ctx.globalAlpha = Math.min(1, 0.1 + Math.abs(p.vx) * 0.1);
        ctx.fillText(p.char, p.x, p.y);
      });

      frameId = requestAnimationFrame(draw);
    };

    draw();

    return () => cancelAnimationFrame(frameId);
  }, []);

  if (isEnclaveOpen) {
    return <Enclave />;
  }

  return (
    <>
      <div ref={cursorRef} className={`custom-cursor ${hovering ? 'hovering' : ''}`} />
      <div ref={cursorDotRef} className="custom-cursor-dot" />
      <canvas ref={canvasRef} className="binary-canvas" />

      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', zIndex: 10 }}>
          
          <div ref={heroRef} className="cinematic-absolute-center">
            <img src="/logo.png" alt="CipherVault Logo" style={{ width: '120px', height: '120px', marginBottom: '20px', borderRadius: '50%' }} />
            <h1 className="splash-title" onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}>CIPHERVAULT</h1>
            <div className="splash-subtitle">Absolute Zero-Trust</div>
          </div>

          <div ref={feature1Ref} className="cinematic-absolute-center" style={{ opacity: 0 }}>
            <h2 className="huge-title" style={{textAlign: 'center', marginBottom: '2rem'}}>Unbreakable Security.</h2>
            <div className="features-grid" style={{maxWidth: '800px'}}>
              <div className="feature-card" onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}>
                <h3 className="feature-title">Dual-Factor Protection</h3>
                <p className="feature-desc">Your files are protected by a Master Password and a unique Secret Code.</p>
              </div>
              <div className="feature-card" onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}>
                <h3 className="feature-title">Zero Cloud Sync</h3>
                <p className="feature-desc">With absolutely zero backdoors, your data remains 100% under your control.</p>
              </div>
            </div>
          </div>

          <div ref={feature2Ref} className="cinematic-absolute-center" style={{ opacity: 0 }}>
            <h2 className="huge-title" style={{textAlign: 'center', marginBottom: '2rem'}}>Disguised & Hidden.</h2>
            <div className="features-grid" style={{maxWidth: '800px'}}>
              <div className="feature-card" onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}>
                <h3 className="feature-title">Stealth Mode</h3>
                <p className="feature-desc">The vault disguises itself as an ordinary .7z archive file.</p>
              </div>
              <div className="feature-card" onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}>
                <h3 className="feature-title">Unrecognizable</h3>
                <p className="feature-desc">Even if someone finds it, they cannot open it without the Vault application and your exact credentials.</p>
              </div>
            </div>
          </div>

          <div ref={vaultExplorerRef} className="cinematic-absolute-center" style={{ opacity: 0, zIndex: 50, pointerEvents: 'auto' }} id="vault-explorer">
             <div className="finder-mockup" onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}>
                <div className="finder-header">
                   <div className="mac-btns"><div className="mac-btn red"/><div className="mac-btn yel"/><div className="mac-btn grn"/></div>
                   <div className="finder-title">Vault Explorer - Secure Enclave</div>
                </div>
                <div className="finder-body">
                   <div className="sidebar">
                      <div className="sidebar-item active">Vault Home</div>
                      <div className="sidebar-item">Shared IP</div>
                      <div className="sidebar-item">Audit Logs</div>
                   </div>
                   <div className="main-view">
                      <div className="file-grid">
                         <div className="file-item">
                           <div className="file-icon" />
                           <div className="file-name">project-dirac.cvault</div>
                         </div>
                         <div className="file-item">
                           <div className="file-icon" />
                           <div className="file-name">financials_q3.cvault</div>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          <div ref={feature3Ref} className="cinematic-absolute-center" style={{ opacity: 0 }}>
            <h2 className="huge-title" style={{textAlign: 'center', marginBottom: '2rem'}}>Advanced Safety Features.</h2>
            <div className="features-grid" style={{maxWidth: '800px'}}>
              <div className="feature-card" onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}>
                <h3 className="feature-title">Smart Idle Lock</h3>
                <p className="feature-desc">Includes an automatic 5-minute idle lock and USB eject detection to prevent data leaks.</p>
              </div>
              <div className="feature-card" onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}>
                <h3 className="feature-title">Safe Mode</h3>
                <p className="feature-desc">Read-Only "Safe Mode" for accessing your files on untrusted computers without leaving a trace.</p>
              </div>
            </div>
          </div>

          <div ref={downloadBoxRef} className="cinematic-absolute-center" style={{ opacity: 0, pointerEvents: 'none' }}>
            <div className="download-box" onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}>
              <h2 className="huge-title">Enter The Enclave</h2>
              <p className="huge-subtitle" style={{marginBottom: '3rem', marginTop: '1rem'}}>
                Zero-Trust Desktop Client.
              </p>
              <button 
                className="btn-primary" 
                onMouseEnter={() => setHovering(true)} 
                onMouseLeave={() => setHovering(false)}
                onClick={() => {
                  window.location.href = '/CipherVault.zip';
                }}
              >
                Download CipherVault for Mac
              </button>
            </div>
          </div>

          <div ref={thankYouRef} className="cinematic-absolute-center" style={{ opacity: 0, width: '100%', display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
            <div className="feature-card" style={{ padding: '5rem 4rem', textAlign: 'center', maxWidth: '600px', background: '#080808', border: '1px solid rgba(0, 255, 204, 0.4)', boxShadow: '0 30px 100px rgba(0,0,0,0.9), 0 0 40px rgba(0, 255, 204, 0.1)', pointerEvents: 'auto', borderRadius: '24px' }}>
               <h2 style={{ fontSize: '4rem', margin: 0, fontWeight: 800, background: 'linear-gradient(90deg, #00ffcc, #00aaff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.03em' }}>Thank You.</h2>
               <p style={{ fontSize: '1.3rem', color: '#e0e0e0', marginTop: '1.5rem', lineHeight: '1.6' }}>Your data is now mathematically secure.<br/>Welcome to the enclave.</p>
            </div>
          </div>
        </div>

      {/* Scroll Spacer to allow scrolling the page */}
      <div style={{ height: '16000px', width: '1px' }} />
    </>
  );
}

export default App;
