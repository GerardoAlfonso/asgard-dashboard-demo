export class Feedback {
  constructor() {
    this.backdrop = document.querySelector("#dialogBackdrop");
    this.dialog = document.querySelector("#dialog");
    this.title = document.querySelector("#dialogTitle");
    this.body = document.querySelector("#dialogBody");
    this.previousFocus = null;
    this.resolve = null;

    this.backdrop.addEventListener("click", event => {
      if (event.target === this.backdrop || event.target.closest("[data-dialog-close]")) this.close(false);
    });
    document.addEventListener("keydown", event => {
      if (this.backdrop.hidden) return;
      if (event.key === "Escape") this.close(false);
      if (event.key === "Tab") this.trapFocus(event);
    });
  }

  open({ title, content, onMount }) {
    this.previousFocus = document.activeElement;
    this.title.textContent = title;
    this.body.innerHTML = content;
    this.backdrop.hidden = false;
    onMount?.(this.body);
    requestAnimationFrame(() => this.dialog.querySelector("button, input, select, textarea")?.focus());
  }

  close(result = false) {
    if (this.backdrop.hidden) return;
    this.backdrop.hidden = true;
    this.body.replaceChildren();
    this.previousFocus?.focus?.();
    const resolver = this.resolve;
    this.resolve = null;
    resolver?.(result);
  }

  confirm({ title, message, confirmLabel = "Confirmar", tone = "primary" }) {
    return new Promise(resolve => {
      this.resolve = resolve;
      this.open({
        title,
        content: `
          <div class="dialog-body">
            <p>${escapeHtml(message)}</p>
            <div class="dialog-actions">
              <button type="button" data-dialog-close>Cancelar</button>
              <button type="button" class="${tone}" data-dialog-confirm>${escapeHtml(confirmLabel)}</button>
            </div>
          </div>`,
        onMount: body => body.querySelector("[data-dialog-confirm]").addEventListener("click", () => this.close(true)),
      });
    });
  }

  trapFocus(event) {
    const controls = [...this.dialog.querySelectorAll("button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)")];
    if (!controls.length) return;
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  toast(message, tone = "success") {
    const item = document.createElement("div");
    item.className = `toast ${tone === "error" ? "error" : ""}`;
    item.textContent = message;
    document.querySelector("#toastRegion").append(item);
    window.setTimeout(() => item.remove(), 3600);
  }
}

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character]);
}
