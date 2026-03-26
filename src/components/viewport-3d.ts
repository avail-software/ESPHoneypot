import * as THREE from "three";
import { createElement, type Component } from "./component";
import type { AppState, FlashPhase } from "../types";
import type { Store } from "../state/store";
import { C } from "../theme/colors";
import { blockCorner } from "../icons/pixel-icons";

const FONT = "'Press Start 2P', monospace";

type ViewportMode = "default" | "confirmed";
type FlashState = "idle" | "out" | "in";

interface OrbData {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  angle: number;
  speed: number;
  phase: number;
}

interface ExplosionFragment {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  velocity: THREE.Vector3;
  angVel: THREE.Vector3;
}

export class Viewport3D implements Component {
  readonly el: HTMLElement;

  private store: Store<AppState>;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private canvasWrap: HTMLDivElement;
  private flashOverlay: HTMLDivElement;

  private icoMesh: THREE.Mesh;
  private icoInner: THREE.LineSegments;
  private torusA: THREE.Mesh;
  private torusB: THREE.Mesh;
  private orbs: OrbData[];
  private origPositions: Float32Array;
  private posAttr: THREE.BufferAttribute;

  private icoWireMat: THREE.LineBasicMaterial;
  private icoInnerMat: THREE.LineBasicMaterial;
  private torusAMat: THREE.MeshBasicMaterial;
  private torusBMat: THREE.MeshBasicMaterial;

  /* palette */
  private readonly COL_YELLOW = new THREE.Color(0xf5b800);
  private readonly COL_PINK   = new THREE.Color(0xff0080);
  private readonly COL_WHITE  = new THREE.Color(0xffffff);

  /* flash state machine */
  private viewportMode: ViewportMode;
  private flashState: FlashState;
  private flashT: number;
  private flashTargetMode: ViewportMode;

  /* explosion */
  private explosionFragments: ExplosionFragment[];
  private explosionActive: boolean;
  private explosionFlashT: number;

  private dots: HTMLDivElement[];
  private rafId: number;
  private resizeObs: ResizeObserver | null;
  private unsubs: (() => void)[];
  private t: number;

  constructor(store: Store<AppState>) {
    this.store = store;
    this.rafId = 0;
    this.resizeObs = null;
    this.t = 0;
    this.viewportMode = "default";
    this.flashState = "idle";
    this.flashT = 0;
    this.flashTargetMode = "default";
    this.explosionFragments = [];
    this.explosionActive = false;
    this.explosionFlashT = 0;
    this.unsubs = [];

    /* ── root element ─────────────────────────────────────────── */

    this.el = createElement("div");
    Object.assign(this.el.style, {
      position: "relative",
      width: "100%",
      height: "100%",
      background: "#000",
      overflow: "hidden",
    });

    /* ── canvas wrapper ───────────────────────────────────────── */

    this.canvasWrap = createElement("div") as HTMLDivElement;
    Object.assign(this.canvasWrap.style, { position: "absolute", inset: "0" });
    this.el.appendChild(this.canvasWrap);

    /* ── renderer ─────────────────────────────────────────────── */

    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.setPixelRatio(0.5);
    const canvas = this.renderer.domElement;
    canvas.style.imageRendering = "pixelated";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    this.canvasWrap.appendChild(canvas);

    /* ── white flash overlay ──────────────────────────────────── */

    this.flashOverlay = createElement("div") as HTMLDivElement;
    Object.assign(this.flashOverlay.style, {
      position: "absolute",
      inset: "0",
      background: "#ffffff",
      opacity: "0",
      pointerEvents: "none",
      zIndex: "4",
    });
    this.canvasWrap.appendChild(this.flashOverlay);

    /* ── scene + camera ───────────────────────────────────────── */

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x000000, 7, 18);

    this.camera = new THREE.PerspectiveCamera(56, 1, 0.1, 100);
    this.camera.position.set(0, 1.0, 6);
    this.camera.lookAt(0, 0, 0);

    /* ── grid ─────────────────────────────────────────────────── */

    const grid = new THREE.GridHelper(40, 28, 0x2a1f00, 0x1a1200);
    grid.position.y = -2;
    this.scene.add(grid);

    /* ── icosahedron (outer solid + wireframe) ────────────────── */

    const icoGeo = new THREE.IcosahedronGeometry(1.6, 1);
    this.posAttr = icoGeo.getAttribute("position") as THREE.BufferAttribute;
    this.origPositions = new Float32Array(this.posAttr.array as Float32Array);

    this.icoMesh = new THREE.Mesh(
      icoGeo,
      new THREE.MeshBasicMaterial({ color: 0x1a1000 }),
    );
    this.scene.add(this.icoMesh);

    this.icoWireMat = new THREE.LineBasicMaterial({ color: 0xf5b800 });
    const icoWire = new THREE.LineSegments(
      new THREE.WireframeGeometry(icoGeo),
      this.icoWireMat,
    );
    this.icoMesh.add(icoWire);

    /* ── inner wireframe ──────────────────────────────────────── */

    this.icoInnerMat = new THREE.LineBasicMaterial({ color: 0xff0080 });
    this.icoInner = new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(0.9, 1)),
      this.icoInnerMat,
    );
    this.scene.add(this.icoInner);

    /* ── torus rings ──────────────────────────────────────────── */

    this.torusAMat = new THREE.MeshBasicMaterial({ color: 0xf5b800 });
    this.torusA = new THREE.Mesh(
      new THREE.TorusGeometry(2.7, 0.018, 10, 80),
      this.torusAMat,
    );
    this.torusA.rotation.x = Math.PI * 0.3;
    this.scene.add(this.torusA);

    this.torusBMat = new THREE.MeshBasicMaterial({ color: 0xff0080 });
    this.torusB = new THREE.Mesh(
      new THREE.TorusGeometry(2.3, 0.01, 8, 64),
      this.torusBMat,
    );
    this.torusB.rotation.x = Math.PI * 0.12;
    this.torusB.rotation.y = Math.PI * 0.45;
    this.scene.add(this.torusB);

    /* ── orbiting octahedrons ─────────────────────────────────── */

    this.orbs = Array.from({ length: 6 }, (_, i) => {
      const mat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0xf5b800 : 0xff0080,
      });
      const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), mat);
      const angle = (i / 6) * Math.PI * 2;
      mesh.position.set(
        Math.cos(angle) * 3.1,
        Math.sin(i * 1.1) * 0.6,
        Math.sin(angle) * 3.1,
      );
      this.scene.add(mesh);
      return { mesh, mat, angle, speed: 0.004 + i * 0.0006, phase: i * 1.1 };
    });

    /* ── background cones ─────────────────────────────────────── */

    for (let i = 0; i < 6; i++) {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(
          0.5 + Math.random() * 0.8,
          2 + Math.random(),
          4,
        ),
        new THREE.MeshBasicMaterial({ color: 0x0d0900 }),
      );
      const a = (i / 6) * Math.PI * 2;
      cone.position.set(Math.cos(a) * 8.5, -1.6, Math.sin(a) * 8.5);
      this.scene.add(cone);
    }

    /* ── DOM overlays: block corners ──────────────────────────── */

    const cornerTL = createElement("div", undefined, blockCorner(36, C.yellow));
    Object.assign(cornerTL.style, {
      position: "absolute",
      top: "0",
      left: "0",
      zIndex: "5",
    });
    this.el.appendChild(cornerTL);

    const cornerBR = createElement(
      "div",
      undefined,
      blockCorner(24, C.pink),
    );
    Object.assign(cornerBR.style, {
      position: "absolute",
      bottom: "32px",
      right: "0",
      zIndex: "5",
      transform: "rotate(180deg)",
    });
    this.el.appendChild(cornerBR);

    /* ── DOM overlay: footer bar ──────────────────────────────── */

    const footer = createElement("div");
    Object.assign(footer.style, {
      position: "absolute",
      bottom: "0",
      left: "0",
      right: "0",
      padding: "10px 14px",
      background: "rgba(0,0,0,0.8)",
      borderTop: "1px solid #1a1a1a",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      zIndex: "5",
    });

    const label = createElement("div");
    Object.assign(label.style, {
      fontFamily: FONT,
      fontSize: "9px",
      color: "#333",
      letterSpacing: "0.3em",
    });
    label.textContent = "3D PREVIEW";
    footer.appendChild(label);

    const dotsWrap = createElement("div");
    Object.assign(dotsWrap.style, { display: "flex", gap: "3px" });

    const defaultColors = [C.yellow, C.pink, "#222"];
    this.dots = defaultColors.map((color) => {
      const dot = createElement("div") as HTMLDivElement;
      Object.assign(dot.style, {
        width: "7px",
        height: "7px",
        background: color,
        transition: "background 0.35s",
      });
      dotsWrap.appendChild(dot);
      return dot;
    });

    footer.appendChild(dotsWrap);
    this.el.appendChild(footer);

    /* ── store subscriptions ───────────────────────────────────── */

    this.unsubs.push(
      this.store.select(
        (s) => s.flashPhase,
        (phase) => this.applyPhase(phase),
      ),
    );

    this.unsubs.push(
      this.store.select(
        (s) => s.confirming,
        (confirming) => { if (confirming) this.triggerFlash("confirmed"); },
      ),
    );

    this.unsubs.push(
      this.store.select(
        (s) => s.screen,
        (screen) => {
          if (screen === "select") {
            this.resetExplosion();
            if (this.viewportMode === "confirmed") {
              this.triggerFlash("default");
            }
          }
        },
      ),
    );
  }

  /* ── public API ──────────────────────────────────────────────── */

  setOpacity(v: number): void {
    this.canvasWrap.style.opacity = String(v);
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this.el);
    this.handleResize();
    this.resizeObs = new ResizeObserver(() => this.handleResize());
    this.resizeObs.observe(this.el);
    this.startLoop();
  }

  unmount(): void {
    this.stopLoop();
    this.resizeObs?.disconnect();
    this.resizeObs = null;
    this.el.remove();
  }

  destroy(): void {
    this.unmount();
    for (const unsub of this.unsubs) unsub();

    this.renderer.dispose();
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
        obj.geometry.dispose();
        const mat = obj.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat.dispose();
      }
    });
    this.renderer.domElement.remove();
  }

  /* ── internals ───────────────────────────────────────────────── */

  private triggerFlash(target: ViewportMode): void {
    this.flashTargetMode = target;
    this.flashState = "out";
    this.flashT = 0;
    /* dots immediately go white at flash start */
    this.dots[0].style.background = "#ffffff";
    this.dots[1].style.background = "#ffffff";
    this.dots[2].style.background = "#888888";
  }

  private applyModeDots(mode: ViewportMode): void {
    if (mode === "confirmed") {
      this.dots[0].style.background = C.pink;
      this.dots[1].style.background = C.yellow;
      this.dots[2].style.background = C.yellow;
    } else {
      this.dots[0].style.background = C.yellow;
      this.dots[1].style.background = C.pink;
      this.dots[2].style.background = "#222";
    }
  }

  private applyPhase(phase: FlashPhase): void {
    const done = phase === "done";

    if (phase === "flashing" && !this.explosionActive && this.explosionFragments.length === 0) {
      this.startExplosion();
    }

    if (done) {
      this.dots[0].style.background = C.pink;
      this.dots[1].style.background = C.yellow;
      this.dots[2].style.background = "#222";
    } else if (phase === "flashing" || phase === "configuring") {
      this.dots[0].style.background = "#222";
      this.dots[1].style.background = "#222";
      this.dots[2].style.background = "#222";
    } else {
      this.applyModeDots(this.viewportMode);
    }
  }

  /** Returns the primary (A-slot) color for a given mode. */
  private modeColorA(mode: ViewportMode): THREE.Color {
    return mode === "default" ? this.COL_YELLOW : this.COL_PINK;
  }

  /** Returns the secondary (B-slot) color for a given mode. */
  private modeColorB(mode: ViewportMode): THREE.Color {
    return mode === "default" ? this.COL_PINK : this.COL_YELLOW;
  }

  private setSceneMaterials(
    colorA: THREE.Color,
    colorB: THREE.Color,
  ): void {
    this.icoWireMat.color.copy(colorA);
    this.icoInnerMat.color.copy(colorB);
    this.torusAMat.color.copy(colorA);
    this.torusBMat.color.copy(colorB);
    for (let i = 0; i < this.orbs.length; i++) {
      this.orbs[i].mat.color.copy(i % 2 === 0 ? colorA : colorB);
    }
  }

  private startExplosion(): void {
    this.explosionActive = true;
    this.explosionFlashT = 1.0;
    this.flashOverlay.style.opacity = "1";

    /* hide the original icosahedron — it "becomes" the fragments */
    this.icoMesh.visible = false;
    this.icoInner.visible = false;

    const pos = this.origPositions;
    const triCount = Math.floor(pos.length / 9);

    for (let i = 0; i < triCount; i++) {
      const o = i * 9;
      const ax = pos[o],     ay = pos[o + 1], az = pos[o + 2];
      const bx = pos[o + 3], by = pos[o + 4], bz = pos[o + 5];
      const cx = pos[o + 6], cy = pos[o + 7], cz = pos[o + 8];

      const geo = new THREE.BufferGeometry();
      geo.setAttribute(
        "position",
        new THREE.BufferAttribute(new Float32Array([ax, ay, az, bx, by, bz, cx, cy, cz]), 3),
      );

      /* alternate pink / yellow to match confirmed-mode palette */
      const mat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0xff0080 : 0xf5b800,
        transparent: true,
        opacity: 1,
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(geo, mat);
      this.scene.add(mesh);

      /* outward velocity from centroid */
      const centroidDir = new THREE.Vector3(
        (ax + bx + cx) / 3,
        (ay + by + cy) / 3,
        (az + bz + cz) / 3,
      ).normalize();
      const speed = 0.07 + Math.random() * 0.11;
      const velocity = centroidDir.multiplyScalar(speed);
      velocity.x += (Math.random() - 0.5) * 0.05;
      velocity.y += (Math.random() - 0.5) * 0.05;
      velocity.z += (Math.random() - 0.5) * 0.05;

      const angVel = new THREE.Vector3(
        (Math.random() - 0.5) * 0.35,
        (Math.random() - 0.5) * 0.35,
        (Math.random() - 0.5) * 0.35,
      );

      this.explosionFragments.push({ mesh, mat, velocity, angVel });
    }
  }

  private resetExplosion(): void {
    for (const frag of this.explosionFragments) {
      this.scene.remove(frag.mesh);
      frag.mesh.geometry.dispose();
      frag.mat.dispose();
    }
    this.explosionFragments = [];
    this.explosionActive = false;
    this.explosionFlashT = 0;
    this.icoMesh.visible = true;
    this.icoInner.visible = true;
    this.icoMesh.scale.setScalar(1);
    this.flashOverlay.style.opacity = "0";
  }

  private handleResize(): void {
    const w = this.el.clientWidth;
    const h = this.el.clientHeight;
    if (w === 0 || h === 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private startLoop(): void {
    const tmpA = new THREE.Color();
    const tmpB = new THREE.Color();

    const tick = () => {
      this.rafId = requestAnimationFrame(tick);
      this.t += 0.016;

      const jitter = 0.015;
      for (let i = 0; i < this.posAttr.count; i++) {
        this.posAttr.setXYZ(
          i,
          this.origPositions[i * 3]     + (Math.random() - 0.5) * jitter,
          this.origPositions[i * 3 + 1] + (Math.random() - 0.5) * jitter,
          this.origPositions[i * 3 + 2] + (Math.random() - 0.5) * jitter,
        );
      }
      this.posAttr.needsUpdate = true;

      /* ── flash state machine ──────────────────────────────── */

      let speedMult = 1;

      if (this.flashState === "out") {
        this.flashT += 0.09;
        const t = Math.min(this.flashT, 1);
        speedMult = 1 + t * 2.5;

        /* lerp current mode colors → white */
        const srcA = this.modeColorA(this.viewportMode);
        const srcB = this.modeColorB(this.viewportMode);
        this.setSceneMaterials(
          tmpA.lerpColors(srcA, this.COL_WHITE, t),
          tmpB.lerpColors(srcB, this.COL_WHITE, t),
        );

        /* flash DOM overlay */
        this.flashOverlay.style.opacity = String(t * 0.65);

        if (this.flashT >= 1) {
          /* peak — scale pop */
          this.icoMesh.scale.setScalar(1.22);
          this.flashState = "in";
          this.flashT = 0;
        }
      } else if (this.flashState === "in") {
        this.flashT += 0.038;
        const t = Math.min(this.flashT, 1);
        speedMult = 1 + (1 - t) * 2.5;

        /* lerp white → target mode colors */
        const dstA = this.modeColorA(this.flashTargetMode);
        const dstB = this.modeColorB(this.flashTargetMode);
        this.setSceneMaterials(
          tmpA.lerpColors(this.COL_WHITE, dstA, t),
          tmpB.lerpColors(this.COL_WHITE, dstB, t),
        );

        /* shrink scale pop back to 1 */
        this.icoMesh.scale.setScalar(1 + (1 - t) * 0.22);

        /* fade overlay out */
        this.flashOverlay.style.opacity = String((1 - t) * 0.65);

        if (this.flashT >= 1) {
          this.flashState = "idle";
          this.viewportMode = this.flashTargetMode;
          /* snap materials exactly to target */
          this.setSceneMaterials(
            this.modeColorA(this.viewportMode),
            this.modeColorB(this.viewportMode),
          );
          this.icoMesh.scale.setScalar(1);
          this.flashOverlay.style.opacity = "0";
          this.applyModeDots(this.viewportMode);
        }
      }

      /* ── explosion flash overlay decay ───────────────────── */

      if (this.explosionFlashT > 0) {
        this.explosionFlashT = Math.max(0, this.explosionFlashT - 0.03);
        /* only drive overlay when the confirm-flash state machine is idle */
        if (this.flashState === "idle") {
          this.flashOverlay.style.opacity = String(this.explosionFlashT);
        }
      }

      /* ── explosion fragments ──────────────────────────────── */

      if (this.explosionActive) {
        let allFaded = true;
        for (const frag of this.explosionFragments) {
          frag.mesh.position.addScaledVector(frag.velocity, 1);
          frag.velocity.y -= 0.0025; /* subtle gravity */
          frag.mesh.rotation.x += frag.angVel.x;
          frag.mesh.rotation.y += frag.angVel.y;
          frag.mesh.rotation.z += frag.angVel.z;
          frag.mat.opacity = Math.max(0, frag.mat.opacity - 0.009);
          if (frag.mat.opacity > 0) allFaded = false;
        }
        if (allFaded) {
          for (const frag of this.explosionFragments) {
            this.scene.remove(frag.mesh);
            frag.mesh.geometry.dispose();
            frag.mat.dispose();
          }
          this.explosionFragments = [];
          this.explosionActive = false;
        }
      }

      /* ── mesh motion ──────────────────────────────────────── */

      this.icoMesh.rotation.x = this.t * 0.28;
      this.icoMesh.rotation.y = this.t * 0.44;
      this.icoMesh.position.y = Math.sin(this.t * 0.55) * 0.18;

      this.icoInner.rotation.x = -this.t * 0.35;
      this.icoInner.rotation.y = -this.t * 0.5;

      this.torusA.rotation.z = this.t * 0.2;
      this.torusB.rotation.y = this.t * 0.3;

      for (const orb of this.orbs) {
        orb.angle += orb.speed * speedMult;
        orb.mesh.position.x = Math.cos(orb.angle) * 3.1;
        orb.mesh.position.z = Math.sin(orb.angle) * 3.1;
        orb.mesh.position.y = Math.sin(this.t + orb.phase) * 0.55;
        orb.mesh.rotation.x += 0.03 * speedMult;
        orb.mesh.rotation.z += 0.02 * speedMult;
      }

      this.renderer.render(this.scene, this.camera);
    };
    tick();
  }

  private stopLoop(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }
}
