const body = document.body;
const header = document.querySelector("#site-header");
const menuButton = document.querySelector(".menu-toggle");
const navPanel = document.querySelector(".nav-panel");
const navLinks = [...document.querySelectorAll('.nav-panel a[href^="#"]')];
const themeButton = document.querySelector(".theme-toggle");
const themeIcon = themeButton?.querySelector("i");

function setMenu(open) {
  if (!menuButton || !navPanel) return;

  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
  navPanel.classList.toggle("open", open);
  body.classList.toggle("menu-open", open);
}

menuButton?.addEventListener("click", () => {
  setMenu(menuButton.getAttribute("aria-expanded") !== "true");
});

navLinks.forEach((link) => link.addEventListener("click", () => setMenu(false)));

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setMenu(false);
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 820) setMenu(false);
});

function updateHeader() {
  header?.classList.toggle("scrolled", window.scrollY > 18);
}

updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

function applyTheme(theme) {
  const isLight = theme === "light";
  body.classList.toggle("dark-theme", !isLight);

  if (themeButton) {
    themeButton.setAttribute("aria-label", isLight ? "Switch to dark theme" : "Switch to light theme");
  }

  if (themeIcon) {
    themeIcon.className = isLight ? "fa-solid fa-moon" : "fa-solid fa-sun";
  }
}

const savedTheme = localStorage.getItem("portfolio-theme");
applyTheme(savedTheme || "dark");

themeButton?.addEventListener("click", () => {
  const nextTheme = body.classList.contains("dark-theme") ? "light" : "dark";
  localStorage.setItem("portfolio-theme", nextTheme);
  applyTheme(nextTheme);
});

const pageOrder = ["home", "research", "publications", "contact"];
const pagePanels = [...document.querySelectorAll(".page-panel")];
let activePage = "home";
let pageTransitionTimer = 0;
let pageTransitionCleanupTimer = 0;

function showPage(page, { updateHistory = true, direction, animate = true } = {}) {
  if (!pageOrder.includes(page)) page = "home";
  const previousIndex = pageOrder.indexOf(activePage);
  const nextIndex = pageOrder.indexOf(page);
  const transitionDirection = direction || (nextIndex >= previousIndex ? "next" : "previous");
  if (page === activePage && document.body.dataset.page) return;

  const commitPage = () => {
    activePage = page;
    pagePanels.forEach((panel) => {
      const isActive = panel.dataset.page === page;
      panel.classList.toggle("active", isActive);
      panel.classList.toggle("from-previous", isActive && transitionDirection === "previous");
      panel.setAttribute("aria-hidden", String(!isActive));
      if ("inert" in panel) panel.inert = !isActive;
    });
    navLinks.forEach((link) => link.classList.toggle("active", link.getAttribute("href") === `#${page}`));
    document.body.dataset.page = page;
    window.scrollTo({ top: 0, behavior: "auto" });
    if (updateHistory && window.location.hash !== `#${page}`) history.pushState({ page }, "", `#${page}`);
  };

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!animate || reduceMotion) {
    commitPage();
    return;
  }

  window.clearTimeout(pageTransitionTimer);
  window.clearTimeout(pageTransitionCleanupTimer);
  body.classList.remove("fluid-transitioning", "fluid-reverse");
  void body.offsetWidth;
  body.classList.toggle("fluid-reverse", transitionDirection === "previous");
  body.classList.add("fluid-transitioning");
  pageTransitionTimer = window.setTimeout(commitPage, 335);
  pageTransitionCleanupTimer = window.setTimeout(() => body.classList.remove("fluid-transitioning", "fluid-reverse"), 850);
}

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  const page = link.getAttribute("href").slice(1);
  if (!pageOrder.includes(page)) return;
  link.addEventListener("click", (event) => {
    event.preventDefault();
    showPage(page);
    setMenu(false);
  });
});

window.addEventListener("popstate", () => showPage(window.location.hash.slice(1), { updateHistory: false }));

let touchStartX = 0;
let touchStartY = 0;
document.addEventListener("touchstart", (event) => {
  if (document.querySelector("dialog[open]")) return;
  touchStartX = event.changedTouches[0].screenX;
  touchStartY = event.changedTouches[0].screenY;
}, { passive: true });
document.addEventListener("touchend", (event) => {
  if (!touchStartX || document.querySelector("dialog[open]")) return;
  const deltaX = event.changedTouches[0].screenX - touchStartX;
  const deltaY = event.changedTouches[0].screenY - touchStartY;
  touchStartX = 0;
  touchStartY = 0;
  if (Math.abs(deltaX) < 70 || Math.abs(deltaX) < Math.abs(deltaY) * 1.25) return;
  const currentIndex = pageOrder.indexOf(activePage);
  const targetIndex = deltaX < 0 ? currentIndex + 1 : currentIndex - 1;
  if (targetIndex >= 0 && targetIndex < pageOrder.length) showPage(pageOrder[targetIndex], { direction: deltaX < 0 ? "next" : "previous" });
}, { passive: true });

document.addEventListener("keydown", (event) => {
  if (document.querySelector("dialog[open]") || event.target.matches("input, textarea, select")) return;
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  const currentIndex = pageOrder.indexOf(activePage);
  const targetIndex = event.key === "ArrowRight" ? currentIndex + 1 : currentIndex - 1;
  if (targetIndex >= 0 && targetIndex < pageOrder.length) showPage(pageOrder[targetIndex], { direction: event.key === "ArrowRight" ? "next" : "previous" });
});

showPage(window.location.hash.slice(1), { updateHistory: false, animate: false });

const year = document.querySelector("#current-year");
if (year) year.textContent = new Date().getFullYear();
