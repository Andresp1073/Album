const backBtn = document.getElementById("backBtn")
const galleryGrid = document.getElementById("galleryGrid")

const trashMenuBtn = document.getElementById("trashMenuBtn")
const trashDropdown = document.getElementById("trashDropdown")
const restoreAllBtn = document.getElementById("restoreAllBtn")
const emptyTrashBtn = document.getElementById("emptyTrashBtn")

const viewerModal = document.getElementById("viewerModal")
const viewerCloseBtn = document.getElementById("viewerCloseBtn")
const viewerMenuBtn = document.getElementById("viewerMenuBtn")
const viewerDropdown = document.getElementById("viewerDropdown")
const restoreOneBtn = document.getElementById("restoreOneBtn")
const deleteForeverBtn = document.getElementById("deleteForeverBtn")
const viewerMediaContainer = document.getElementById("viewerMediaContainer")

const confirmModal = document.getElementById("confirmModal")
const confirmTitle = document.getElementById("confirmTitle")
const confirmText = document.getElementById("confirmText")
const confirmYesBtn = document.getElementById("confirmYesBtn")
const confirmNoBtn = document.getElementById("confirmNoBtn")

let currentUser = null
let currentViewerItem = null
let confirmAction = null

document.addEventListener("DOMContentLoaded", async () => {
  const { data, error } = await window.supabaseClient.auth.getUser()

  if (error || !data.user) {
    alert("Sesión no válida. Vuelve a iniciar sesión.")
    window.location.href = "index.html"
    return
  }

  currentUser = data.user
  await loadTrash()
})

backBtn.addEventListener("click", () => {
  window.location.href = "dashboard.html"
})

trashMenuBtn.addEventListener("click", (e) => {
  e.stopPropagation()
  trashDropdown.classList.toggle("open")
})

viewerMenuBtn.addEventListener("click", (e) => {
  e.stopPropagation()
  viewerDropdown.classList.toggle("open")
})

restoreAllBtn.addEventListener("click", () => {
  trashDropdown.classList.remove("open")
  openConfirm(
    "¿Recuperar todo?",
    "Todos los archivos de la papelera volverán a su álbum.",
    restoreAllMedia
  )
})

emptyTrashBtn.addEventListener("click", () => {
  trashDropdown.classList.remove("open")
  openConfirm(
    "¿Vaciar la papelera?",
    "Todos los archivos se eliminarán definitivamente.",
    emptyTrash
  )
})

restoreOneBtn.addEventListener("click", () => {
  viewerDropdown.classList.remove("open")
  openConfirm(
    "¿Recuperar archivo?",
    "El archivo volverá a aparecer en su álbum.",
    restoreCurrentMedia
  )
})

deleteForeverBtn.addEventListener("click", () => {
  viewerDropdown.classList.remove("open")
  openConfirm(
    "¿Eliminar definitivamente?",
    "Esta acción no se puede deshacer.",
    deleteCurrentMediaForever
  )
})

viewerCloseBtn.addEventListener("click", closeViewer)

viewerModal.addEventListener("click", (e) => {
  if (e.target === viewerModal) {
    closeViewer()
  }
})

confirmNoBtn.addEventListener("click", () => {
  closeConfirm()
})

confirmYesBtn.addEventListener("click", async () => {
  if (!confirmAction) return
  confirmYesBtn.disabled = true
  await confirmAction()
  confirmYesBtn.disabled = false
  closeConfirm()
})

document.addEventListener("click", (e) => {
  const insideTrashMenu = trashMenuBtn.contains(e.target) || trashDropdown.contains(e.target)
  if (!insideTrashMenu) {
    trashDropdown.classList.remove("open")
  }

  const insideViewerMenu = viewerMenuBtn.contains(e.target) || viewerDropdown.contains(e.target)
  if (!insideViewerMenu) {
    viewerDropdown.classList.remove("open")
  }
})

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (confirmModal.style.display === "flex") {
      closeConfirm()
      return
    }

    if (viewerModal.style.display === "flex") {
      closeViewer()
    }
  }
})

async function loadTrash() {
  const { data, error } = await window.supabaseClient
    .from("media")
    .select("id, album_id, file_path, file_type, created_at, deleted_at, is_deleted")
    .eq("user_id", currentUser.id)
    .eq("is_deleted", true)
    .order("deleted_at", { ascending: false })

  if (error) {
    alert("Error cargando papelera: " + error.message)
    console.error(error)
    return
  }

  await renderMedia(data || [])
}

async function renderMedia(items) {
  galleryGrid.innerHTML = ""

  if (!items.length) {
    galleryGrid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <h3 style="margin-top:0;color:#d63384;">La papelera está vacía</h3>
        <p>No hay archivos eliminados por ahora 💕</p>
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
        <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;padding:12px;text-align:center;color:#b15b87;font-weight:bold;background:linear-gradient(135deg,#fff,#fff7fb);">
          No se pudo cargar este archivo
        </div>
      `
    } else if (item.file_type === "image") {
      const img = document.createElement("img")
      img.className = "media-preview"
      img.src = signedUrl
      img.alt = "Archivo en papelera"
      img.loading = "lazy"

      img.onerror = () => {
        inner.innerHTML = `
          <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;padding:12px;text-align:center;color:#b15b87;font-weight:bold;background:linear-gradient(135deg,#fff,#fff7fb);">
            No se pudo mostrar la foto
          </div>
        `
      }

      inner.appendChild(img)
    } else {
      const video = document.createElement("video")
      video.className = "media-preview"
      video.src = signedUrl
      video.muted = true
      video.playsInline = true
      video.preload = "metadata"

      video.onerror = () => {
        inner.innerHTML = `
          <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;padding:12px;text-align:center;color:#b15b87;font-weight:bold;background:linear-gradient(135deg,#fff,#fff7fb);">
            No se pudo mostrar el video
          </div>
        `
      }

      inner.appendChild(video)
    }

    card.appendChild(inner)
    card.appendChild(badge)

    card.addEventListener("click", () => {
      openViewer({
        id: item.id,
        file_path: item.file_path,
        file_type: item.file_type,
        signedUrl
      })
    })

    galleryGrid.appendChild(card)
  }
}

function openViewer(item) {
  currentViewerItem = item
  viewerDropdown.classList.remove("open")
  viewerMediaContainer.innerHTML = ""

  if (item.file_type === "image") {
    const img = document.createElement("img")
    img.className = "viewer-media"
    img.src = item.signedUrl
    img.alt = "Archivo ampliado"
    viewerMediaContainer.appendChild(img)
  } else {
    const video = document.createElement("video")
    video.className = "viewer-media"
    video.src = item.signedUrl
    video.controls = true
    video.playsInline = true
    viewerMediaContainer.appendChild(video)
  }

  viewerModal.style.display = "flex"
}

function closeViewer() {
  viewerDropdown.classList.remove("open")
  viewerModal.style.display = "none"
  viewerMediaContainer.innerHTML = ""
  currentViewerItem = null
}

function openConfirm(title, text, actionFn) {
  confirmTitle.textContent = title
  confirmText.textContent = text
  confirmAction = actionFn
  confirmModal.style.display = "flex"
}

function closeConfirm() {
  confirmModal.style.display = "none"
  confirmAction = null
}

async function restoreCurrentMedia() {
  if (!currentViewerItem) return

  const { error } = await window.supabaseClient
    .from("media")
    .update({
      is_deleted: false,
      deleted_at: null
    })
    .eq("id", currentViewerItem.id)
    .eq("user_id", currentUser.id)

  if (error) {
    alert("Error recuperando archivo: " + error.message)
    console.error(error)
    return
  }

  closeViewer()
  await loadTrash()
}

async function restoreAllMedia() {
  const { error } = await window.supabaseClient
    .from("media")
    .update({
      is_deleted: false,
      deleted_at: null
    })
    .eq("user_id", currentUser.id)
    .eq("is_deleted", true)

  if (error) {
    alert("Error recuperando archivos: " + error.message)
    console.error(error)
    return
  }

  closeViewer()
  await loadTrash()
}

async function deleteCurrentMediaForever() {
  if (!currentViewerItem) return

  const removeStorage = await window.supabaseClient.storage
    .from("album-media")
    .remove([currentViewerItem.file_path])

  if (removeStorage.error) {
    alert("Error eliminando archivo del storage: " + removeStorage.error.message)
    console.error(removeStorage.error)
    return
  }

  const { error } = await window.supabaseClient
    .from("media")
    .delete()
    .eq("id", currentViewerItem.id)
    .eq("user_id", currentUser.id)

  if (error) {
    alert("Error eliminando registro: " + error.message)
    console.error(error)
    return
  }

  closeViewer()
  await loadTrash()
}

async function emptyTrash() {
  const { data, error } = await window.supabaseClient
    .from("media")
    .select("id, file_path")
    .eq("user_id", currentUser.id)
    .eq("is_deleted", true)

  if (error) {
    alert("Error leyendo papelera: " + error.message)
    console.error(error)
    return
  }

  const items = data || []

  if (!items.length) {
    return
  }

  const filePaths = items.map(item => item.file_path)
  const ids = items.map(item => item.id)

  const removeStorage = await window.supabaseClient.storage
    .from("album-media")
    .remove(filePaths)

  if (removeStorage.error) {
    alert("Error vaciando storage: " + removeStorage.error.message)
    console.error(removeStorage.error)
    return
  }

  const { error: deleteError } = await window.supabaseClient
    .from("media")
    .delete()
    .in("id", ids)
    .eq("user_id", currentUser.id)

  if (deleteError) {
    alert("Error vaciando registros: " + deleteError.message)
    console.error(deleteError)
    return
  }

  closeViewer()
  await loadTrash()
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