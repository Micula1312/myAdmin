(() => {
  const KEY = "myadmin-2026-v3";
  let serverOnline = false;
  let saveTimer = null;

  function badge(text, ok) {
    let el = document.getElementById("serverStatusBadge");
    if (!el) {
      el = document.createElement("div");
      el.id = "serverStatusBadge";
      el.style.cssText = "position:fixed;right:14px;bottom:14px;z-index:9999;padding:8px 10px;border-radius:999px;font:700 10px Arial,sans-serif;letter-spacing:.05em;border:1px solid #111;background:#fff";
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.style.background = ok ? "#d8ff3e" : "#fff";
  }

  async function pushState(state) {
    if (!serverOnline) return;
    try {
      const res = await fetch("/api/state", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(state)
      });
      if (!res.ok) throw new Error("save failed");
      badge("EXCEL SALVATO", true);
    } catch (err) {
      serverOnline = false;
      badge("SOLO BROWSER", false);
      console.warn("myAdmin: salvataggio server non disponibile", err);
    }
  }

  function schedulePush(state) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => pushState(state), 100);
  }

  async function bootstrap() {
    try {
      const res = await fetch("/api/state", {cache: "no-store"});
      if (!res.ok) throw new Error("server unavailable");
      const state = await res.json();
      localStorage.setItem(KEY, JSON.stringify(state));
      serverOnline = true;
      badge("EXCEL COLLEGATO", true);
      if (typeof renderAll === "function") renderAll();
    } catch (err) {
      serverOnline = false;
      badge("SOLO BROWSER", false);
      console.info("myAdmin aperto senza server.py: uso localStorage", err);
    }
  }

  // Sostituisce il salvataggio applicativo: locale subito, Excel subito dopo.
  if (typeof setState === "function") {
    const originalSetState = setState;
    window.setState = function(state) {
      originalSetState(state);
      schedulePush(state);
    };
  }

  // Il reset dell'app nel codice storico scrive direttamente nel localStorage.
  const reset = document.getElementById("resetYear");
  if (reset) {
    reset.addEventListener("click", () => {
      setTimeout(() => {
        try {
          const state = JSON.parse(localStorage.getItem(KEY) || "null");
          if (state) schedulePush(state);
        } catch (_) {}
      }, 150);
    });
  }

  // Link rapido al foglio Excel generato dal server.
  const header = document.querySelector(".topbar");
  if (header) {
    const a = document.createElement("a");
    a.href = "/data/registro-2026.xlsx";
    a.textContent = "APRI REGISTRO EXCEL";
    a.className = "ghost excel-link";
    a.style.textDecoration = "none";
    a.style.marginLeft = "8px";
    const resetBtn = document.getElementById("resetYear");
    if (resetBtn?.parentNode) resetBtn.parentNode.insertBefore(a, resetBtn);
  }

  bootstrap();
})();
