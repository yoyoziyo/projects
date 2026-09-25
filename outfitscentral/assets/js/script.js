const LINKS = {
  community: "https://www.roblox.com/communities/33319096/Outfits-Central#!/about",
  hub: "https://www.roblox.com/games/119452074842123/"
};

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
const root = document.documentElement;
const profileCard = document.querySelector(".profile-card");
const toast = document.querySelector("#toast");

// Camada básica contra download casual das imagens.
document.addEventListener("contextmenu", event => event.preventDefault());
document.addEventListener("dragstart", event => {
  if (event.target instanceof HTMLImageElement) event.preventDefault();
});

document.querySelectorAll("[data-link]").forEach(link => {
  const destination = LINKS[link.dataset.link];

  if (destination) {
    link.href = destination;
  } else {
    link.removeAttribute("target");
    link.removeAttribute("rel");
    link.addEventListener("click", event => {
      event.preventDefault();
      showToast("Este portal será liberado em breve.");
    });
  }

  if (!coarsePointer && !reducedMotion) {
    link.addEventListener("pointermove", event => {
      const rect = link.getBoundingClientRect();
      link.style.setProperty("--x", `${event.clientX - rect.left}px`);
      link.style.setProperty("--y", `${event.clientY - rect.top}px`);
    });
  }
});

let toastTimer;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

if (!coarsePointer && !reducedMotion) {
  profileCard.addEventListener("pointermove", event => {
    const rect = profileCard.getBoundingClientRect();
    root.style.setProperty("--mx", `${event.clientX - rect.left}px`);
    root.style.setProperty("--my", `${event.clientY - rect.top}px`);
  });
}

const canvas = document.querySelector("#starfield");
const context = canvas.getContext("2d", { alpha: true });
let stars = [];
let animationFrame;

function resizeStarfield() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(innerWidth * ratio);
  canvas.height = Math.round(innerHeight * ratio);
  canvas.style.width = `${innerWidth}px`;
  canvas.style.height = `${innerHeight}px`;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);

  const count = Math.min(95, Math.max(34, Math.round((innerWidth * innerHeight) / 14500)));
  stars = Array.from({ length: count }, () => ({
    x: Math.random() * innerWidth,
    y: Math.random() * innerHeight,
    radius: Math.random() * 1.2 + .25,
    alpha: Math.random() * .58 + .16,
    speed: Math.random() * .055 + .018,
    phase: Math.random() * Math.PI * 2
  }));
}

function renderStars(time = 0) {
  context.clearRect(0, 0, innerWidth, innerHeight);

  stars.forEach(star => {
    const pulse = reducedMotion ? 1 : .62 + Math.sin(time * star.speed * .01 + star.phase) * .38;
    context.beginPath();
    context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    context.fillStyle = `rgba(218, 222, 230, ${Math.max(.05, star.alpha * pulse)})`;
    context.fill();
  });

  if (!reducedMotion) animationFrame = requestAnimationFrame(renderStars);
}

resizeStarfield();
renderStars();

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    cancelAnimationFrame(animationFrame);
    resizeStarfield();
    renderStars();
  }, 120);
}, { passive: true });
