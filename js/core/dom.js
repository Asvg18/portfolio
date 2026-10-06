export const $ = (selector, scope = document) => scope.querySelector(selector);

export const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

export function createElement(tag, { className, text, attributes = {}, style = {} } = {}, children = []) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text != null) element.textContent = text;
  Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
  Object.entries(style).forEach(([name, value]) => element.style.setProperty(name, value));
  element.append(...children);
  return element;
}

export function replayClass(element, className) {
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
}

export function splitWords(element, { indexElement = () => false } = {}) {
  let index = 0;
  Array.from(element.childNodes).forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const fragment = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) {
          fragment.append(" ");
          return;
        }
        fragment.append(createElement("span", { className: "w", text: part, style: { "--i": index++ } }));
      });
      node.replaceWith(fragment);
    } else if (node.nodeType === Node.ELEMENT_NODE && indexElement(node)) {
      node.style.setProperty("--i", index++);
    }
  });
  element.classList.add("is-split");
}

export function offsetWithin(element, ancestor) {
  let x = 0;
  let y = 0;
  for (let node = element; node && node !== ancestor; node = node.offsetParent) {
    x += node.offsetLeft;
    y += node.offsetTop;
  }
  return { x, y };
}

export const padNumber = (value) => String(value).padStart(2, "0");
