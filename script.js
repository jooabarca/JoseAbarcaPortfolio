// HUD clock
const clock = document.getElementById("clock");
const tick = () => { clock.textContent = new Date().toLocaleTimeString("en-GB"); };
tick();
setInterval(tick, 1000);

// Track ring state (used by the scanline holes below)
let spinning = false;

// Keep screenshots clean: cut a hole in the scanline overlay over each one on the front face.
// The mask is one full layer minus one layer per screenshot (exclude / xor).
const scan = document.querySelector(".scanlines");
const shots = [...document.querySelectorAll(".screen img")];
const cutHoles = () => {
  const base = document.body.getBoundingClientRect();
  const layers = ["linear-gradient(#000, #000)"];
  const pos = ["0 0"];
  const size = ["100% 100%"];
  const visible = spinning ? [] : shots.filter((img) => !img.closest(".track")?.inert);
  for (const img of visible) {
    const r = img.getBoundingClientRect();
    layers.push("linear-gradient(#000, #000)");
    pos.push(`${r.left - base.left}px ${r.top - base.top}px`);
    size.push(`${r.width}px ${r.height}px`);
  }
  for (const p of ["mask", "webkitMask"]) {
    scan.style[p + "Image"] = layers.join(",");
    scan.style[p + "Position"] = pos.join(",");
    scan.style[p + "Size"] = size.join(",");
  }
  scan.style.maskComposite = "exclude";
  scan.style.webkitMaskComposite = "xor";
};
cutHoles();
// lazy images and web fonts change the layout after load, so re-cut on any resize
new ResizeObserver(cutHoles).observe(document.body);
shots.forEach((img) => img.addEventListener("load", cutHoles));

// Track ring: the three tracks are faces of a ring; the tab buttons turn the chosen one to the front
const trackIds = ["work", "dashboards", "builds"];
const stage = document.querySelector(".tracks-stage");
const rotor = document.querySelector(".tracks-rotor");
const tracks = trackIds.map((id) => document.getElementById(id));
const inners = tracks.map((t) => t.querySelector(".track-inner"));
const tabs = [...document.querySelectorAll(".ring-tabs [role=tab]")];
let turn = 0;
let active = 0;
// the faces are as wide as the page content and the stage is as tall as the front face
const main = document.querySelector("main");
const fit = () => {
  stage.style.setProperty("--cw", main.clientWidth + "px");
  stage.style.height = inners[active].offsetHeight + "px";
};
const observer = new ResizeObserver(fit);
inners.forEach((el) => observer.observe(el));
observer.observe(main);
// keep the vanishing point in the middle of the screen so the side faces look right while scrolling
const aim = () => {
  stage.style.perspectiveOrigin = `50% ${innerHeight / 2 - stage.getBoundingClientRect().top}px`;
};
addEventListener("scroll", () => requestAnimationFrame(aim), { passive: true });
addEventListener("resize", aim);
// which face sits on each side (relative to the front one), so CSS can fade it toward the middle
const setSides = () => tracks.forEach((t, k) => {
  const rel = (k - active + 3) % 3;
  t.classList.toggle("side-right", rel === 1);
  t.classList.toggle("side-left", rel === 2);
});
rotor.addEventListener("transitionend", (e) => {
  if (e.target !== rotor) return;
  spinning = false;
  setSides();
  cutHoles();
});
const show = (i) => {
  // turn the short way round: one step left or right, never two
  let delta = (i - (((turn % 3) + 3) % 3) + 3) % 3;
  if (delta === 2) delta = -1;
  turn += delta;
  active = i;
  // no transition to wait for: same track, a deep link on load, or reduced motion
  const animated = delta !== 0 && !rotor.classList.contains("no-anim")
    && parseFloat(getComputedStyle(rotor).transitionDuration) > 0;
  spinning = animated;
  rotor.style.setProperty("--turn", turn);
  tabs.forEach((t, k) => {
    t.setAttribute("aria-selected", k === i);
    t.tabIndex = k === i ? 0 : -1;
  });
  tracks.forEach((t, k) => {
    t.inert = k !== i;
    t.setAttribute("aria-hidden", k !== i);
    // while turning, every face shows in full
    if (animated) t.classList.remove("side-left", "side-right");
  });
  if (!animated) setSides();
  fit();
  aim();
  cutHoles();
};
// the English / Español switch keeps the open track: joseabarca.com/#builds <-> joseabarca.com/es/#builds
const langLinks = [...document.querySelectorAll(".lang a[hreflang]")];
const syncLangLinks = () => langLinks.forEach((a) => {
  a.href = a.getAttribute("href").split("#")[0] + location.hash;
});
const select = (i) => {
  show(i);
  history.replaceState(null, "", "#" + trackIds[i]);
  syncLangLinks();
};
tabs.forEach((t, k) => {
  t.addEventListener("click", () => select(k));
  t.addEventListener("keydown", (e) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const next = (k + step + 3) % 3;
    select(next);
    tabs[next].focus();
  });
});
document.querySelector(".ring-arrow.prev").addEventListener("click", () => select((active + 2) % 3));
document.querySelector(".ring-arrow.next").addEventListener("click", () => select((active + 1) % 3));
const fromHash = () => {
  const k = trackIds.indexOf(location.hash.slice(1));
  show(k >= 0 ? k : active);
  syncLangLinks();
};
window.addEventListener("hashchange", fromHash);
// a shared link like joseabarca.com/#builds opens on that track without spinning
rotor.classList.add("no-anim");
fromHash();
requestAnimationFrame(() => requestAnimationFrame(() => rotor.classList.remove("no-anim")));
