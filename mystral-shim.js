const isMystral = typeof global === "undefined";

if (isMystral) {
  globalThis.global = globalThis;
  globalThis.__mystral = true;
  globalThis.PointerEvent ??= function PointerEvent() {};

  if (typeof document === "object" && typeof document.getElementsByTagName !== "function") {
    document.getElementsByTagName = () => [];
  }

  if (typeof document === "object" && typeof document.createElement === "function") {
    const createElement = document.createElement.bind(document);
    document.createElement = (tagName, ...args) => {
      const element = createElement(tagName, ...args);
      if (element) {
        if (typeof element.append !== "function") {
          element.append = (...children) => {
            if (typeof element.appendChild === "function") {
              for (const child of children) element.appendChild(child);
            }
          };
        }
        if (String(tagName).toLowerCase() === "canvas" && !element.classList) {
          element.classList = { add() {} };
        }
        if (String(tagName).toLowerCase() === "canvas" && typeof element.getBoundingClientRect !== "function") {
          element.getBoundingClientRect = () => ({
            left: 0,
            top: 0,
            width: window.innerWidth || element.width || 0,
            height: window.innerHeight || element.height || 0,
            right: window.innerWidth || element.width || 0,
            bottom: window.innerHeight || element.height || 0
          });
        }
        if (String(tagName).toLowerCase() === "canvas" && !element.parentElement) {
          Object.defineProperties(element, {
            clientWidth: { configurable: true, get: () => window.innerWidth || element.width || 0 },
            clientHeight: { configurable: true, get: () => window.innerHeight || element.height || 0 },
            scrollWidth: { configurable: true, get: () => window.innerWidth || element.width || 0 },
            scrollHeight: { configurable: true, get: () => window.innerHeight || element.height || 0 }
          });
          const parent = {
            classList: { add() {}, remove() {} },
            append(child) {
              child.parentElement = parent;
            },
            appendChild(child) {
              child.parentElement = parent;
            },
            removeChild(child) {
              // Keep the native canvas attached; q5 reuses parentElement during resize.
            },
            getBoundingClientRect: () => ({
              left: 0,
              top: 0,
              width: element.width || 0,
              height: element.height || 0,
              right: element.width || 0,
              bottom: element.height || 0
            })
          };
          element.parentElement = parent;
        }
      }
      return element;
    };
  }
}