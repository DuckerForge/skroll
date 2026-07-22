const WORKER = "https://skroll-r2-upload.infernaytb.workers.dev";
const AUTH = "dev-placeholder";

const form = document.getElementById("status-form");
const errorEl = document.getElementById("error");
const result = document.getElementById("result");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.hidden = true;
  result.classList.remove("show", "hidden-clip");

  const creatorWallet = document.getElementById("creatorWallet").value.trim();
  const id = document.getElementById("videoId").value.trim();
  const url = new URL("/report-status", WORKER);
  url.searchParams.set("creatorWallet", creatorWallet);
  url.searchParams.set("id", id);

  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-Skroll-Auth": AUTH,
      },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(body.error || `Request failed (${res.status})`);
    }

    const count = Number(body.reportCount ?? 0);
    const threshold = Number(body.threshold ?? body.willHideAt ?? 15);
    const hidden = Boolean(body.hidden);

    document.getElementById("reportCount").textContent = `${count} / ${threshold}`;
    document.getElementById("threshold").textContent = String(threshold);
    document.getElementById("hidden").textContent = hidden ? "Yes — invisible in feed" : "No";
    document.getElementById("reason").textContent = body.hiddenReason || "—";
    document.getElementById("hiddenAt").textContent = body.hiddenAt || "—";
    document.getElementById("barFill").style.width = `${Math.min(100, (count / threshold) * 100)}%`;

    result.classList.add("show");
    if (hidden) result.classList.add("hidden-clip");
  } catch (err) {
    errorEl.textContent = err instanceof Error ? err.message : "Could not load status";
    errorEl.hidden = false;
  }
});
