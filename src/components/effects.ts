let scanEl: HTMLDivElement | null = null;
let glitchTimer: ReturnType<typeof setInterval> | null = null;

export const effects = {
  mount(): void {
    if (scanEl) return;

    scanEl = document.createElement("div");
    scanEl.className = "scan";
    document.body.appendChild(scanEl);

    glitchTimer = setInterval(() => {
      if (Math.random() > 0.1) return;

      const overlay = document.createElement("div");
      Object.assign(overlay.style, {
        position: "fixed",
        inset: "0",
        zIndex: "70",
        pointerEvents: "none",
        transform: `translateX(${(Math.random() - 0.5) * 4}px)`,
        background:
          "linear-gradient(transparent 40%, rgba(255,0,128,0.06) 41%, transparent 43%)",
      });
      document.body.appendChild(overlay);

      const duration = 80 + Math.random() * 100;
      setTimeout(() => overlay.remove(), duration);
    }, 3000);
  },

  destroy(): void {
    if (scanEl) {
      scanEl.remove();
      scanEl = null;
    }
    if (glitchTimer !== null) {
      clearInterval(glitchTimer);
      glitchTimer = null;
    }
  },
};
