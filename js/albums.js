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

  const { data, error } = await window.supabaseClient
    .from("albums")
    .select("id, name, created_at, user_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })

  if (error) {
    alert("Error cargando álbumes: " + error.message)
    console.error(error)
    return
  }

  renderAlbums(data || [])
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

    card.innerHTML = `
      <div class="album-cover"></div>

      <div class="menu-wrap">
        <button class="menu-btn" type="button">⋮</button>
        <div class="menu-dropdown">
          <button type="button" class="edit-album-btn">Editar</button>
          <button type="button" class="delete-album-btn">Eliminar</button>
        </div>
      </div>

      <div class="album-content">
        <div class="album-name">${escapeHtml(album.name)}</div>
        <div class="album-date">Creado: ${date}</div>
      </div>
    `

    card.addEventListener("click", () => {
      window.location.href = `album.html?id=${album.id}`
    })

    const menuBtn = card.querySelector(".menu-btn")
    const dropdown = card.querySelector(".menu-dropdown")
    const editBtn = card.querySelector(".edit-album-btn")
    const deleteBtn = card.querySelector(".delete-album-btn")

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

function escapeHtml(text) {
  const div = document.createElement("div")
  div.textContent = text
  return div.innerHTML
}