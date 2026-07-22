document.querySelectorAll(".steps li, .get-card").forEach((el, i) => {
  el.style.opacity = "0";
  el.style.transform = "translateY(12px)";
  const io = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      el.style.transition = `opacity 0.5s ease ${i * 0.06}s, transform 0.5s ease ${i * 0.06}s`;
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
      io.disconnect();
    },
    { threshold: 0.2 }
  );
  io.observe(el);
});
