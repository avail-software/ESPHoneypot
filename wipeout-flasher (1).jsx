import { useState, useEffect, useRef } from "react"
import * as THREE from "three"

const C = {
  bg: "#FFFFFF", dark: "#0A0A0A", panel: "rgba(10,10,10,0.97)",
  yellow: "#F5B800", pink: "#FF0080", white: "#FFFFFF",
  grey: "#666", dim: "#E0E0E0", mid: "#1a1a1a",
  text: "#0A0A0A", textMid: "#555", textFaint: "#AAA",
}

const IconFlash = ({ size = 32, color = C.yellow }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" style={{ display:"block", imageRendering:"pixelated" }}>
    <rect x="4"  y="0"  width="16" height="6"  fill={color}/>
    <rect x="4"  y="0"  width="6"  height="18" fill={color}/>
    <rect x="10" y="12" width="18" height="6"  fill={color}/>
    <rect x="22" y="12" width="6"  height="20" fill={color}/>
    <rect x="4"  y="26" width="24" height="6"  fill={color}/>
  </svg>
)

const IconTarget = ({ size = 32, color = C.pink }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" style={{ display:"block", imageRendering:"pixelated" }}>
    <rect x="0"  y="12" width="32" height="8" fill={color}/>
    <rect x="12" y="0"  width="8"  height="32" fill={color}/>
    <rect x="10" y="10" width="12" height="12" fill={C.white}/>
    <rect x="13" y="13" width="6"  height="6"  fill={color}/>
  </svg>
)

const IconArrow = ({ size = 24, color = C.yellow }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display:"block", imageRendering:"pixelated" }}>
    <rect x="0"  y="9"  width="18" height="6"  fill={color}/>
    <rect x="12" y="0"  width="6"  height="6"  fill={color}/>
    <rect x="18" y="6"  width="6"  height="6"  fill={color}/>
    <rect x="12" y="18" width="6"  height="6"  fill={color}/>
  </svg>
)

const IconCheck = ({ size = 28, color = C.yellow }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" style={{ display:"block", imageRendering:"pixelated" }}>
    <rect x="0"  y="14" width="8"  height="8"  fill={color}/>
    <rect x="8"  y="18" width="6"  height="8"  fill={color}/>
    <rect x="14" y="10" width="6"  height="8"  fill={color}/>
    <rect x="20" y="2"  width="8"  height="8"  fill={color}/>
  </svg>
)

const IconShield = ({ size = 40, color = C.yellow, accent = C.pink }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" style={{ display:"block", imageRendering:"pixelated" }}>
    <rect x="8"  y="0"  width="24" height="8"  fill={color}/>
    <rect x="0"  y="8"  width="40" height="6"  fill={color}/>
    <rect x="0"  y="14" width="8"  height="18" fill={color}/>
    <rect x="32" y="14" width="8"  height="18" fill={color}/>
    <rect x="8"  y="32" width="8"  height="8"  fill={color}/>
    <rect x="24" y="32" width="8"  height="8"  fill={color}/>
    <rect x="16" y="36" width="8"  height="4"  fill={color}/>
    <rect x="12" y="14" width="16" height="18" fill={C.dark}/>
    <rect x="16" y="18" width="8"  height="10" fill={accent}/>
  </svg>
)

const IconWarn = ({ size = 24, color = C.pink }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display:"block", imageRendering:"pixelated" }}>
    <rect x="8"  y="0"  width="8"  height="4"  fill={color}/>
    <rect x="4"  y="4"  width="16" height="4"  fill={color}/>
    <rect x="0"  y="8"  width="24" height="4"  fill={color}/>
    <rect x="0"  y="12" width="24" height="4"  fill={color}/>
    <rect x="0"  y="16" width="24" height="4"  fill={color}/>
    <rect x="4"  y="20" width="16" height="4"  fill={color}/>
    <rect x="10" y="6"  width="4"  height="8"  fill={C.white}/>
    <rect x="10" y="16" width="4"  height="4"  fill={C.white}/>
  </svg>
)

const BlockCorner = ({ flip = false, color = C.dark, size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" style={{ display:"block", imageRendering:"pixelated", transform: flip ? "rotate(180deg)" : "none" }}>
    <rect x="0"  y="0"  width="48" height="10" fill={color}/>
    <rect x="0"  y="0"  width="10" height="48" fill={color}/>
    <rect x="10" y="10" width="12" height="6"  fill={color}/>
    <rect x="10" y="10" width="6"  height="12" fill={color}/>
  </svg>
)

const DEVICES = [
  { id:"linksys",  brand:"LINKSYS",  model:"WRT54GL",   ip:"192.168.1.1" },
  { id:"tplink",   brand:"TP-LINK",  model:"TL-WR941N", ip:"192.168.1.1" },
  { id:"asus",     brand:"ASUS",     model:"RT-N66U",   ip:"192.168.0.1" },
  { id:"netgear",  brand:"NETGEAR",  model:"R7000",     ip:"192.168.1.1" },
  { id:"dlink",    brand:"D-LINK",   model:"DIR-615",   ip:"192.168.0.1" },
  { id:"custom",   brand:"CUSTOM",   model:"MANUAL",    ip:"0.0.0.0"     },
]

const LOGS = [
  "[FTP]    Connecting to 192.168.1.1:21",
  "[FTP]    Connection established",
  "[AUTH]   Sending anonymous credentials",
  "[AUTH]   Login OK",
  "[READ]   Probing flash layout",
  "[READ]   Firmware v3.7.2 detected (4MB)",
  "[PREP]   Loading honeypot binary",
  "[PREP]   Checksum SHA-256 verified",
  "[WRITE]  0x0000 → 0x0400  OK",
  "[WRITE]  0x0400 → 0x0800  OK",
  "[WRITE]  0x0800 → 0x0C00  OK",
  "[WRITE]  0x0C00 → 0x1000  OK",
  "[VERIFY] Block comparison pass",
  "[VERIFY] No errors detected",
  "[SYS]    Rebooting device",
  "[LIVE]   Honeypot active ✓",
]

export default function App() {
  const mountRef = useRef(null)
  const logsRef = useRef(null)
  const [screen, setScreen] = useState("boot")
  const [bootPhase, setBootPhase] = useState(0)
  const [selected, setSelected] = useState(0)
  const [device, setDevice] = useState(null)
  const [detecting, setDetecting] = useState(false)
  const [logs, setLogs] = useState([])
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)
  const [glitch, setGlitch] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setBootPhase(1), 500)
    const t2 = setTimeout(() => setBootPhase(2), 1600)
    const t3 = setTimeout(() => setBootPhase(3), 2600)
    const t4 = setTimeout(() => setScreen("select"), 3800)
    return () => [t1,t2,t3,t4].forEach(clearTimeout)
  }, [])

  useEffect(() => {
    if (screen === "boot") return
    const iv = setInterval(() => {
      if (Math.random() < 0.1) {
        setGlitch(true)
        setTimeout(() => setGlitch(false), 80 + Math.random() * 100)
      }
    }, 3000)
    return () => clearInterval(iv)
  }, [screen])

  useEffect(() => {
    if (screen === "boot" || !mountRef.current) return
    const el = mountRef.current
    const W = el.clientWidth, H = el.clientHeight
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false })
    renderer.setClearColor(0x000000, 1)
    renderer.setSize(W, H)
    renderer.setPixelRatio(0.5)
    el.appendChild(renderer.domElement)
    renderer.domElement.style.imageRendering = "pixelated"
    renderer.domElement.style.width = "100%"
    renderer.domElement.style.height = "100%"

    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog(0x000000, 7, 18)
    const cam = new THREE.PerspectiveCamera(56, W / H, 0.1, 100)
    cam.position.set(0, 1.0, 6)
    cam.lookAt(0, 0, 0)

    const grid = new THREE.GridHelper(40, 28, 0x2a1f00, 0x1a1200)
    grid.position.y = -2
    scene.add(grid)

    const icoGeo = new THREE.IcosahedronGeometry(1.6, 1)
    const posAttr = icoGeo.attributes.position
    const origPos = new Float32Array(posAttr.array)
    const icoMesh = new THREE.Mesh(icoGeo, new THREE.MeshBasicMaterial({ color: 0x1a1000 }))
    scene.add(icoMesh)
    const icoWire = new THREE.LineSegments(
      new THREE.WireframeGeometry(icoGeo),
      new THREE.LineBasicMaterial({ color: 0xF5B800 })
    )
    icoMesh.add(icoWire)

    const icoInner = new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(0.9, 1)),
      new THREE.LineBasicMaterial({ color: 0xFF0080 })
    )
    scene.add(icoInner)

    const torusA = new THREE.Mesh(
      new THREE.TorusGeometry(2.7, 0.018, 10, 80),
      new THREE.MeshBasicMaterial({ color: 0xF5B800 })
    )
    torusA.rotation.x = Math.PI * 0.3
    scene.add(torusA)

    const torusB = new THREE.Mesh(
      new THREE.TorusGeometry(2.3, 0.01, 8, 64),
      new THREE.MeshBasicMaterial({ color: 0xFF0080 })
    )
    torusB.rotation.x = Math.PI * 0.12
    torusB.rotation.y = Math.PI * 0.45
    scene.add(torusB)

    const orbs = Array.from({ length: 6 }, (_, i) => {
      const orb = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.22, 0),
        new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0xF5B800 : 0xFF0080 })
      )
      const a = (i / 6) * Math.PI * 2
      orb.position.set(Math.cos(a) * 3.1, Math.sin(i * 1.1) * 0.6, Math.sin(a) * 3.1)
      orb._a = a; orb._spd = 0.004 + i * 0.0006; orb._b = i * 1.1
      scene.add(orb); return orb
    })

    for (let i = 0; i < 6; i++) {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.5 + Math.random() * 0.8, 2 + Math.random(), 4),
        new THREE.MeshBasicMaterial({ color: 0x0d0900 })
      )
      const a = (i / 6) * Math.PI * 2
      cone.position.set(Math.cos(a) * 8.5, -1.6, Math.sin(a) * 8.5)
      scene.add(cone)
    }

    let t = 0, raf
    const animate = () => {
      raf = requestAnimationFrame(animate)
      t += 0.016
      const j = 0.015
      for (let i = 0; i < posAttr.count; i++) {
        posAttr.setXYZ(i,
          origPos[i*3]   + (Math.random() - .5) * j,
          origPos[i*3+1] + (Math.random() - .5) * j,
          origPos[i*3+2] + (Math.random() - .5) * j,
        )
      }
      posAttr.needsUpdate = true
      icoMesh.rotation.x = t * 0.28; icoMesh.rotation.y = t * 0.44
      icoMesh.position.y = Math.sin(t * 0.55) * 0.18
      icoInner.rotation.x = -t * 0.35; icoInner.rotation.y = -t * 0.5
      torusA.rotation.z = t * 0.2; torusB.rotation.y = t * 0.3
      orbs.forEach(o => {
        o._a += o._spd
        o.position.x = Math.cos(o._a) * 3.1; o.position.z = Math.sin(o._a) * 3.1
        o.position.y = Math.sin(t + o._b) * 0.55
        o.rotation.x += 0.03; o.rotation.z += 0.02
      })
      renderer.render(scene, cam)
    }
    animate()
    return () => { cancelAnimationFrame(raf); renderer.dispose(); try { el.removeChild(renderer.domElement) } catch {} }
  }, [screen])

  useEffect(() => { logsRef.current?.scrollIntoView({ behavior: "smooth" }) }, [logs])

  const autoDetect = () => {
    setDetecting(true)
    setTimeout(() => { setDevice(DEVICES[1]); setDetecting(false) }, 2200)
  }

  const startFlash = (dev) => {
    setDevice(dev); setScreen("flash")
    let i = 0
    const step = () => setTimeout(() => {
      setLogs(p => [...p, LOGS[i]])
      setProgress(Math.round((i + 1) / LOGS.length * 100))
      i++
      if (i < LOGS.length) step()
      else setTimeout(() => setDone(true), 500)
    }, 320 + Math.random() * 160)
    step()
  }

  const reset = () => { setScreen("select"); setDevice(null); setLogs([]); setProgress(0); setDone(false) }

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
    * { box-sizing:border-box; margin:0; padding:0; }
    @keyframes blink  { 0%,49%{opacity:1} 50%,100%{opacity:0} }
    @keyframes fadein { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
    @keyframes glitch { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-3px)} 75%{transform:translateX(2px)} }
    @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.4} }
    @keyframes scanmv { 0%{top:-5%} 100%{top:110%} }
    .scan { position:fixed;left:0;right:0;height:2px;background:rgba(0,0,0,0.04);animation:scanmv 6s linear infinite;pointer-events:none;z-index:60; }
  `

  // ── BOOT ──────────────────────────────────────────────────────────────────────
  if (screen === "boot") return (
    <div style={{ background: C.dark, width:"100vw", height:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"'Press Start 2P', monospace", overflow:"hidden", position:"relative" }}>
      <style>{CSS}</style>
      <div style={{ position:"absolute", top:0, left:0 }}><BlockCorner color={C.yellow} size={80} /></div>
      <div style={{ position:"absolute", bottom:0, right:0 }}><BlockCorner color={C.yellow} size={80} flip /></div>
      <div style={{ position:"absolute", top:0, right:0, transform:"rotate(90deg)" }}><BlockCorner color={C.pink} size={48} /></div>
      <div style={{ position:"absolute", bottom:0, left:0, transform:"rotate(270deg)" }}><BlockCorner color={C.pink} size={48} /></div>
      <div style={{ textAlign:"center", zIndex:2 }}>
        {bootPhase >= 1 && (
          <div style={{ marginBottom:28, animation:"fadein 0.4s ease" }}>
            <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}><IconShield size={52} color={C.yellow} accent={C.pink} /></div>
            <div style={{ fontSize:14, color:C.yellow, letterSpacing:"0.12em", marginBottom:6 }}>HNY//FLASH</div>
            <div style={{ fontSize:6, color:"#333", letterSpacing:"0.4em" }}>FTP HONEYPOT DEPLOY</div>
          </div>
        )}
        {bootPhase >= 2 && (
          <div style={{ marginBottom:22, animation:"fadein 0.4s ease" }}>
            <div style={{ fontSize:5, color:"#333", letterSpacing:"0.3em", marginBottom:10 }}>SYSTEM INIT...</div>
            <div style={{ display:"flex", gap:3, justifyContent:"center" }}>
              {Array.from({length:16}).map((_,i) => (
                <div key={i} style={{ width:8, height:8, background: i < 10 ? C.yellow : C.mid }} />
              ))}
            </div>
          </div>
        )}
        {bootPhase >= 3 && (
          <div style={{ display:"flex", alignItems:"center", gap:10, justifyContent:"center" }}>
            <div style={{ animation:"blink 0.8s infinite" }}><IconArrow size={16} color={C.yellow} /></div>
            <div style={{ fontSize:6, color:C.yellow, letterSpacing:"0.3em", animation:"blink 0.8s infinite" }}>LOADING</div>
          </div>
        )}
      </div>
    </div>
  )

  // ── SELECT ────────────────────────────────────────────────────────────────────
  if (screen === "select") return (
    <div style={{ background: C.white, width:"100vw", height:"100vh", fontFamily:"'Press Start 2P', monospace", overflow:"hidden", position:"relative", color: C.text }}>
      <style>{CSS}</style>
      <div className="scan" />
      {glitch && <div style={{ position:"fixed", inset:0, zIndex:70, pointerEvents:"none", transform:`translateX(${(Math.random()-.5)*4}px)`, background:`linear-gradient(transparent 40%, rgba(255,0,128,0.06) 41%, transparent 43%)` }} />}

      <div style={{ display:"flex", height:"100vh" }}>

        {/* LEFT — black 3D viewport */}
        <div style={{ position:"relative", width:"48%", background:"#000", flexShrink:0 }}>
          <div ref={mountRef} style={{ position:"absolute", inset:0 }} />
          <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"10px 14px", background:"rgba(0,0,0,0.8)", borderTop:`1px solid #1a1a1a`, display:"flex", justifyContent:"space-between", alignItems:"center", zIndex:5 }}>
            <div style={{ fontSize:5, color:"#333", letterSpacing:"0.3em" }}>3D PREVIEW</div>
            <div style={{ display:"flex", gap:3 }}>
              {[C.yellow, C.pink, "#222"].map((col,i) => <div key={i} style={{ width:5, height:5, background:col }} />)}
            </div>
          </div>
          <div style={{ position:"absolute", top:0, left:0, zIndex:5 }}><BlockCorner color={C.yellow} size={36} /></div>
          <div style={{ position:"absolute", bottom:32, right:0, zIndex:5, transform:"rotate(180deg)" }}><BlockCorner color={C.pink} size={24} /></div>
        </div>

        {/* RIGHT — white content */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", borderLeft:`3px solid ${C.dark}` }}>

          {/* Top bar */}
          <div style={{ background: C.dark, padding:"12px 18px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:`3px solid ${C.yellow}` }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <IconFlash size={18} color={C.yellow} />
              <span style={{ fontSize:7, color:C.yellow, letterSpacing:"0.3em" }}>HNY//FLASH</span>
            </div>
            <span style={{ fontSize:5, color:"#555", letterSpacing:"0.3em" }}>STEP 01 / 02</span>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ width:6, height:6, background:C.yellow, animation:"blink 2s infinite" }} />
              <span style={{ fontSize:5, color:"#555", letterSpacing:"0.2em" }}>READY</span>
            </div>
          </div>

          {/* Title */}
          <div style={{ padding:"14px 18px 10px", borderBottom:`1px solid ${C.dim}`, display:"flex", alignItems:"center", gap:12 }}>
            <IconTarget size={20} color={C.pink} />
            <div>
              <div style={{ fontSize:10, color: C.text, letterSpacing:"0.06em", marginBottom:4, animation: glitch ? "glitch 0.1s" : "none" }}>SELECT DEVICE</div>
              <div style={{ fontSize:5, color: C.textMid, letterSpacing:"0.25em" }}>IDENTIFY YOUR TARGET ROUTER</div>
            </div>
            <div style={{ marginLeft:"auto", fontSize:4, color: C.textFaint, letterSpacing:"0.2em" }}>▲▼ MOVE  ✕ CONFIRM</div>
          </div>

          {/* Auto-detect */}
          <div style={{ padding:"10px 18px", borderBottom:`1px solid ${C.dim}`, display:"flex", alignItems:"center", justifyContent:"space-between", background: detecting ? "rgba(245,184,0,0.05)" : device ? "rgba(255,0,128,0.04)" : "transparent" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:3, height:34, background: device ? C.pink : detecting ? C.yellow : C.dim }} />
              <div>
                <div style={{ fontSize:5, color: device ? C.pink : detecting ? C.yellow : C.textFaint, letterSpacing:"0.3em", marginBottom:4 }}>AUTO-DETECT</div>
                {detecting
                  ? <div style={{ fontSize:6, color: C.yellow, animation:"pulse 0.7s infinite", letterSpacing:"0.12em" }}>SCANNING GATEWAY...</div>
                  : device
                  ? <div style={{ fontSize:6, color: C.text, letterSpacing:"0.08em" }}>{device.brand} {device.model} <span style={{ color: C.pink }}>{device.ip}</span></div>
                  : <div style={{ fontSize:5, color: C.textFaint, letterSpacing:"0.12em" }}>PROBE LOCAL NETWORK FOR DEVICES</div>
                }
              </div>
            </div>
            {!detecting && !device && (
              <button onClick={autoDetect} style={{ background: C.yellow, border:"none", color: C.dark, padding:"7px 12px", fontFamily:"'Press Start 2P',monospace", fontSize:6, letterSpacing:"0.15em", cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
                <IconArrow size={10} color={C.dark} /> SCAN
              </button>
            )}
            {device && (
              <button onClick={() => startFlash(device)} style={{ background: C.pink, border:"none", color: C.white, padding:"8px 14px", fontFamily:"'Press Start 2P',monospace", fontSize:6, letterSpacing:"0.15em", cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
                FLASH <IconArrow size={10} color={C.white} />
              </button>
            )}
          </div>

          {/* Device list */}
          <div style={{ flex:1, overflowY:"auto" }}>
            {DEVICES.map((d, i) => {
              const isSel = selected === i
              return (
                <div key={d.id} onClick={() => { setSelected(i); setDevice(d) }}
                  style={{ display:"flex", alignItems:"center", gap:12, padding:"9px 18px", background: isSel ? "rgba(245,184,0,0.07)" : "transparent", borderLeft:`3px solid ${isSel ? C.yellow : "transparent"}`, cursor:"pointer", borderBottom:`1px solid ${C.dim}`, transition:"background 0.08s" }}>
                  <div style={{ fontSize:7, color: isSel ? C.yellow : C.dim, animation: isSel ? "blink 0.9s infinite" : "none", width:10 }}>▶</div>
                  <div style={{ flex:1, fontSize:7, color: isSel ? C.text : C.textMid, letterSpacing:"0.1em" }}>{d.brand}</div>
                  <div style={{ fontSize:5, color: isSel ? C.textMid : C.textFaint, letterSpacing:"0.1em" }}>{d.model}</div>
                  <div style={{ fontSize:5, color: isSel ? C.textFaint : "#CCC", minWidth:90, textAlign:"right" }}>{d.ip}</div>
                  {isSel && <div style={{ animation:"blink 1s infinite" }}><IconArrow size={12} color={C.yellow} /></div>}
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div style={{ padding:"10px 18px", display:"flex", gap:14, alignItems:"center", borderTop:`1px solid ${C.dim}` }}>
            {[["✕","CONFIRM"],["○","BACK"]].map(([b,l]) => (
              <div key={b} style={{ display:"flex", alignItems:"center", gap:5 }}>
                <div style={{ width:13, height:13, border:`1px solid ${C.textFaint}`, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:5, color: C.textFaint }}>{b}</div>
                <span style={{ fontSize:4, color: C.textFaint, letterSpacing:"0.2em" }}>{l}</span>
              </div>
            ))}
            <div style={{ marginLeft:"auto", display:"flex", gap:8, alignItems:"center" }}>
              <IconWarn size={12} color={C.textFaint} />
              <span style={{ fontSize:4, color: C.textFaint, letterSpacing:"0.15em" }}>DO NOT POWER OFF DURING FLASH</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stat bars */}
      <div style={{ position:"absolute", right:16, top:"50%", transform:"translateY(-50%)", zIndex:10, display:"flex", gap:5 }}>
        {[["PWR",1.0,C.yellow],["SIG",0.72,C.pink],["MEM",0.48,C.yellow]].map(([l,v,col]) => (
          <div key={l} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
            <div style={{ width:6, height:52, background: C.dim, position:"relative" }}>
              <div style={{ position:"absolute", bottom:0, left:0, right:0, height:`${v*100}%`, background:col }} />
            </div>
            <div style={{ fontSize:4, color: C.textFaint, letterSpacing:"0.15em" }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  )

  // ── FLASH ─────────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: C.white, width:"100vw", height:"100vh", fontFamily:"'Press Start 2P', monospace", overflow:"hidden", position:"relative", color: C.text }}>
      <style>{CSS}</style>
      <div className="scan" />
      {glitch && <div style={{ position:"fixed", inset:0, zIndex:70, pointerEvents:"none", transform:`translateX(${(Math.random()-.5)*4}px)`, background:`linear-gradient(transparent 45%, rgba(245,184,0,0.06) 46%, transparent 48%)` }} />}

      <div style={{ display:"flex", height:"100vh" }}>

        {/* LEFT — black 3D viewport */}
        <div style={{ position:"relative", width:"48%", background:"#000", flexShrink:0 }}>
          <div ref={mountRef} style={{ position:"absolute", inset:0, opacity: done ? 1 : 0.55 }} />
          <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"10px 14px", background:"rgba(0,0,0,0.8)", borderTop:`1px solid #1a1a1a`, display:"flex", justifyContent:"space-between", zIndex:5 }}>
            <div style={{ fontSize:5, color:"#333", letterSpacing:"0.3em" }}>3D PREVIEW</div>
            <div style={{ display:"flex", gap:3 }}>
              {[done ? C.pink : "#222", done ? C.yellow : "#222", "#222"].map((col,i) => <div key={i} style={{ width:5, height:5, background:col, transition:"background 0.4s" }} />)}
            </div>
          </div>
          <div style={{ position:"absolute", top:0, left:0, zIndex:5 }}><BlockCorner color={done ? C.pink : C.yellow} size={36} /></div>
        </div>

        {/* RIGHT — white panel */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", borderLeft:`3px solid ${C.dark}` }}>

          {/* Top bar */}
          <div style={{ background: done ? C.pink : C.yellow, padding:"10px 18px", display:"flex", justifyContent:"space-between", alignItems:"center", transition:"background 0.4s" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              {done ? <IconCheck size={16} color={C.dark} /> : <IconFlash size={16} color={C.dark} />}
              <span style={{ fontSize:6, color: C.dark, letterSpacing:"0.25em" }}>{done ? "COMPLETE" : "FLASHING..."}</span>
            </div>
            <span style={{ fontSize:5, color:"rgba(0,0,0,0.4)", letterSpacing:"0.15em" }}>{device?.brand} {device?.model}</span>
            <span style={{ fontSize:10, color: C.dark }}>{progress}<span style={{ fontSize:6 }}>%</span></span>
          </div>

          {/* Segment bar */}
          <div style={{ padding:"12px 18px 8px", borderBottom:`1px solid ${C.dim}` }}>
            <div style={{ display:"flex", gap:2, marginBottom:3 }}>
              {LOGS.map((_,i) => <div key={i} style={{ flex:1, height:6, background: i < logs.length ? (done ? C.pink : C.yellow) : C.dim, transition:"background 0.1s" }} />)}
            </div>
            <div style={{ display:"flex", gap:2 }}>
              {LOGS.map((_,i) => <div key={i} style={{ flex:1, height:2, background: i < logs.length ? (done ? "rgba(255,0,128,0.3)" : "rgba(245,184,0,0.5)") : "transparent" }} />)}
            </div>
          </div>

          {/* Terminal */}
          <div style={{ flex:1, margin:"12px 18px 0", background:"#050505", border:`1px solid #1a1a1a`, display:"flex", flexDirection:"column", minHeight:0 }}>
            <div style={{ padding:"6px 12px", borderBottom:`1px solid #111`, display:"flex", gap:5, alignItems:"center", background:"#0a0a0a", flexShrink:0 }}>
              {[C.mid, C.mid, done ? C.pink : C.mid].map((col,i) => <div key={i} style={{ width:5, height:5, borderRadius:"50%", background:col, transition:"background 0.4s" }} />)}
              <span style={{ fontSize:4, color:"#222", letterSpacing:"0.25em", marginLeft:4 }}>TERMINAL — {device?.ip}</span>
            </div>
            <div style={{ flex:1, overflowY:"auto", padding:"8px 12px" }}>
              {logs.map((log, i) => {
                const isLast = i === logs.length - 1
                return (
                  <div key={i} style={{ fontSize:7, lineHeight:2.1, letterSpacing:"0.04em", color: isLast && !done ? C.yellow : isLast && done ? C.pink : i > logs.length - 4 ? "#2a2a2a" : "#1a1a1a", transition:"color 0.3s" }}>
                    <span style={{ color:"#131313", userSelect:"none" }}>{String(i+1).padStart(2,"0")} </span>
                    {log}
                  </div>
                )
              })}
              {!done && logs.length > 0 && <span style={{ display:"inline-block", width:5, height:9, background: C.yellow, marginLeft:2, animation:"blink 0.8s infinite", verticalAlign:"middle" }} />}
              <div ref={logsRef} />
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{ padding:"10px 18px", borderTop:`1px solid ${C.dim}`, display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
            {done ? (
              <>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <IconShield size={24} color={C.yellow} accent={C.pink} />
                  <div>
                    <div style={{ fontSize:6, color: C.pink, letterSpacing:"0.2em", marginBottom:3 }}>HONEYPOT ACTIVE</div>
                    <div style={{ fontSize:4, color: C.textFaint, letterSpacing:"0.15em" }}>FTP TRAFFIC IS BEING LOGGED</div>
                  </div>
                </div>
                <button onClick={reset} style={{ background:"none", border:`1px solid ${C.dim}`, color: C.textFaint, padding:"7px 12px", fontFamily:"'Press Start 2P',monospace", fontSize:5, letterSpacing:"0.2em", cursor:"pointer" }}>RESET</button>
              </>
            ) : (
              <>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <IconWarn size={12} color={C.textFaint} />
                  <span style={{ fontSize:4, color: C.textFaint, letterSpacing:"0.18em" }}>DO NOT POWER OFF DEVICE</span>
                </div>
                <div style={{ display:"flex", gap:4 }}>
                  {Array.from({length:4}).map((_,i) => <div key={i} style={{ width:8, height:8, background: i < Math.floor(progress/25)+1 ? C.yellow : C.dim, transition:"background 0.2s" }} />)}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
