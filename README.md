# Aerron Sander V. Gumarao — Portfolio

A single-page portfolio designed in Figma and built as a Figma-style canvas: a hero with physics-driven skill pills and folder navigation, followed by About, Projects, Certifications, Resume, and Contact sections.

## Tech stack

- **HTML5**: semantic markup with ARIA roles (tabs, dialogs, menus, switches)
- **CSS3**: custom properties for light and dark themes, container query units, `clip-path`, view transitions, and `prefers-reduced-motion` support
- **JavaScript (ES2023)**: native ES modules and classes with private fields; no framework or build step
- **Matter.js**: 2D physics for the hero's skill pills
- **Web APIs**: IntersectionObserver, Web Animations, View Transitions, `<dialog>`, History, Clipboard

## Project structure

```
index.html
assets/
  files/         Resume PDF
  fonts/         Alte Haas Grotesk, Relationship of Mélodrame
  img/           Portrait, project covers, certificates, project screens
css/
  base.css       Tokens, reset, tooltips, toast, shared keyframes
  components/    Marquee, photo pill, theme switch, certificate and screens viewers
  layout/        Hero (home) and the section canvas
  sections/      About, Projects, Certifications, Resume, Contact
js/
  main.js        Composition root: creates and starts every module
  core/          DOM and motion helpers, Toast, ThemeController, Marquee, OffscreenPause
  home/          Hero: folders, physics playground, Figma cursor, name typing
  canvas/        Section reveal choreography and the section switcher
  sections/      One class per section
  components/    Reusable UI: viewers, mail menu, copy button, flashcard, comment pins
  data/          Content: certifications, project screens, skill pills
```

## Running locally

The scripts are ES modules, so the site has to be served over HTTP rather than opened as a file:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Updating content

- **Certifications**: add an entry to `js/data/certifications.js` and its image to `assets/img/certs/<id>.webp`. The list, year groups, and filter counts update automatically.
- **Project screens**: add frames to `js/data/screens.js` and the images to `assets/img/screens/<project>/` (with a matching file in `thumbs/`).
- **Hero skill pills**: edit `js/data/skills.js`.
