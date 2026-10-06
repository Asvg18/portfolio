import { $, $$ } from "./core/dom.js";
import { Marquee } from "./core/Marquee.js";
import { OffscreenPause } from "./core/OffscreenPause.js";
import { ThemeController } from "./core/ThemeController.js";
import { Toast } from "./core/Toast.js";
import { Canvas } from "./canvas/Canvas.js";
import { SectionSwitcher } from "./canvas/SectionSwitcher.js";
import { ScreensViewer } from "./components/ScreensViewer.js";
import { VisitorCursor } from "./components/VisitorCursor.js";
import { certifications } from "./data/certifications.js";
import { screens } from "./data/screens.js";
import { Home } from "./home/Home.js";
import { About } from "./sections/About.js";
import { Certifications } from "./sections/Certifications.js";
import { Contact } from "./sections/Contact.js";
import { Projects } from "./sections/Projects.js";
import { Resume } from "./sections/Resume.js";

class Portfolio {
  constructor() {
    const heroElement = $("#home");
    this.toast = new Toast($("#toast"));
    this.theme = new ThemeController(document.documentElement, $$("[data-theme-toggle]"));
    this.home = new Home(heroElement, { matter: window.Matter });
    this.canvas = new Canvas($("#canvas"), new SectionSwitcher($("#pnRail")));
    this.sections = [
      new About($("#about"), this.canvas, { toast: this.toast }),
      new Projects($("#projects"), this.canvas),
      new Certifications($("#certifications"), this.canvas, certifications),
      new Resume($("#resume")),
      new Contact($("#contact"), { toast: this.toast, home: heroElement }),
    ];
    const screensDialog = $("#screens");
    this.screens = typeof screensDialog.showModal === "function" ? new ScreensViewer(screensDialog, screens) : null;
    this.marquees = $$("[data-marquee]").map((track) => new Marquee(track));
    this.visitorCursor = new VisitorCursor($("#visitorCursor"));
    this.offscreenPause = new OffscreenPause([heroElement, $(".tape"), ...this.canvas.sections]);
  }

  start() {
    document.fonts.ready.then(() => this.marquees.forEach((marquee) => marquee.build()));
    this.home.start();
    this.canvas.start();
    this.visitorCursor.start();
  }
}

new Portfolio().start();
