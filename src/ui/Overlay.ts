export class Overlay {
  private element: HTMLDivElement;

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

    // Trap focus
    this.element.tabIndex = 0;

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
    if (this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}
