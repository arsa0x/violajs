const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");

navToggle?.addEventListener("click", () => {
  const isOpen = navLinks.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
  navToggle.setAttribute(
    "aria-label",
    isOpen ? "Close navigation" : "Open navigation",
  );
});

navLinks?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    navLinks.classList.remove("open");
    navToggle?.setAttribute("aria-expanded", "false");
  });
});

const toast = document.querySelector(".toast");
let toastTimeout;

document.querySelectorAll("[data-copy]").forEach((button) => {
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      toast.textContent = "Copied to clipboard";
      toast.classList.add("show");
      button.textContent = "copied";
      clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => {
        toast.classList.remove("show");
        button.textContent = "copy";
      }, 1500);
    } catch {
      toast.textContent = "Could not access clipboard";
      toast.classList.add("show");
      clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => toast.classList.remove("show"), 1800);
    }
  });
});

document.querySelector("#year")?.textContent = new Date().getFullYear();

// Theme preference: follow the operating system until the user makes a choice.
const themeToggle = document.querySelector(".theme-toggle");
const themeIcon = document.querySelector(".theme-icon");
const themeLabel = document.querySelector(".theme-label");
const themeColor = document.querySelector('meta[name="theme-color"]');
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.documentElement.dataset.theme = isDark ? "dark" : "light";
  themeToggle?.setAttribute("aria-pressed", String(isDark));
  themeToggle?.setAttribute(
    "aria-label",
    isDark ? "Switch to light mode" : "Switch to dark mode",
  );
  if (themeIcon) themeIcon.textContent = isDark ? "☀" : "☾";
  if (themeLabel) themeLabel.textContent = isDark ? "Light mode" : "Dark mode";
  if (themeColor) themeColor.content = isDark ? "#13121b" : "#f8f7fc";
}

themeToggle?.addEventListener("click", () => {
  const nextTheme =
    document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
  try {
    localStorage.setItem("violajs-theme", nextTheme);
  } catch {}
});

systemTheme.addEventListener?.("change", (event) => {
  try {
    if (!localStorage.getItem("violajs-theme"))
      applyTheme(event.matches ? "dark" : "light");
  } catch {
    applyTheme(event.matches ? "dark" : "light");
  }
});

applyTheme(
  document.documentElement.dataset.theme ||
    (systemTheme.matches ? "dark" : "light"),
);
