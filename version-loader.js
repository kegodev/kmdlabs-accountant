(() => {
  "use strict";

  const APP_ID = "kmd-accountant";
  const PAGE_VERSION =
    document.querySelector('meta[name="app-version"]')?.getAttribute("content") || "0.0.0";
  const VERSION_URL = new URL("./version.json", window.location.href);
  const CACHE_PREFIX = "kmd-accountant-";
  const ATTEMPT_KEY = `${APP_ID}:update-attempt`;
  const STORED_VERSION_KEY = `${APP_ID}:loaded-version`;

  let updateInProgress = false;

  function createLoader(message = "Loading the newest version...") {
    let overlay = document.getElementById("kmd-version-loader");
    if (overlay) {
      const text = overlay.querySelector("[data-loader-message]");
      if (text) text.textContent = message;
      return overlay;
    }

    overlay = document.createElement("div");
    overlay.id = "kmd-version-loader";
    overlay.setAttribute("role", "status");
    overlay.setAttribute("aria-live", "polite");
    overlay.innerHTML = `
      <div style="
        width:min(420px,calc(100vw - 36px));
        background:#111;
        color:#fff;
        border-radius:16px;
        padding:20px;
        box-shadow:0 24px 80px rgba(0,0,0,.35);
        font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;
      ">
        <div style="font-size:16px;font-weight:900;margin-bottom:7px">Updating application</div>
        <div data-loader-message style="font-size:13px;color:#d0d0d0;line-height:1.5">${message}</div>
        <div style="height:7px;background:#333;border-radius:99px;overflow:hidden;margin-top:15px">
          <div style="
            width:45%;
            height:100%;
            background:#f6f2ea;
            border-radius:99px;
            animation:kmdLoaderMove 1.05s infinite ease-in-out;
          "></div>
        </div>
      </div>
    `;

    const style = document.createElement("style");
    style.id = "kmd-version-loader-style";
    style.textContent = `
      @keyframes kmdLoaderMove {
        0% { transform:translateX(-110%); }
        100% { transform:translateX(245%); }
      }
      #kmd-version-loader {
        position:fixed;
        inset:0;
        z-index:999999;
        background:rgba(0,0,0,.68);
        display:flex;
        align-items:center;
        justify-content:center;
        padding:18px;
        backdrop-filter:blur(6px);
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(overlay);
    return overlay;
  }

  function showManualReload(remoteVersion) {
    const overlay = createLoader(
      `Version ${remoteVersion} is available, but the previous page is still cached.`
    );
    const panel = overlay.firstElementChild;
    const existing = panel.querySelector("[data-update-reload]");
    if (existing) return;

    const button = document.createElement("button");
    button.type = "button";
    button.dataset.updateReload = "true";
    button.textContent = "Load updated version";
    button.style.cssText = `
      width:100%;
      border:0;
      border-radius:10px;
      margin-top:14px;
      padding:11px 13px;
      background:#f6f2ea;
      color:#111;
      font-weight:850;
      cursor:pointer;
    `;
    button.addEventListener("click", () => {
      sessionStorage.removeItem(ATTEMPT_KEY);
      const next = new URL(window.location.href);
      next.searchParams.set("appVersion", remoteVersion);
      next.searchParams.set("refresh", Date.now().toString());
      window.location.replace(next.toString());
    });
    panel.appendChild(button);
  }

  async function clearOldAppCaches() {
    if (!("caches" in window)) return;
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((name) => name.startsWith(CACHE_PREFIX))
        .map((name) => caches.delete(name))
    );
  }

  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator) || window.location.protocol === "file:") return null;

    try {
      const registration = await navigator.serviceWorker.register("./sw.js", {
        updateViaCache: "none",
      });
      await registration.update();

      if (registration.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
      }

      return registration;
    } catch (error) {
      console.warn("Service worker registration failed:", error);
      return null;
    }
  }

  async function waitForControllerChange(timeoutMs = 1800) {
    if (!("serviceWorker" in navigator)) return;
    await Promise.race([
      new Promise((resolve) =>
        navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true })
      ),
      new Promise((resolve) => setTimeout(resolve, timeoutMs)),
    ]);
  }

  async function fetchRemoteVersion() {
    const url = new URL(VERSION_URL);
    url.searchParams.set("time", Date.now().toString());

    const response = await fetch(url.toString(), {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });

    if (!response.ok) {
      throw new Error(`Version check returned ${response.status}`);
    }

    const payload = await response.json();
    if (!payload.version) {
      throw new Error("Version file has no version number.");
    }
    return payload;
  }

  async function applyUpdate(remoteVersion) {
    if (updateInProgress) return;
    updateInProgress = true;

    const previousAttempt = sessionStorage.getItem(ATTEMPT_KEY);
    if (previousAttempt === remoteVersion) {
      showManualReload(remoteVersion);
      return;
    }

    sessionStorage.setItem(ATTEMPT_KEY, remoteVersion);
    createLoader(`Downloading version ${remoteVersion}. Your saved records will remain available.`);

    try {
      await clearOldAppCaches();
      await registerServiceWorker();
      await waitForControllerChange();

      localStorage.setItem(STORED_VERSION_KEY, remoteVersion);

      const next = new URL(window.location.href);
      next.searchParams.set("appVersion", remoteVersion);
      next.searchParams.set("refresh", Date.now().toString());
      window.location.replace(next.toString());
    } catch (error) {
      console.warn("Automatic update failed:", error);
      showManualReload(remoteVersion);
    }
  }

  async function checkForUpdate() {
    if (!navigator.onLine || window.location.protocol === "file:") return;

    try {
      const remote = await fetchRemoteVersion();

      if (remote.version !== PAGE_VERSION) {
        await applyUpdate(remote.version);
        return;
      }

      localStorage.setItem(STORED_VERSION_KEY, remote.version);
      sessionStorage.removeItem(ATTEMPT_KEY);
      await registerServiceWorker();
    } catch (error) {
      console.warn("Version check skipped:", error);
      await registerServiceWorker();
    }
  }

  window.KMDVersionLoader = {
    checkForUpdate,
    registerServiceWorker,
    pageVersion: PAGE_VERSION,
  };

  window.addEventListener("online", checkForUpdate);
  window.addEventListener("load", checkForUpdate, { once: true });
})();
