import { createElement, type Component } from "./component";
import { C } from "../theme/colors";
import { findBoard, type ConfigField } from "../boards";
import type { Store } from "../state/store";
import type { AppState } from "../types";

const FONT = "'Press Start 2P', monospace";

const INPUT_STYLE: Partial<CSSStyleDeclaration> = {
  background: "#050505",
  border: `1px solid ${C.mid}`,
  color: "#e2e8f0",
  fontFamily: FONT,
  fontSize: "11px",
  padding: "10px 12px",
  width: "100%",
  boxSizing: "border-box",
  outline: "none",
  letterSpacing: "0.05em",
};

const LABEL_STYLE: Partial<CSSStyleDeclaration> = {
  fontFamily: FONT,
  fontSize: "8px",
  color: C.textMid,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  marginBottom: "6px",
  display: "block",
};

function applyStyle(el: HTMLElement, style: Partial<CSSStyleDeclaration>): void {
  Object.assign(el.style, style);
}

function createSectionLabel(text: string, color: string): HTMLElement {
  const label = createElement("div");
  Object.assign(label.style, {
    fontFamily: FONT,
    fontSize: "8px",
    color,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    padding: "14px 0 8px",
  });
  label.textContent = text;
  return label;
}

function createTextField(field: ConfigField): HTMLElement {
  const wrapper = createElement("div");
  wrapper.style.marginBottom = "12px";

  const label = createElement("label");
  applyStyle(label, LABEL_STYLE);
  label.setAttribute("for", `cfg_${field.id}`);
  label.innerHTML = field.required
    ? `${field.label} <span style="color:${C.yellow}">*</span>`
    : field.label;

  const input = createElement("input");
  input.id = `cfg_${field.id}`;
  input.type = field.type === "url" ? "url" : field.type;
  input.value = field.defaultValue;
  if (field.placeholder) input.placeholder = field.placeholder;
  applyStyle(input, INPUT_STYLE);

  wrapper.appendChild(label);
  wrapper.appendChild(input);
  return wrapper;
}

function createSelectField(
  field: ConfigField,
  onChange: (value: string) => void,
): HTMLElement {
  const wrapper = createElement("div");
  wrapper.style.marginBottom = "12px";

  const label = createElement("label");
  applyStyle(label, LABEL_STYLE);
  label.setAttribute("for", `cfg_${field.id}`);
  label.textContent = field.label;

  const btnRow = createElement("div");
  Object.assign(btnRow.style, {
    display: "flex",
    gap: "6px",
  });

  const hiddenInput = createElement("input");
  hiddenInput.type = "hidden";
  hiddenInput.id = `cfg_${field.id}`;
  hiddenInput.value = field.defaultValue;

  const buttons: HTMLButtonElement[] = [];

  for (const opt of field.options ?? []) {
    const btn = createElement("button") as HTMLButtonElement;
    btn.type = "button";
    const isActive = opt.value === field.defaultValue;
    Object.assign(btn.style, {
      fontFamily: FONT,
      fontSize: "10px",
      padding: "10px 16px",
      border: `2px solid ${isActive ? C.yellow : C.mid}`,
      background: isActive ? C.yellow : "#050505",
      color: isActive ? C.dark : C.textFaint,
      cursor: "pointer",
      letterSpacing: "0.1em",
      flex: "1",
      transition: "all 0.15s",
    });
    btn.textContent = opt.label;
    btn.dataset.value = opt.value;

    btn.addEventListener("click", () => {
      hiddenInput.value = opt.value;
      for (const b of buttons) {
        const active = b.dataset.value === opt.value;
        b.style.border = `2px solid ${active ? C.yellow : C.mid}`;
        b.style.background = active ? C.yellow : "#050505";
        b.style.color = active ? C.dark : C.textFaint;
      }
      onChange(opt.value);
    });

    buttons.push(btn);
    btnRow.appendChild(btn);
  }

  wrapper.appendChild(label);
  wrapper.appendChild(hiddenInput);
  wrapper.appendChild(btnRow);
  return wrapper;
}

function createCheckbox(field: ConfigField): HTMLElement {
  const wrapper = createElement("div");
  Object.assign(wrapper.style, {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "12px",
    cursor: "pointer",
  });

  const box = createElement("div");
  const checked = field.defaultValue === "y";
  Object.assign(box.style, {
    width: "16px",
    height: "16px",
    border: `2px solid ${C.mid}`,
    background: checked ? C.yellow : "#050505",
    flexShrink: "0",
    cursor: "pointer",
  });

  const hidden = createElement("input");
  hidden.type = "checkbox";
  hidden.id = `cfg_${field.id}`;
  hidden.checked = checked;
  hidden.style.display = "none";

  const label = createElement("span");
  Object.assign(label.style, {
    fontFamily: FONT,
    fontSize: "8px",
    color: C.textMid,
    letterSpacing: "0.1em",
    cursor: "pointer",
  });
  label.textContent = field.label;

  const toggle = () => {
    hidden.checked = !hidden.checked;
    box.style.background = hidden.checked ? C.yellow : "#050505";
    wrapper.dispatchEvent(new CustomEvent("checkchange", { detail: hidden.checked }));
  };

  box.addEventListener("click", toggle);
  label.addEventListener("click", toggle);

  wrapper.appendChild(box);
  wrapper.appendChild(hidden);
  wrapper.appendChild(label);
  return wrapper;
}

export class ConfigPanel implements Component {
  readonly el: HTMLElement;

  private unsub: () => void;
  private baudrateInput: HTMLInputElement | null = null;
  private eraseAllCheckbox: HTMLInputElement | null = null;
  private conditionalEls: { el: HTMLElement; field: string; value: string }[] = [];
  private fieldValues: Map<string, string> = new Map();

  constructor(store: Store<AppState>) {
    this.el = createElement("div");
    Object.assign(this.el.style, {
      flex: "1",
      overflowY: "auto",
      padding: "0 18px 12px",
    });

    this.render(store.get().selectedBoardId);

    this.unsub = store.select(
      (s) => s.selectedBoardId,
      (next) => this.render(next),
    );
  }

  private render(boardId: string): void {
    this.el.innerHTML = "";
    this.conditionalEls = [];
    this.fieldValues.clear();

    const board = findBoard(boardId);
    if (!board) return;

    const fields = board.configFields ?? [];

    for (const f of fields) {
      if (f.type === "select") {
        this.fieldValues.set(f.id, f.defaultValue);
      }
    }

    const networkFields = fields.filter((f) => f.id.startsWith("wifi_"));
    const honeypotFields = fields.filter((f) => !f.id.startsWith("wifi_"));

    if (networkFields.length > 0) {
      this.el.appendChild(createSectionLabel("NETWORK", C.yellow));
      for (const f of networkFields) {
        this.el.appendChild(this.createFieldEl(f));
      }
    }

    if (honeypotFields.length > 0) {
      this.el.appendChild(createSectionLabel("HONEYPOT", C.pink));

      const appendIpField = honeypotFields.find((f) => f.id === "append_ip");
      const delimiterField = honeypotFields.find((f) => f.id === "append_char");
      const otherFields = honeypotFields.filter(
        (f) => f.id !== "append_ip" && f.id !== "append_char",
      );

      const sideBySideIds = new Set(["ftp_user", "ftp_pass"]);
      let i = 0;
      while (i < otherFields.length) {
        const f = otherFields[i];
        if (sideBySideIds.has(f.id) && i + 1 < otherFields.length && sideBySideIds.has(otherFields[i + 1].id)) {
          const row = createElement("div");
          Object.assign(row.style, {
            display: "flex",
            gap: "10px",
          });
          const left = this.createFieldEl(f);
          left.style.flex = "1";
          const right = this.createFieldEl(otherFields[i + 1]);
          right.style.flex = "1";
          row.appendChild(left);
          row.appendChild(right);
          this.el.appendChild(row);
          i += 2;
        } else {
          const el = this.createFieldEl(f);
          this.trackConditional(f, el);
          this.el.appendChild(el);
          i++;
        }
      }

      if (appendIpField) {
        const checkEl = createCheckbox(appendIpField);
        this.trackConditional(appendIpField, checkEl);
        this.el.appendChild(checkEl);

        if (delimiterField) {
          const delimEl = this.createFieldEl(delimiterField);
          const hidden = checkEl.querySelector("input[type=checkbox]") as HTMLInputElement | null;
          const isChecked = hidden?.checked ?? false;
          delimEl.style.display = isChecked ? "block" : "none";

          checkEl.addEventListener("checkchange", ((e: CustomEvent<boolean>) => {
            delimEl.style.display = e.detail ? "block" : "none";
          }) as EventListener);

          this.el.appendChild(delimEl);
        }
      }
    }

    this.renderAdvanced(board.defaultBaudrate);
    this.updateConditionalVisibility();
  }

  private createFieldEl(field: ConfigField): HTMLElement {
    if (field.type === "select") {
      return createSelectField(field, (value) => {
        this.fieldValues.set(field.id, value);
        this.updateConditionalVisibility();
      });
    }
    if (field.type === "checkbox") {
      return createCheckbox(field);
    }
    return createTextField(field);
  }

  private trackConditional(field: ConfigField, el: HTMLElement): void {
    if (field.visibleWhen) {
      this.conditionalEls.push({
        el,
        field: field.visibleWhen.field,
        value: field.visibleWhen.value,
      });
    }
  }

  private updateConditionalVisibility(): void {
    for (const entry of this.conditionalEls) {
      const controlValue = this.fieldValues.get(entry.field) ?? "";
      entry.el.style.display = controlValue === entry.value ? "" : "none";
    }
  }

  private renderAdvanced(defaultBaudrate: number): void {
    const details = createElement("details");
    Object.assign(details.style, {
      marginTop: "14px",
      borderTop: `1px solid ${C.dim}`,
      paddingTop: "8px",
    });

    const summary = createElement("summary");
    Object.assign(summary.style, {
      fontFamily: FONT,
      fontSize: "8px",
      color: C.textMid,
      letterSpacing: "0.2em",
      cursor: "pointer",
      listStyle: "none",
      padding: "8px 0",
    });
    summary.textContent = "▸ ADVANCED";

    details.addEventListener("toggle", () => {
      summary.textContent = details.open ? "▾ ADVANCED" : "▸ ADVANCED";
    });

    const content = createElement("div");
    content.style.paddingTop = "6px";

    const baudrateWrapper = createElement("div");
    baudrateWrapper.style.marginBottom = "12px";
    const baudrateLabel = createElement("label");
    applyStyle(baudrateLabel, LABEL_STYLE);
    baudrateLabel.setAttribute("for", "cfg_baudrate");
    baudrateLabel.textContent = "FLASH BAUDRATE";
    this.baudrateInput = createElement("input");
    this.baudrateInput.id = "cfg_baudrate";
    this.baudrateInput.type = "number";
    this.baudrateInput.value = String(defaultBaudrate);
    this.baudrateInput.min = "9600";
    applyStyle(this.baudrateInput, INPUT_STYLE);
    baudrateWrapper.appendChild(baudrateLabel);
    baudrateWrapper.appendChild(this.baudrateInput);
    content.appendChild(baudrateWrapper);

    const eraseWrapper = createElement("div");
    Object.assign(eraseWrapper.style, {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      cursor: "pointer",
    });

    const eraseBox = createElement("div");
    Object.assign(eraseBox.style, {
      width: "16px",
      height: "16px",
      border: `2px solid ${C.mid}`,
      background: C.yellow,
      flexShrink: "0",
      cursor: "pointer",
    });

    this.eraseAllCheckbox = createElement("input");
    this.eraseAllCheckbox.type = "checkbox";
    this.eraseAllCheckbox.id = "cfg_erase_all";
    this.eraseAllCheckbox.checked = true;
    this.eraseAllCheckbox.style.display = "none";

    const eraseLabel = createElement("span");
    Object.assign(eraseLabel.style, {
      fontFamily: FONT,
      fontSize: "8px",
      color: C.textMid,
      letterSpacing: "0.1em",
      cursor: "pointer",
    });
    eraseLabel.textContent = "ERASE ALL FLASH FIRST";

    const toggleErase = () => {
      this.eraseAllCheckbox!.checked = !this.eraseAllCheckbox!.checked;
      eraseBox.style.background = this.eraseAllCheckbox!.checked ? C.yellow : "#050505";
    };
    eraseBox.addEventListener("click", toggleErase);
    eraseLabel.addEventListener("click", toggleErase);

    eraseWrapper.appendChild(eraseBox);
    eraseWrapper.appendChild(this.eraseAllCheckbox);
    eraseWrapper.appendChild(eraseLabel);
    content.appendChild(eraseWrapper);

    details.appendChild(summary);
    details.appendChild(content);
    this.el.appendChild(details);
  }

  getBaudrate(): number {
    if (!this.baudrateInput) return 921600;
    const val = Number(this.baudrateInput.value);
    return val > 0 ? val : 921600;
  }

  getEraseAll(): boolean {
    return this.eraseAllCheckbox?.checked ?? true;
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this.el);
  }

  unmount(): void {
    this.el.remove();
  }

  destroy(): void {
    this.unsub();
    this.unmount();
  }
}
