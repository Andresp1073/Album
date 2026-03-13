const albumTitle = document.getElementById("albumTitle")
const backBtn = document.getElementById("backBtn")
const uploadToggleBtn = document.getElementById("uploadToggleBtn")
const uploadPanel = document.getElementById("uploadPanel")
const uploadBtn = document.getElementById("uploadBtn")
const fileInput = document.getElementById("fileInput")
const galleryGrid = document.getElementById("galleryGrid")
const statusText = document.getElementById("statusText")

const viewerModal = document.getElementById("viewerModal")
const viewerContent = document.getElementById("viewerContent")
const viewerMenuBtn = document.getElementById("viewerMenuBtn")
const viewerMenu = document.getElementById("viewerMenu")
const shareBtn = document.getElementById("shareBtn")
const deleteViewerBtn = document.getElementById("deleteViewerBtn")

const confirmModal = document.getElementById("confirmModal")
const confirmYesBtn = document.getElementById("confirmYesBtn")
const confirmNoBtn = document.getElementById("confirmNoBtn")

const params = new URLSearchParams(window.location.search)
const albumId = params.get("id")

let currentUser = null
let currentAlbum = null
let currentViewerItem = null
let currentMediaList = []
let currentViewerIndex = 0

document.addEventListener("DOMContentLoaded", async () => {
  if (!albumId) {
    alert("Álbum no válido.")
    window.location.href = "dashboard.html"
    return
  }

  const { data, error } = await window.supabaseClient.auth.getUser()

  if (error || !data.user) {
    alert("Sesión no válida. Vuelve a iniciar sesión.")
    window.location.href = "index.html"
    return
  }

  currentUser = data.user

  await loadAlbum()
  await loadMedia()
})

backBtn.addEventListener("click", () => {
  window.location.href = "dashboard.html"
})

uploadToggleBtn.addEventListener("click", () => {
  uploadPanel.classList.toggle("show")
})

uploadBtn.addEventListener("click", async () => {
  const files = fileInput.files

  if (!files || !files.length) {
    alert("Selecciona al menos un archivo.")
    return
  }

  uploadBtn.disabled = true
  statusText.textContent = "Subiendo archivos..."

  try {
    for (const file of files) {
      await uploadSingleFile(file)
    }

    fileInput.value = ""
    statusText.textContent = "Archivos subidos correctamente 💖"
    await loadMedia()
  } catch (error) {
    console.error(error)
    statusText.textContent = ""
    alert("Error subiendo archivos: " + error.message)
  } finally {
    uploadBtn.disabled = false
  }
})

viewerModal.addEventListener("click", (e) => {
  if (e.target === viewerModal) {
    closeViewer()
  }
  viewerMenu.classList.remove("show")
})

viewerMenuBtn.addEventListener("click", (e) => {
  e.stopPropagation()
  viewerMenu.classList.toggle("show")
})

shareBtn.addEventListener("click", async () => {
  const item = currentMediaList[currentViewerIndex]
  if (!item) return
  const url = await getSignedFileUrl(item.file_path)
  if (!url) return
  if (navigator.share) {
    try {
      if (item.file_type === "image") {
        const response = await fetch(url)
        const blob = await response.blob()
        const file = new File([blob], "foto.jpg", { type: "image/jpeg" })
        await navigator.share({ files: [file] })
      } else {
        await navigator.share({ url, title: "Video" })
      }
    } catch (e) {}
  } else {
    window.open(url, "_blank")
  }
  viewerMenu.classList.remove("show")
})

deleteViewerBtn.addEventListener("click", () => {
  viewerMenu.classList.remove("show")
  confirmModal.classList.add("show")
})

let viewerTouchStartX = 0
let viewerTouchStartY = 0

viewerModal.addEventListener("touchstart", (e) => {
  viewerTouchStartX = e.touches[0].clientX
  viewerTouchStartY = e.touches[0].clientY
}, { passive: true })

viewerModal.addEventListener("touchend", (e) => {
  const endX = e.changedTouches[0].clientX
  const endY = e.changedTouches[0].clientY
  const diffX = endX - viewerTouchStartX
  const diffY = endY - viewerTouchStartY
  
  if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 30) {
    if (diffX > 0) {
      showPrevMedia()
    } else {
      showNextMedia()
    }
  } else if (diffY > 50) {
    closeViewer()
  }
}, { passive: true })

document.addEventListener("keydown", (e) => {
  if (viewerModal.style.display !== "flex") return
  if (e.key === "ArrowLeft") showPrevMedia()
  if (e.key === "ArrowRight") showNextMedia()
  if (e.key === "Escape") closeViewer()
})

confirmNoBtn.addEventListener("click", () => {
  confirmModal.classList.remove("show")
})

confirmYesBtn.addEventListener("click", async () => {
  if (!currentViewerItem) return

  confirmYesBtn.disabled = true

  const { error } = await window.supabaseClient
    .from("media")
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString()
    })
    .eq("id", currentViewerItem.id)
    .eq("user_id", currentUser.id)

  confirmYesBtn.disabled = false
  confirmModal.classList.remove("show")

  if (error) {
    alert("Error eliminando archivo: " + error.message)
    console.error(error)
    return
  }

  closeViewer()
  await loadMedia()
})

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    confirmModal.classList.remove("show")
    closeViewer()
  }
})
    if (confirmModal.style.display === "flex") {
      confirmModal.style.display = "none"
      return
    }

    if (viewerModal.style.display === "flex") {
      closeViewer()
    }
  }
})

async function loadAlbum() {
  const { data, error } = await window.supabaseClient
    .from("albums")
    .select("id, name, user_id")
    .eq("id", albumId)
    .eq("user_id", currentUser.id)
    .single()

  if (error || !data) {
    alert("No se pudo cargar el álbum.")
    window.location.href = "dashboard.html"
    return
  }

  currentAlbum = data
  albumTitle.textContent = data.name
}

async function loadMedia() {
  const { data, error } = await window.supabaseClient
    .from("media")
    .select("id, file_path, file_type, created_at, is_deleted")
    .eq("album_id", albumId)
    .eq("user_id", currentUser.id)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })

  if (error) {
    alert("Error cargando archivos: " + error.message)
    console.error(error)
    return
  }

  currentMediaList = data || []
  await renderMedia(currentMediaList)
}

async function renderMedia(items) {
  galleryGrid.innerHTML = ""

  if (!items.length) {
    galleryGrid.innerHTML = `
      <div class="empty-media" style="grid-column:1/-1;">
        <h3 style="margin-top:0;color:#d63384;">Aún no hay archivos</h3>
        <p>Sube las primeras fotos o videos de este álbum 💕</p>
      </div>
    `
    return
  }

  for (const item of items) {
    const card = document.createElement("div")
    card.className = "media-card"

    const inner = document.createElement("div")
    inner.className = "media-inner"

    const badge = document.createElement("div")
    badge.className = "media-badge"
    badge.textContent = item.file_type === "image" ? "Foto" : "Video"

    const signedUrl = await getSignedFileUrl(item.file_path)

    if (!signedUrl) {
      inner.innerHTML = `
        <div class="media-fallback">
          No se pudo cargar este archivo
        </div>
      `
      card.appendChild(inner)
      card.appendChild(badge)
      galleryGrid.appendChild(card)
      continue
    }

    if (item.file_type === "image") {
      const img = document.createElement("img")
      img.className = "media-preview"
      img.src = signedUrl
      img.alt = "Foto del álbum"
      img.loading = "lazy"

      img.onerror = () => {
        inner.innerHTML = `
          <div class="media-fallback">
            No se pudo mostrar la foto
          </div>
        `
      }

      inner.appendChild(img)
    } else {
      const video = document.createElement("video")
      video.className = "media-preview video-preview"
      video.src = signedUrl
      video.muted = true
      video.playsInline = true
      video.preload = "metadata"

      video.onerror = () => {
        inner.innerHTML = `
          <div class="media-fallback">
            No se pudo mostrar el video
          </div>
        `
      }

      inner.appendChild(video)
    }

    card.appendChild(inner)
    card.appendChild(badge)

    card.addEventListener("click", () => {
      const index = currentMediaList.findIndex(m => m.id === item.id)
      openViewer({
        index,
        id: item.id,
        file_type: item.file_type,
        signedUrl
      })
    })

    galleryGrid.appendChild(card)
  }
}

function openViewer(item) {
  currentViewerItem = item
  currentViewerIndex = item.index
  viewerContent.innerHTML = ""

  if (item.file_type === "image") {
    const img = document.createElement("img")
    img.className = "viewer-media"
    img.src = item.signedUrl
    img.alt = "Foto ampliada"
    viewerContent.appendChild(img)
  } else {
    const video = document.createElement("video")
    video.className = "viewer-media"
    video.src = item.signedUrl
    video.controls = true
    video.autoplay = false
    video.playsInline = true
    viewerContent.appendChild(video)
  }

  viewerModal.style.display = "flex"
}

function closeViewer() {
  viewerModal.style.display = "none"
  viewerContent.innerHTML = ""
  currentViewerItem = null
  currentViewerIndex = 0
}

function showPrevMedia() {
  if (currentViewerIndex > 0) {
    currentViewerIndex--
    loadCurrentMedia()
  }
}

function showNextMedia() {
  if (currentViewerIndex < currentMediaList.length - 1) {
    currentViewerIndex++
    loadCurrentMedia()
  }
}

async function loadCurrentMedia() {
  const item = currentMediaList[currentViewerIndex]
  if (!item) return

  currentViewerItem = { index: currentViewerIndex, id: item.id, file_type: item.file_type }
  viewerContent.innerHTML = ""

  const signedUrl = await getSignedFileUrl(item.file_path)
  if (!signedUrl) return

  if (item.file_type === "image") {
    const img = document.createElement("img")
    img.className = "viewer-media"
    img.src = signedUrl
    img.alt = "Foto ampliada"
    viewerContent.appendChild(img)
  } else {
    const video = document.createElement("video")
    video.className = "viewer-media"
    video.src = signedUrl
    video.controls = true
    video.autoplay = false
    video.playsInline = true
    viewerContent.appendChild(video)
  }
}

async function getSignedFileUrl(filePath) {
  const { data, error } = await window.supabaseClient.storage
    .from("album-media")
    .createSignedUrl(filePath, 3600)

  if (error || !data?.signedUrl) {
    console.error("Error generando signed URL:", error)
    return null
  }

  return data.signedUrl
}

async function uploadSingleFile(file) {
  const fileExt = file.name.split(".").pop()?.toLowerCase() || ""
  const isImage = file.type.startsWith("image/")
  const isVideo = file.type.startsWith("video/")

  if (!isImage && !isVideo) {
    throw new Error(`El archivo ${file.name} no es imagen ni video.`)
  }

  const fileType = isImage ? "image" : "video"
  const safeExt = fileExt.replace(/[^a-zA-Z0-9]/g, "")
  const fileName = `${crypto.randomUUID()}.${safeExt || "bin"}`
  const filePath = `${currentUser.id}/${albumId}/${fileName}`

  const { error: uploadError } = await window.supabaseClient.storage
    .from("album-media")
    .upload(filePath, file, {
      upsert: false
    })

  if (uploadError) {
    throw new Error(uploadError.message)
  }

  const { error: insertError } = await window.supabaseClient
    .from("media")
    .insert([
      {
        album_id: albumId,
        user_id: currentUser.id,
        file_path: filePath,
        file_url: "",
        file_type: fileType
      }
    ])

  if (insertError) {
    throw new Error(insertError.message)
  }
}