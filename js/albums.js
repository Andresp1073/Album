const grid = document.getElementById("albumGrid")
const allPhotosGrid = document.getElementById("allPhotosGrid")
const createBtn = document.getElementById("createAlbum")
const logoutBtn = document.getElementById("logoutBtn")

const createModal = document.getElementById("createModal")
const createAlbumInput = document.getElementById("createAlbumInput")
const createAlbumError = document.getElementById("createAlbumError")
const saveCreateBtn = document.getElementById("saveCreateBtn")
const cancelCreateBtn = document.getElementById("cancelCreateBtn")

const editModal = document.getElementById("editModal")
const editAlbumInput = document.getElementById("editAlbumInput")
const editAlbumError = document.getElementById("editAlbumError")
const saveEditBtn = document.getElementById("saveEditBtn")
const cancelEditBtn = document.getElementById("cancelEditBtn")

const deleteModal = document.getElementById("deleteModal")
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn")
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn")

const deleteMediaModal = document.getElementById("deleteMediaModal")
const confirmDeleteMediaBtn = document.getElementById("confirmDeleteMediaBtn")
const cancelDeleteMediaBtn = document.getElementById("cancelDeleteMediaBtn")

let selectedMediaIndex = null

const viewerModal = document.getElementById("viewerModal")
const viewerContent = document.getElementById("viewerContent")
const viewerImg = document.getElementById("viewerImg")
const viewerMenuBtn = document.getElementById("viewerMenuBtn")
const viewerMenu = document.getElementById("viewerMenu")
const shareBtn = document.getElementById("shareBtn")
const deleteViewerBtn = document.getElementById("deleteViewerBtn")

let selectedAlbumId = null
let selectedAlbumName = ""
let currentUserId = null
let allMedia = []
let currentPhotoIndex = 0
let currentVideo = null
const urlCache = new Map()

async function getSignedFileUrl(filePath) {
  if (urlCache.has(filePath)) {
    return urlCache.get(filePath)
  }
  
  const { data, error } = await window.supabaseClient.storage
    .from("album-media")
    .createSignedUrl(filePath, 3600)

  if (error || !data?.signedUrl) {
    console.error("Error generando signed URL:", error)
    return null
  }

  urlCache.set(filePath, data.signedUrl)
  return data.signedUrl
}

document.querySelectorAll(".section").forEach(s => s.classList.remove("active"))
document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"))

const savedTab = localStorage.getItem("active_tab") || "albumes"

document.querySelectorAll(".tab").forEach(tab => {
  if (tab.dataset.tab === savedTab) {
    tab.classList.add("active")
    document.getElementById("section-" + savedTab).classList.add("active")
  }
})

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"))
    document.querySelectorAll(".section").forEach(s => s.classList.remove("active"))
    tab.classList.add("active")
    document.getElementById("section-" + tab.dataset.tab).classList.add("active")
    localStorage.setItem("active_tab", tab.dataset.tab)
  })
})

document.addEventListener("DOMContentLoaded", async () => {
  const savedSession = localStorage.getItem("supabase_session")
  if (!savedSession) {
    window.location.href = "index.html"
    return
  }

  const { data, error } = await window.supabaseClient.auth.getUser()

  if (error || !data.user) {
    window.location.href = "index.html"
    return
  }

  currentUserId = data.user.id
  await loadAllPhotos()
  await loadAlbums()
})

logoutBtn.addEventListener("click", async () => {
  if (confirm("¿Cerrar sesión?")) {
    await window.supabaseClient.auth.signOut()
    localStorage.removeItem("supabase_session")
    window.location.href = "index.html"
  }
})

createBtn.addEventListener("click", () => {
  openCreateModal()
})

cancelCreateBtn.addEventListener("click", closeCreateModal)
cancelEditBtn.addEventListener("click", closeEditModal)
cancelDeleteBtn.addEventListener("click", closeDeleteModal)

cancelDeleteMediaBtn.addEventListener("click", closeDeleteMediaModal)

deleteMediaModal.addEventListener("click", (e) => {
  if (e.target === deleteMediaModal) {
    closeDeleteMediaModal()
  }
})

deleteMediaModal.addEventListener("click", (e) => {
  if (e.target === deleteMediaModal) {
    deleteMediaModal.style.display = "none"
    selectedMediaIndex = null
  }
})

createModal.addEventListener("click", (e) => {
  if (e.target === createModal) closeCreateModal()
})

editModal.addEventListener("click", (e) => {
  if (e.target === editModal) closeEditModal()
})

deleteModal.addEventListener("click", (e) => {
  if (e.target === deleteModal) closeDeleteModal()
})

saveCreateBtn.addEventListener("click", async () => {
  const name = createAlbumInput.value.trim()
  if (!name) {
    createAlbumError.textContent = "Escribe un nombre para el álbum."
    return
  }

  createAlbumError.textContent = ""
  saveCreateBtn.disabled = true

  const { data: authData, error: authError } = await window.supabaseClient.auth.getUser()

  if (authError || !authData.user) {
    saveCreateBtn.disabled = false
    alert("No hay sesión activa.")
    return
  }

  const userId = authData.user.id

  const { error } = await window.supabaseClient
    .from("albums")
    .insert([{ name, user_id: userId }])

  saveCreateBtn.disabled = false

  if (error) {
    createAlbumError.textContent = error.message
    return
  }

  closeCreateModal()
  await loadAlbums()
})

saveEditBtn.addEventListener("click", async () => {
  const newName = editAlbumInput.value.trim()
  if (!newName) {
    editAlbumError.textContent = "Escribe un nombre válido."
    return
  }

  editAlbumError.textContent = ""
  saveEditBtn.disabled = true

  const { error } = await window.supabaseClient
    .from("albums")
    .update({ name: newName })
    .eq("id", selectedAlbumId)

  saveEditBtn.disabled = false

  if (error) {
    editAlbumError.textContent = error.message
    return
  }

  closeEditModal()
  await loadAlbums()
})

confirmDeleteBtn.addEventListener("click", async () => {
  confirmDeleteBtn.disabled = true

  await window.supabaseClient.from("media").delete().eq("album_id", selectedAlbumId)

  const { error } = await window.supabaseClient.from("albums").delete().eq("id", selectedAlbumId)

  confirmDeleteBtn.disabled = false

  if (error) {
    alert("Error eliminando álbum: " + error.message)
    return
  }

  closeDeleteModal()
  await loadAlbums()
})

confirmDeleteMediaBtn.addEventListener("click", async () => {
  if (selectedMediaIndex === null) return

  const item = allMedia[selectedMediaIndex]
  if (!item) return

  confirmDeleteMediaBtn.disabled = true

  const { error } = await window.supabaseClient
    .from("media")
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq("id", item.id)
    .eq("user_id", currentUserId)

  confirmDeleteMediaBtn.disabled = false

  if (error) {
    alert("Error eliminando archivo: " + error.message)
    return
  }

  closeDeleteMediaModal()
  await loadAllPhotos()
})

function openDeleteMediaModal(index) {
  selectedMediaIndex = index
  deleteMediaModal.classList.add("show")
}

function closeDeleteMediaModal() {
  deleteMediaModal.classList.remove("show")
  selectedMediaIndex = null
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeCreateModal()
    closeEditModal()
    closeDeleteModal()
    closeDeleteMediaModal()
    closeViewer()
  }
})

async function loadAllPhotos() {
  const { data: media, error } = await window.supabaseClient
    .from("media")
    .select("id, album_id, file_path, file_type, created_at")
    .eq("user_id", currentUserId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error cargando fotos:", error)
    return
  }

  allMedia = media || []
  renderAllPhotos()
}

function renderAllPhotos() {
  allPhotosGrid.innerHTML = ""

  if (!allMedia.length) {
    allPhotosGrid.innerHTML = `<div class="empty">No hay archivos todavía 💕<br>Sube fotos o videos a un álbum para verlos aquí</div>`
    return
  }

  allMedia.forEach(async (item, index) => {
    const card = document.createElement("div")
    card.className = "photo-card"
    card.style.cursor = "pointer"

    const signedUrl = await getSignedFileUrl(item.file_path)

    if (item.file_type === "image") {
      const img = document.createElement("img")
      img.className = "photo-img"
      img.loading = "lazy"
      if (signedUrl) {
        img.src = signedUrl
      } else {
        img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23f8f1f5' width='100' height='100'/%3E%3Ctext fill='%23b88aa8' x='50' y='50' text-anchor='middle' dy='.3em'%3E📷%3C/text%3E%3C/svg%3E"
      }
      card.appendChild(img)
    } else if (item.file_type === "video" && signedUrl) {
      const wrapper = document.createElement("div")
      wrapper.style.cssText = "width:100%;height:100%;background:#f8f1f5;display:flex;align-items:center;justify-content:center"
      const playIcon = document.createElement("div")
      playIcon.innerHTML = "▶️"
      playIcon.style.cssText = "width:50px;height:50px;border-radius:50%;background:rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:24px"
      const video = document.createElement("video")
      video.className = "photo-img"
      video.src = signedUrl
      video.muted = true
      video.playsInline = true
      video.preload = "metadata"
      video.style.cssText = "position:absolute;width:100%;height:100%;object-fit:cover;opacity:0"
      wrapper.appendChild(video)
      wrapper.appendChild(playIcon)
      card.appendChild(wrapper)
    }

    card.onclick = () => openViewer(index)
    card.oncontextmenu = (e) => {
      e.preventDefault()
      openDeleteMediaModal(index)
    }
    
    let pressTimer
    card.ontouchstart = () => {
      pressTimer = setTimeout(() => {
        openDeleteMediaModal(index)
      }, 600)
    }
    card.ontouchend = () => clearTimeout(pressTimer)

    allPhotosGrid.appendChild(card)
  })
}

function openViewer(index) {
  currentPhotoIndex = index
  updateViewer()
  viewerModal.classList.add("show")
}

function updateViewer() {
  const item = allMedia[currentPhotoIndex]
  if (!item) return
  
  viewerContent.innerHTML = ""
  if (currentVideo) {
    currentVideo.pause()
    currentVideo = null
  }

  getSignedFileUrl(item.file_path).then(url => {
    if (!url) return

    if (item.file_type === "image") {
      viewerImg.src = url
      viewerImg.style.display = "block"
      viewerContent.innerHTML = ""
      viewerContent.appendChild(viewerImg)
    } else if (item.file_type === "video") {
      viewerImg.style.display = "none"
      const video = document.createElement("video")
      video.className = "viewer-video"
      video.src = url
      video.controls = true
      video.autoplay = true
      video.playsInline = true
      currentVideo = video
      viewerContent.innerHTML = ""
      viewerContent.appendChild(video)
    }
  })
}

function closeViewer() {
  viewerModal.classList.remove("show")
  if (currentVideo) {
    currentVideo.pause()
    currentVideo = null
  }
}

function showPrev() {
  if (currentPhotoIndex > 0) {
    currentPhotoIndex--
    updateViewer()
  }
}

function showNext() {
  if (currentPhotoIndex < allMedia.length - 1) {
    currentPhotoIndex++
    updateViewer()
  }
}

viewerMenuBtn.addEventListener("click", (e) => {
  e.stopPropagation()
  viewerMenu.classList.toggle("show")
})

viewerModal.addEventListener("click", (e) => {
  if (e.target === viewerModal) closeViewer()
  viewerMenu.classList.remove("show")
})

shareBtn.addEventListener("click", async () => {
  const item = allMedia[currentPhotoIndex]
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
  openDeleteMediaModal(currentPhotoIndex)
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
    if (diffX > 0) showPrev()
    else showNext()
  } else if (diffY > 50) {
    closeViewer()
  }
}, { passive: true })

document.addEventListener("keydown", (e) => {
  if (!viewerModal.classList.contains("show")) return
  if (e.key === "ArrowLeft") showPrev()
  if (e.key === "ArrowRight") showNext()
})

async function loadAlbums() {
  const { data: authData } = await window.supabaseClient.auth.getUser()
  if (!authData?.user) return

  const userId = authData.user.id

  const { data: albums, error: albumsError } = await window.supabaseClient
    .from("albums")
    .select("id, name, created_at, user_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })

  if (albumsError) return

  const albumsList = albums || []
  if (!albumsList.length) {
    renderAlbums([])
    return
  }

  const albumIds = albumsList.map(album => album.id)

  const { data: mediaItems } = await window.supabaseClient
    .from("media")
    .select("album_id, file_path, created_at")
    .in("album_id", albumIds)
    .eq("user_id", userId)
    .eq("file_type", "image")
    .eq("is_deleted", false)
    .order("created_at", { ascending: true })

  const firstImageByAlbum = {}
  for (const item of mediaItems || []) {
    if (!firstImageByAlbum[item.album_id]) {
      firstImageByAlbum[item.album_id] = item
    }
  }

  const coverUrlByAlbum = {}
  for (const album of albumsList) {
    const firstImage = firstImageByAlbum[album.id]
    if (!firstImage) {
      coverUrlByAlbum[album.id] = null
      continue
    }
    const signedUrl = await getSignedFileUrl(firstImage.file_path)
    coverUrlByAlbum[album.id] = signedUrl || null
  }

  const albumsWithCover = albumsList.map(album => ({
    ...album,
    cover_url: coverUrlByAlbum[album.id] || null
  }))

  renderAlbums(albumsWithCover)
}

function renderAlbums(albums) {
  grid.innerHTML = ""

  if (!albums.length) {
    grid.innerHTML = `<div class="empty"><h3 style="margin-top:0;color:#d63384;">Aún no hay álbumes</h3><p>Crea el primero para empezar 💕</p></div>`
    return
  }

  albums.forEach(album => {
    const card = document.createElement("div")
    card.className = "card"

    const date = new Date(album.created_at).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" })

    const menuWrap = document.createElement("div")
    menuWrap.className = "menu"

    const menuBtn = document.createElement("button")
    menuBtn.className = "menu-btn"
    menuBtn.type = "button"
    menuBtn.innerHTML = "⋮"

    const dropdown = document.createElement("div")
    dropdown.className = "menu-dropdown"

    const editBtn = document.createElement("button")
    editBtn.textContent = "Editar"
    editBtn.onclick = (e) => { e.stopPropagation(); dropdown.classList.remove("show"); openEditModal(album.id, album.name) }

    const deleteBtn = document.createElement("button")
    deleteBtn.textContent = "Eliminar"
    deleteBtn.onclick = (e) => { e.stopPropagation(); dropdown.classList.remove("show"); openDeleteModal(album.id, album.name) }

    dropdown.appendChild(editBtn)
    dropdown.appendChild(deleteBtn)
    menuWrap.appendChild(menuBtn)
    menuWrap.appendChild(dropdown)

    const coverEl = document.createElement("div")
    coverEl.className = "card-cover"
    if (album.cover_url) {
      coverEl.style.backgroundImage = `url("${album.cover_url}")`
    }

    const titleEl = document.createElement("div")
    titleEl.className = "card-title"
    titleEl.textContent = album.name

    const dateEl = document.createElement("div")
    dateEl.className = "card-date"
    dateEl.textContent = date

    card.appendChild(menuWrap)
    card.appendChild(coverEl)
    card.appendChild(titleEl)
    card.appendChild(dateEl)

    card.addEventListener("click", () => {
      window.location.href = `album.html?id=${album.id}`
    })

    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation()
      document.querySelectorAll(".menu-dropdown").forEach(item => {
        if (item !== dropdown) item.classList.remove("show")
      })
      dropdown.classList.toggle("show")
    })

    document.addEventListener("click", (e) => {
      if (!dropdown.contains(e.target)) {
        dropdown.classList.remove("show")
      }
    })

    grid.appendChild(card)
  })
}

function openCreateModal() {
  createAlbumInput.value = ""
  createAlbumError.textContent = ""
  createModal.style.display = "flex"
}

function closeCreateModal() {
  createModal.style.display = "none"
}

function openEditModal(id, name) {
  selectedAlbumId = id
  selectedAlbumName = name
  editAlbumInput.value = name
  editAlbumError.textContent = ""
  editModal.style.display = "flex"
}

function closeEditModal() {
  editModal.style.display = "none"
}

function openDeleteModal(id, name) {
  selectedAlbumId = id
  selectedAlbumName = name
  deleteModal.style.display = "flex"
}

function closeDeleteModal() {
  deleteModal.style.display = "none"
  selectedAlbumId = null
  selectedAlbumName = ""
}
