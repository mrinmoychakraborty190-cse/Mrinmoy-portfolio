const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const progressBar = document.querySelector(".scroll-progress");
const cursorGlow = document.querySelector(".cursor-glow");

const updateScrollProgress = () => {
  if (!progressBar) {
    return;
  }

  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollable > 0 ? window.scrollY / scrollable : 0;
  progressBar.style.transform = `scaleX(${Math.min(Math.max(progress, 0), 1)})`;
};

window.addEventListener("scroll", updateScrollProgress, { passive: true });
window.addEventListener("resize", updateScrollProgress);
updateScrollProgress();

if (cursorGlow && !prefersReducedMotion && matchMedia("(pointer: fine)").matches) {
  let currentX = window.innerWidth / 2;
  let currentY = window.innerHeight / 2;
  let targetX = currentX;
  let targetY = currentY;

  window.addEventListener("pointermove", (event) => {
    targetX = event.clientX;
    targetY = event.clientY;
    cursorGlow.classList.add("is-visible");
  }, { passive: true });

  window.addEventListener("pointerleave", () => {
    cursorGlow.classList.remove("is-visible");
  });

  const renderCursor = () => {
    currentX += (targetX - currentX) * 0.16;
    currentY += (targetY - currentY) * 0.16;
    cursorGlow.style.transform = `translate3d(${currentX - 140}px, ${currentY - 140}px, 0)`;
    requestAnimationFrame(renderCursor);
  };

  renderCursor();
}

const typeTargets = document.querySelectorAll("[data-roles]");
typeTargets.forEach((target) => {
  if (prefersReducedMotion) {
    target.textContent = target.dataset.roles.split("|")[0] || "";
    return;
  }

  const roles = target.dataset.roles.split("|").filter(Boolean);
  let roleIndex = 0;
  let charIndex = 0;
  let deleting = false;

  const type = () => {
    const word = roles[roleIndex] || "";
    target.textContent = deleting ? word.slice(0, charIndex - 1) : word.slice(0, charIndex + 1);
    charIndex += deleting ? -1 : 1;

    if (!deleting && charIndex === word.length) {
      deleting = true;
      setTimeout(type, 1200);
      return;
    }

    if (deleting && charIndex === 0) {
      deleting = false;
      roleIndex = (roleIndex + 1) % roles.length;
    }

    setTimeout(type, deleting ? 38 : 72);
  };

  type();
});

const heroTitle = document.querySelector(".hero-copy h1");
if (heroTitle && !prefersReducedMotion) {
  const words = heroTitle.textContent.trim().split(/\s+/);
  heroTitle.innerHTML = words
    .map((word, index) => `<span class="reveal-word" style="animation-delay:${index * 70}ms">${word}</span>`)
    .join(" ");
}

const tiltCards = document.querySelectorAll(".interactive-card, .profile-card, .hero-copy");
tiltCards.forEach((card) => {
  card.classList.add("tilt-ready");

  if (prefersReducedMotion || !matchMedia("(pointer: fine)").matches) {
    return;
  }

  card.addEventListener("pointermove", (event) => {
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const rotateY = ((x / rect.width) - 0.5) * 8;
    const rotateX = ((y / rect.height) - 0.5) * -8;
    card.style.setProperty("--mx", `${(x / rect.width) * 100}%`);
    card.style.setProperty("--my", `${(y / rect.height) * 100}%`);
    card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    card.classList.add("is-tilting");
  });

  card.addEventListener("pointerleave", () => {
    card.style.transform = "";
    card.classList.remove("is-tilting");
  });
});

const navLinks = [...document.querySelectorAll(".nav-links a")];
const sectionMap = navLinks
  .map((link) => {
    const hash = link.hash;
    return hash ? { link, section: document.querySelector(hash) } : null;
  })
  .filter((item) => item?.section);

if (sectionMap.length) {
  const navObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      navLinks.forEach((link) => link.classList.remove("is-active"));
      const active = sectionMap.find((item) => item.section === entry.target);
      active?.link.classList.add("is-active");
    });
  }, { rootMargin: "-45% 0px -45% 0px" });

  sectionMap.forEach((item) => navObserver.observe(item.section));
}
