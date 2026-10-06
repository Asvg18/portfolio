export class PlaygroundItem {
  body = null;
  width = 0;
  height = 0;
  resize = null;

  constructor(element) {
    this.element = element;
    this.isPill = element.classList.contains("pill");
    this.wordIndex = element.dataset.word != null ? Number(element.dataset.word) : -1;
  }
}
