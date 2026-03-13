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

let selectedAlbumId = null
let selectedAlbumName = ""
let currentUserId = null
let allMedia = []

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"))
    document.querySelectorAll(".section").forEach(s => s.classList.remove("active"))
    tab.classList.add("active")
    document.getElementById("section-" + tab.dataset.tab).classList.add("active")
  })
})

document.addEventListener("DOMContentLoaded", async () => {
  const { data, error } = await window.supabaseClient.auth.getUser()

  if (error || !data.user) {
    alert("Sesión no válida. Vuelve a iniciar sesión.")
    window.location.href = "index.html"
    return
  }

  currentUserId = data.user.id
  await loadAllPhotos()
  await loadAlbums()
})

logoutBtn.addEventListener("click", async () => {
  await window.supabaseClient.auth.signOut()
  window.location.href = "index.html"
})

createBtn.addEventListener("click", () => {
  openCreateModal()
})

cancelCreateBtn.addEventListener("click", closeCreateModal)
cancelEditBtn.addEventListener("click", closeEditModal)
cancelDeleteBtn.addEventListener("click", closeDeleteModal)

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
    .insert([
      {
        name,
        user_id: userId
      }
    ])

  saveCreateBtn.disabled = false

  if (error) {
    createAlbumError.textContent = error.message
    console.error(error)
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
    console.error(error)
    return
  }

  closeEditModal()
  await loadAlbums()
})

confirmDeleteBtn.addEventListener("click", async () => {
  confirmDeleteBtn.disabled = true

  await window.supabaseClient
    .from("media")
    .delete()
    .eq("album_id", selectedAlbumId)

  const { error } = await window.supabaseClient
    .from("albums")
    .delete()
    .eq("id", selectedAlbumId)

  confirmDeleteBtn.disabled = false

  if (error) {
    alert("Error eliminando álbum: " + error.message)
    console.error(error)
    return
  }

  closeDeleteModal()
  await loadAlbums()
})

document.addEventListener("click", (e) => {
  const allDropdowns = document.querySelectorAll(".menu-dropdown")
  allDropdowns.forEach((dropdown) => {
    const wrap = dropdown.closest(".menu-wrap")
    if (wrap && !wrap.contains(e.target)) {
      dropdown.classList.remove("open")
    }
  })
})

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeCreateModal()
    closeEditModal()
    closeDeleteModal()
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
    allPhotosGrid.innerHTML = `<div class="empty">No hay fotos todavía 💕<br>Sube fotos a un álbum para verlas aquí</div>`
    return
  }

  allMedia.forEach(async (item) => {
    const card = document.createElement("div")
    card.className = "card photo-card"

    const img = document.createElement("img")
    img.className = "photo-img"
    img.loading = "lazy"

    const signedUrl = await getSignedFileUrl(item.file_path)
    if (signedUrl) {
      img.src = signedUrl
    } else {
      img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23f8f1f5' width='100' height='100'/%3E%3Ctext fill='%23b88aa8' x='50' y='50' text-anchor='middle' dy='.3em'%3E📷%3C/text%3E%3C/svg%3E"
    }

    card.appendChild(img)
    allPhotosGrid.appendChild(card)
  })
}

async function loadAlbums() {
  const { data: authData, error: authError } = await window.supabaseClient.auth.getUser()

  if (authError || !authData.user) {
    alert("No se pudo obtener el usuario autenticado.")
    return
  }

  const userId = authData.user.id

  const { data: albums, error: albumsError } = await window.supabaseClient
    .from("albums")
    .select("id, name, created_at, user_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })

  if (albumsError) {
    alert("Error cargando álbumes: " + albumsError.message)
    console.error(albumsError)
    return
  }

  const albumsList = albums || []

  if (!albumsList.length) {
    renderAlbums([])
    return
  }

  const albumIds = albumsList.map((album) => album.id)

  const { data: mediaItems, error: mediaError } = await window.supabaseClient
    .from("media")
    .select("album_id, file_path, created_at")
    .in("album_id", albumIds)
    .eq("user_id", userId)
    .eq("file_type", "image")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })

  if (mediaError) {
    alert("Error cargando portadas de álbumes: " + mediaError.message)
    console.error(mediaError)
    return
  }

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

  const albumsWithCover = albumsList.map((album) => ({
    ...album,
    cover_url: coverUrlByAlbum[album.id] || null
  }))

  renderAlbums(albumsWithCover)
}

function renderAlbums(albums) {
  grid.innerHTML = ""

  if (!albums.length) {
    grid.innerHTML = `
      <div class="empty" style="grid-column:1/-1;">
        <h3 style="margin-top:0;color:#d63384;">Aún no hay álbumes</h3>
        <p>Crea el primero para empezar 💕</p>
      </div>
    `
    return
  }

  albums.forEach((album) => {
    const card = document.createElement("div")
    card.className = "card"

    const date = new Date(album.created_at).toLocaleDateString("es-CO", {
      year: "numeric",
      month: "short",
      day: "numeric"
    })

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
      document.querySelectorAll(".menu-dropdown").forEach((item) => {
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
  setTimeout(() => createAlbumInput.focus(), 0)
}

function closeCreateModal() {
  createModal.style.display = "none"
  createAlbumInput.value = ""
  createAlbumError.textContent = ""
}

function openEditModal(id, name) {
  selectedAlbumId = id
  selectedAlbumName = name
  editAlbumInput.value = name
  editAlbumError.textContent = ""
  editModal.style.display = "flex"
  setTimeout(() => editAlbumInput.focus(), 0)
}

function closeEditModal() {
  editModal.style.display = "none"
  editAlbumInput.value = ""
  editAlbumError.textContent = ""
  selectedAlbumId = null
  selectedAlbumName = ""
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

async function getSignedFileUrl(filePath) {
  const { data, error } = await window.supabaseClient.storage
    .from("album-media")
    .createSignedUrl(filePath, 3600)

  if (error || !data?.signedUrl) {
    console.error("Error generando signed URL para portada:", error)
    return null
  }

  return data.signedUrl
}