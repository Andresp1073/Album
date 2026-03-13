let deferredPrompt = null

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

function isInStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true
}

function createPwaUi() {
  if (document.getElementById("pwaBanner")) return

  const banner = document.createElement("div")
  banner.id = "pwaBanner"
  banner.innerHTML = `
    <div id="pwaBannerCard" style="
      position:fixed;
      left:16px;
      right:16px;
      bottom:16px;
      z-index:9999;
      background:rgba(255,255,255,.98);
      border:1px solid #ffd9e8;
      border-radius:18px;
      box-shadow:0 14px 30px rgba(0,0,0,.14);
      padding:14px 14px 12px;
      font-family:Arial, Helvetica, sans-serif;
      display:none;
    ">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
        <div style="flex:1;">
          <div style="font-size:15px;font-weight:700;color:#d63384;margin-bottom:6px;">
            Instala esta app 💖
          </div>
          <div id="pwaBannerText" style="font-size:13px;line-height:1.5;color:#6f4960;">
            Instala la app para abrirla más rápido desde tu celular.
          </div>
        </div>

        <button id="pwaCloseBtn" type="button" style="
          border:none;
          background:#fff2f7;
          color:#d63384;
          width:34px;
          height:34px;
          border-radius:999px;
          font-size:18px;
          cursor:pointer;
          flex-shrink:0;
        ">×</button>
      </div>

      <div id="pwaBannerActions" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;">
        <button id="pwaInstallBtn" type="button" style="
          border:none;
          background:#ff6fae;
          color:white;
          padding:10px 14px;
          border-radius:12px;
          font-size:14px;
          font-weight:700;
          cursor:pointer;
          display:none;
        ">Instalar app</button>

        <button id="pwaIosHelpBtn" type="button" style="
          border:none;
          background:white;
          color:#d63384;
          padding:10px 14px;
          border-radius:12px;
          font-size:14px;
          font-weight:700;
          cursor:pointer;
          border:1px solid #ffd0e2;
          display:none;
        ">Cómo instalar en iPhone</button>
      </div>
    </div>
  `

  document.body.appendChild(banner)

  const card = document.getElementById("pwaBannerCard")
  const closeBtn = document.getElementById("pwaCloseBtn")
  const installBtn = document.getElementById("pwaInstallBtn")
  const iosHelpBtn = document.getElementById("pwaIosHelpBtn")
  const text = document.getElementById("pwaBannerText")

  closeBtn.addEventListener("click", () => {
    card.style.display = "none"
    localStorage.setItem("pwa-banner-dismissed", "1")
  })

  installBtn.addEventListener("click", async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === "accepted") {
      card.style.display = "none"
    }

    deferredPrompt = null
    installBtn.style.display = "none"
  })

  iosHelpBtn.addEventListener("click", () => {
    alert('En iPhone: abre esta página en Safari, toca "Compartir" y luego "Añadir a pantalla de inicio".')
  })

  const dismissed = localStorage.getItem("pwa-banner-dismissed") === "1"
  if (dismissed || isInStandaloneMode()) return

  if (isIos()) {
    text.textContent = 'Para instalar esta app en iPhone, abre en Safari y usa "Añadir a pantalla de inicio".'
    iosHelpBtn.style.display = "inline-block"
    card.style.display = "block"
  }
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault()
  deferredPrompt = e

  createPwaUi()

  const card = document.getElementById("pwaBannerCard")
  const installBtn = document.getElementById("pwaInstallBtn")

  if (card && installBtn && !isInStandaloneMode()) {
    installBtn.style.display = "inline-block"
    card.style.display = "block"
  }
})

window.addEventListener("appinstalled", () => {
  deferredPrompt = null
  const card = document.getElementById("pwaBannerCard")
  if (card) card.style.display = "none"
})

window.addEventListener("load", () => {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/service-worker.js")
      .then(() => console.log("Service Worker registrado"))
      .catch((err) => console.log("Error SW", err))
  }

  createPwaUi()
})