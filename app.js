document.querySelectorAll(".reveal").forEach((el, i) => {
  const io = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      el.style.transitionDelay = `${Math.min(i * 0.05, 0.25)}s`;
      el.classList.add("in");
      io.disconnect();
    },
    { threshold: 0.15 }
  );
  io.observe(el);
});

const stage = document.querySelector(".hero-phones");
if (stage && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  stage.addEventListener("pointermove", (e) => {
    const r = stage.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    stage.style.setProperty("--tiltX", `${y * -4}deg`);
    stage.style.setProperty("--tiltY", `${x * 6}deg`);
    const main = stage.querySelector(".phone-main");
    if (main) {
      main.style.transform = `rotateX(var(--tiltX, 0deg)) rotateY(var(--tiltY, 0deg))`;
    }
  });
  stage.addEventListener("pointerleave", () => {
    const main = stage.querySelector(".phone-main");
    if (main) main.style.transform = "";
  });
}
