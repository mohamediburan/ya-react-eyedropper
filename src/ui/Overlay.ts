export class Overlay {
  private element: HTMLDivElement;
  private tabTrapHandler: (e: KeyboardEvent) => void;

  constructor() {
    this.element = document.createElement("div");
    Object.assign(this.element.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      zIndex: "2147483647",
      cursor: "crosshair",
      touchAction: "none", // Prevent some touch behaviors natively
    });

    // Accessibility: ARIA attributes
    this.element.setAttribute("role", "dialog");
    this.element.setAttribute("aria-modal", "true");
    this.element.setAttribute("aria-label", "Color picker eyedropper");

    // Trap focus — prevent Tab from escaping the overlay
    this.element.tabIndex = 0;
    this.tabTrapHandler = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        e.preventDefault();
      }
    };
    this.element.addEventListener("keydown", this.tabTrapHandler);

    document.body.appendChild(this.element);
    this.element.focus();
  }

  showLoading() {
    this.element.style.cursor = "wait";
  }

  hideLoading() {
    this.element.style.cursor = "crosshair";
  }

  addEventListener<K extends keyof HTMLElementEventMap>(
    type: K,
    listener: (this: HTMLDivElement, ev: HTMLElementEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions,
  ) {
    this.element.addEventListener(type, listener, options);
  }

  removeEventListener<K extends keyof HTMLElementEventMap>(
    type: K,
    listener: (this: HTMLDivElement, ev: HTMLElementEventMap[K]) => any,
    options?: boolean | EventListenerOptions,
  ) {
    this.element.removeEventListener(type, listener, options);
  }

  destroy() {
    this.element.removeEventListener("keydown", this.tabTrapHandler);
    if (this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}
