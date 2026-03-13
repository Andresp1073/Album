const grid = document.getElementById("albumGrid")
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

document.addEventListener("DOMContentLoaded", async () => {
  const { data, error } = await window.supabaseClient.auth.getUser()

  if (error || !data.user) {
    alert("Sesión no válida. Vuelve a iniciar sesión.")
    window.location.href = "index.html"
    return
  }

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
      <div class="empty-state" style="grid-column:1/-1;">
        <h3 style="margin-top:0;color:#d63384;">Aún no hay álbumes</h3>
        <p>Crea el primero para empezar a guardar sus recuerdos 💕</p>
      </div>
    `
    return
  }

  albums.forEach((album) => {
    const card = document.createElement("div")
    card.className = "album-card"

    const date = new Date(album.created_at).toLocaleDateString("es-CO", {
      year: "numeric",
      month: "short",
      day: "numeric"
    })

    const menuWrap = document.createElement("div")
    menuWrap.className = "menu-wrap"
    menuWrap.style.cssText = "position:absolute;top:4px;right:4px;z-index:999;"

    const menuBtn = document.createElement("button")
    menuBtn.className = "menu-btn"
    menuBtn.type = "button"
    menuBtn.textContent = "⋮"
    menuBtn.style.cssText = "background:none;border:none;font-size:20px;cursor:pointer;padding:4px 8px;color:#d63384;"

    const dropdown = document.createElement("div")
    dropdown.className = "menu-dropdown"

    const editBtn = document.createElement("button")
    editBtn.type = "button"
    editBtn.className = "edit-album-btn"
    editBtn.textContent = "Editar"

    const deleteBtn = document.createElement("button")
    deleteBtn.type = "button"
    deleteBtn.className = "delete-album-btn"
    deleteBtn.textContent = "Eliminar"

    dropdown.appendChild(editBtn)
    dropdown.appendChild(deleteBtn)
    menuWrap.appendChild(menuBtn)
    menuWrap.appendChild(dropdown)

    const content = document.createElement("div")
    content.className = "album-content"

    const coverEl = document.createElement("div")
    coverEl.className = "album-cover"

    if (album.cover_url) {
      coverEl.style.backgroundImage = `url("${album.cover_url}")`
      coverEl.setAttribute("aria-label", `Portada del álbum ${album.name}`)
    }

    const nameEl = document.createElement("div")
    nameEl.className = "album-name"
    nameEl.textContent = album.name

    const dateEl = document.createElement("div")
    dateEl.className = "album-date"
    dateEl.textContent = `Creado: ${date}`

    content.appendChild(nameEl)
    content.appendChild(dateEl)
    card.appendChild(content)
    card.appendChild(coverEl)
    card.appendChild(menuWrap)

    card.addEventListener("click", () => {
      window.location.href = `album.html?id=${album.id}`
    })

    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation()

      document.querySelectorAll(".menu-dropdown").forEach((item) => {
        if (item !== dropdown) item.classList.remove("open")
      })

      dropdown.classList.toggle("open")
    })

    editBtn.addEventListener("click", (e) => {
      e.stopPropagation()
      dropdown.classList.remove("open")
      openEditModal(album.id, album.name)
    })

    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation()
      dropdown.classList.remove("open")
      openDeleteModal(album.id, album.name)
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