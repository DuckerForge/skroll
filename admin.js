const WORKER = "https://skroll-r2-upload.infernaytb.workers.dev";

/** Minimal base58 encode (browser, no CDN). */
const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function bs58encode(bytes) {
  const input = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (!input.length) return "";
  let zeros = 0;
  while (zeros < input.length && input[zeros] === 0) zeros += 1;
  const size = (((input.length - zeros) * 138) / 100 + 1) | 0;
  const b = new Uint8Array(size);
  let length = 0;
  for (let i = zeros; i < input.length; i += 1) {
    let carry = input[i];
    let j = 0;
    for (let k = size - 1; k >= 0 && (carry !== 0 || j < length); k -= 1, j += 1) {
      carry += 256 * b[k];
      b[k] = carry % 58;
      carry = (carry / 58) | 0;
    }
    length = j;
  }
  let it = size - length;
  while (it < size && b[it] === 0) it += 1;
  let str = "1".repeat(zeros);
  for (; it < size; it += 1) str += B58[b[it]];
  return str;
}

const connectBtn = document.getElementById("connectBtn");
const connectBtn2 = document.getElementById("connectBtn2");
const refreshBtn = document.getElementById("refreshBtn");
const gate = document.getElementById("gate");
const toolbar = document.getElementById("toolbar");
const list = document.getElementById("list");
const errorEl = document.getElementById("error");
const session = document.getElementById("session");
const sessionLabel = document.getElementById("sessionLabel");
const stats = document.getElementById("stats");

let wallet = null;

function short(addr) {
  return addr ? `${addr.slice(0, 4)}…${addr.slice(-4)}` : "—";
}

function getProvider() {
  const w = window;
  if (w.solana?.isPhantom) return w.solana;
  if (w.solana?.isSolflare) return w.solana;
  if (w.solana) return w.solana;
  if (w.solflare) return w.solflare;
  return null;
}

function setConnected(addr) {
  wallet = addr;
  const on = Boolean(addr);
  session.classList.toggle("on", on);
  sessionLabel.textContent = on ? `Admin ${short(addr)}` : "Not connected";
  connectBtn.textContent = on ? "Disconnect" : "Connect wallet";
  gate.hidden = on;
  toolbar.hidden = !on;
  list.hidden = !on;
}

function showError(msg) {
  if (!msg) {
    errorEl.hidden = true;
    errorEl.textContent = "";
    return;
  }
  errorEl.hidden = false;
  errorEl.textContent = msg;
}

async function connect() {
  showError("");
  const provider = getProvider();
  if (!provider) {
    showError("Install Phantom, Solflare, or open this page from a Solana wallet browser.");
    return;
  }
  try {
    const res = await provider.connect();
    const key = res?.publicKey?.toString?.() || provider.publicKey?.toString?.();
    if (!key) throw new Error("No public key returned");
    setConnected(key);
    await loadReports();
  } catch (e) {
    showError(e instanceof Error ? e.message : "Connect failed");
  }
}

function disconnect() {
  const provider = getProvider();
  try {
    provider?.disconnect?.();
  } catch {
    /* ignore */
  }
  setConnected(null);
  list.innerHTML = "";
  stats.textContent = "";
}

async function signAdminHeaders() {
  if (!wallet) throw new Error("Connect admin wallet first");
  const provider = getProvider();
  if (!provider?.signMessage) {
    throw new Error("Wallet does not support signMessage");
  }
  const ts = Date.now();
  const message = `skroll-admin:${wallet}:${ts}`;
  const encoded = new TextEncoder().encode(message);
  const signed = await provider.signMessage(encoded, "utf8");
  const sigBytes = signed.signature || signed;
  const sig = bs58encode(sigBytes instanceof Uint8Array ? sigBytes : new Uint8Array(sigBytes));
  return {
    "X-Skroll-Admin-Wallet": wallet,
    "X-Skroll-Admin-Ts": String(ts),
    "X-Skroll-Admin-Sig": sig,
  };
}

async function adminFetch(path, options = {}) {
  const headers = {
    Accept: "application/json",
    ...(options.headers || {}),
    ...(await signAdminHeaders()),
  };
  const res = await fetch(`${WORKER}${path}`, { ...options, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}

function renderItems(items, threshold) {
  if (!items.length) {
    list.innerHTML = `<div class="empty">No reported or hidden clips right now.</div>`;
    stats.textContent = `Threshold ${threshold} · 0 clips`;
    return;
  }
  const hiddenN = items.filter((i) => i.hidden).length;
  stats.textContent = `${items.length} clips · ${hiddenN} hidden · hide at ${threshold}`;

  list.innerHTML = items
    .map((item) => {
      const media = item.videoUrl
        ? `<video src="${item.videoUrl}" muted playsinline preload="metadata"></video>`
        : `<div class="thumb">missing</div>`;
      const hideBtn = item.hidden
        ? `<button class="btn ghost" data-act="unhide" data-wallet="${item.creatorWallet}" data-id="${item.id}" data-key="${item.key}">Restore</button>`
        : `<button class="btn ghost" data-act="hide" data-wallet="${item.creatorWallet}" data-id="${item.id}" data-key="${item.key}">Hide</button>`;
      return `
      <article class="clip ${item.hidden ? "is-hidden" : ""}">
        ${media}
        <div>
          <h3>${escapeHtml(item.caption || "Untitled")}</h3>
          <p>${short(item.creatorWallet)} · <code>${escapeHtml(item.id)}</code></p>
          <div class="meta">
            <span class="badge ${item.reportCount >= threshold ? "warn" : ""}">${item.reportCount}/${threshold} reports</span>
            <span class="badge ${item.hidden ? "warn" : "ok"}">${item.hidden ? "HIDDEN" : "LIVE"}</span>
            ${item.hiddenReason ? `<span class="badge">${escapeHtml(item.hiddenReason)}</span>` : ""}
          </div>
        </div>
        <div class="actions">
          ${hideBtn}
          <button class="btn danger" data-act="delete" data-wallet="${item.creatorWallet}" data-id="${item.id}" data-key="${item.key}">Delete</button>
        </div>
      </article>`;
    })
    .join("");
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function loadReports() {
  showError("");
  try {
    const data = await adminFetch("/admin/reports");
    renderItems(data.items || [], data.threshold || 15);
  } catch (e) {
    list.innerHTML = "";
    showError(e instanceof Error ? e.message : "Failed to load reports");
  }
}

async function onAction(btn) {
  const act = btn.dataset.act;
  const creatorWallet = btn.dataset.wallet;
  const id = btn.dataset.id;
  const key = btn.dataset.key;
  if (!act || !creatorWallet || !id) return;

  if (act === "delete" && !confirm(`Delete clip ${id} forever?`)) return;

  btn.disabled = true;
  showError("");
  try {
    const path =
      act === "hide" ? "/admin/hide" : act === "unhide" ? "/admin/unhide" : "/admin/delete";
    await adminFetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creatorWallet, id, key }),
    });
    await loadReports();
  } catch (e) {
    showError(e instanceof Error ? e.message : "Action failed");
  } finally {
    btn.disabled = false;
  }
}

connectBtn.addEventListener("click", () => {
  if (wallet) disconnect();
  else connect();
});
connectBtn2.addEventListener("click", connect);
refreshBtn.addEventListener("click", loadReports);
list.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-act]");
  if (btn) onAction(btn);
});

const provider = getProvider();
provider?.on?.("accountChanged", (pk) => {
  if (!pk) disconnect();
  else {
    setConnected(pk.toString());
    loadReports();
  }
});
