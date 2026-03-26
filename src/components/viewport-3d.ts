import * as THREE from "three";
import { createElement, type Component } from "./component";
import type { AppState, FlashPhase } from "../types";
import type { Store } from "../state/store";
import { C } from "../theme/colors";
import { blockCorner } from "../icons/pixel-icons";

const FONT = "'Press Start 2P', monospace";

interface OrbData {
  mesh: THREE.Mesh;
  angle: number;
  speed: number;
  phase: number;
}

export class Viewport3D implements Component {
  readonly el: HTMLElement;

  private store: Store<AppState>;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private canvasWrap: HTMLDivElement;

  private icoMesh: THREE.Mesh;
  private icoInner: THREE.LineSegments;
  private torusA: THREE.Mesh;
  private torusB: THREE.Mesh;
  private orbs: OrbData[];
  private origPositions: Float32Array;
  private posAttr: THREE.BufferAttribute;

  private dots: HTMLDivElement[];
  private rafId: number;
  private resizeObs: ResizeObserver | null;
  private unsub: () => void;
  private t: number;

  constructor(store: Store<AppState>) {
    this.store = store;
    this.rafId = 0;
    this.resizeObs = null;
    this.t = 0;

    /* ── root element ─────────────────────────────────────────── */

    this.el = createElement("div");
    Object.assign(this.el.style, {
      position: "relative",
      width: "100%",
      height: "100%",
      background: "#000",
      overflow: "hidden",
    });

    /* ── canvas wrapper (opacity target) ──────────────────────── */

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

    const icoWire = new THREE.LineSegments(
      new THREE.WireframeGeometry(icoGeo),
      new THREE.LineBasicMaterial({ color: 0xf5b800 }),
    );
    this.icoMesh.add(icoWire);

    /* ── inner wireframe ──────────────────────────────────────── */

    this.icoInner = new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(0.9, 1)),
      new THREE.LineBasicMaterial({ color: 0xff0080 }),
    );
    this.scene.add(this.icoInner);

    /* ── torus rings ──────────────────────────────────────────── */

    this.torusA = new THREE.Mesh(
      new THREE.TorusGeometry(2.7, 0.018, 10, 80),
      new THREE.MeshBasicMaterial({ color: 0xf5b800 }),
    );
    this.torusA.rotation.x = Math.PI * 0.3;
    this.scene.add(this.torusA);

    this.torusB = new THREE.Mesh(
      new THREE.TorusGeometry(2.3, 0.01, 8, 64),
      new THREE.MeshBasicMaterial({ color: 0xff0080 }),
    );
    this.torusB.rotation.x = Math.PI * 0.12;
    this.torusB.rotation.y = Math.PI * 0.45;
    this.scene.add(this.torusB);

    /* ── orbiting octahedrons ─────────────────────────────────── */

    this.orbs = Array.from({ length: 6 }, (_, i) => {
      const mesh = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.22, 0),
        new THREE.MeshBasicMaterial({
          color: i % 2 === 0 ? 0xf5b800 : 0xff0080,
        }),
      );
      const angle = (i / 6) * Math.PI * 2;
      mesh.position.set(
        Math.cos(angle) * 3.1,
        Math.sin(i * 1.1) * 0.6,
        Math.sin(angle) * 3.1,
      );
      this.scene.add(mesh);
      return { mesh, angle, speed: 0.004 + i * 0.0006, phase: i * 1.1 };
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
      fontSize: "5px",
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
        width: "5px",
        height: "5px",
        background: color,
        transition: "background 0.4s",
      });
      dotsWrap.appendChild(dot);
      return dot;
    });

    footer.appendChild(dotsWrap);
    this.el.appendChild(footer);

    /* ── store subscription ────────────────────────────────────── */

    this.unsub = this.store.select(
      (s) => s.flashPhase,
      (phase) => this.applyPhase(phase),
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
    this.unsub();

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

  private applyPhase(phase: FlashPhase): void {
    const flashing = phase === "flashing" || phase === "configuring";
    const done = phase === "done";

    this.canvasWrap.style.opacity = flashing ? "0.55" : "1";

    if (done) {
      this.dots[0].style.background = C.pink;
      this.dots[1].style.background = C.yellow;
      this.dots[2].style.background = "#222";
    } else if (flashing) {
      this.dots[0].style.background = "#222";
      this.dots[1].style.background = "#222";
      this.dots[2].style.background = "#222";
    } else {
      this.dots[0].style.background = C.yellow;
      this.dots[1].style.background = C.pink;
      this.dots[2].style.background = "#222";
    }
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
    const tick = () => {
      this.rafId = requestAnimationFrame(tick);
      this.t += 0.016;

      const jitter = 0.015;
      for (let i = 0; i < this.posAttr.count; i++) {
        this.posAttr.setXYZ(
          i,
          this.origPositions[i * 3] + (Math.random() - 0.5) * jitter,
          this.origPositions[i * 3 + 1] + (Math.random() - 0.5) * jitter,
          this.origPositions[i * 3 + 2] + (Math.random() - 0.5) * jitter,
        );
      }
      this.posAttr.needsUpdate = true;

      this.icoMesh.rotation.x = this.t * 0.28;
      this.icoMesh.rotation.y = this.t * 0.44;
      this.icoMesh.position.y = Math.sin(this.t * 0.55) * 0.18;

      this.icoInner.rotation.x = -this.t * 0.35;
      this.icoInner.rotation.y = -this.t * 0.5;

      this.torusA.rotation.z = this.t * 0.2;
      this.torusB.rotation.y = this.t * 0.3;

      for (const orb of this.orbs) {
        orb.angle += orb.speed;
        orb.mesh.position.x = Math.cos(orb.angle) * 3.1;
        orb.mesh.position.z = Math.sin(orb.angle) * 3.1;
        orb.mesh.position.y = Math.sin(this.t + orb.phase) * 0.55;
        orb.mesh.rotation.x += 0.03;
        orb.mesh.rotation.z += 0.02;
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
