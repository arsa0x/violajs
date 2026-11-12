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

document.querySelector("#year").textContent = new Date().getFullYear();
