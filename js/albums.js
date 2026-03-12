const grid = document.getElementById("albumGrid")
const createBtn = document.getElementById("createAlbum")
const logoutBtn = document.getElementById("logoutBtn")

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
    .order("created_at", { ascending: false })

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
      <button class="menu-btn" type="button">⋮</button>
      <div class="album-content">
        <div class="album-name">${escapeHtml(album.name)}</div>
        <div class="album-date">Creado: ${date}</div>
      </div>
    `

    const menuBtn = card.querySelector(".menu-btn")
    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation()
      openMenu(album.id, album.name)
    })

    grid.appendChild(card)
  })
}

createBtn.addEventListener("click", async () => {
  const name = prompt("Nombre del álbum")

  if (!name || !name.trim()) return

  const { data: authData, error: authError } = await window.supabaseClient.auth.getUser()

  if (authError || !authData.user) {
    alert("No hay sesión activa.")
    return
  }

  const userId = authData.user.id

  const { error } = await window.supabaseClient
    .from("albums")
    .insert([
      {
        name: name.trim(),
        user_id: userId
      }
    ])

  if (error) {
    alert("Error creando álbum: " + error.message)
    console.error(error)
    return
  }

  await loadAlbums()
})

async function openMenu(id, currentName) {
  const action = prompt("Escribe 1 para editar o 2 para eliminar")

  if (action === "1") {
    const newName = prompt("Nuevo nombre del álbum", currentName)

    if (!newName || !newName.trim()) return

    const { error } = await window.supabaseClient
      .from("albums")
      .update({ name: newName.trim() })
      .eq("id", id)

    if (error) {
      alert("Error editando álbum: " + error.message)
      console.error(error)
      return
    }

    await loadAlbums()
  }

  if (action === "2") {
    const ok = confirm("¿Deseas eliminar este álbum?")

    if (!ok) return

    const { error } = await window.supabaseClient
      .from("albums")
      .delete()
      .eq("id", id)

    if (error) {
      alert("Error eliminando álbum: " + error.message)
      console.error(error)
      return
    }

    await loadAlbums()
  }
}

function escapeHtml(text) {
  const div = document.createElement("div")
  div.textContent = text
  return div.innerHTML
}