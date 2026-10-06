import { $, $$ } from "../core/dom.js";
import { prefersReducedMotion } from "../core/motion.js";
import { CopyButton } from "../components/CopyButton.js";
import { MailMenu } from "../components/MailMenu.js";

export class Contact {
  constructor(section, { toast, home }) {
    $$("[data-copy]", section).forEach((button) => new CopyButton(button, toast));
    new MailMenu($("#mailBox", section), toast);
    $(".foot-top", section).addEventListener("click", (event) => {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
      home.tabIndex = -1;
      home.focus({ preventScroll: true });
    });
  }
}
