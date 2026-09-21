const isMystral = typeof global === "undefined";

if (isMystral) {
  globalThis.global = globalThis;

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
      }
      return element;
    };
  }
}