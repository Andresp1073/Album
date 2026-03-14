let allMedia = []
let allAlbums = []
let currentIndex = 0
let deleteTarget = null
let deleteType = null

const photoGrid = document.getElementById('photoGrid')
const albumGrid = document.getElementById('albumGrid')
const viewer = document.getElementById('viewer')
const vImg = document.getElementById('vImg')
const albumModal = document.getElementById('albumModal')
const deleteModal = document.getElementById('deleteModal')

// Tab navigation
document.querySelectorAll('.tab').forEach(tab => {
  tab.onclick = () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'))
    tab.classList.add('active')
    document.getElementById(tab.dataset.page).classList.add('active')
  }
})

// Modal controls
document.getElementById('addBtn').onclick = () => albumModal.classList.add('show')
document.getElementById('cancelBtn').onclick = () => albumModal.classList.remove('show')
document.getElementById('noBtn').onclick = () => deleteModal.classList.remove('show')

// Create album
document.getElementById('saveBtn').onclick = async () => {
  const name = document.getElementById('albumName').value.trim()
  if (!name) return
  const { error } = await window.AlbumAPI.addAlbum(name)
  if (!error) {
    albumModal.classList.remove('show')
    document.getElementById('albumName').value = ''
    loadData()
  }
}

// Delete confirmation
document.getElementById('yesBtn').onclick = async () => {
  deleteModal.classList.remove('show')
  if (deleteType === 'media' && deleteTarget) {
    await window.AlbumAPI.remove(deleteTarget.id)
    loadData()
  } else if (deleteType === 'album' && deleteTarget) {
    await window.AlbumAPI.removeAlbum(deleteTarget.id)
    loadData()
  }
  deleteTarget = null
  deleteType = null
}

// Viewer controls
document.getElementById('vClose').onclick = closeViewer
document.getElementById('vMenu').onclick = (e) => {
  e.stopPropagation()
  const menu = document.getElementById('vDropdown')
  menu.style.display = menu.style.display === 'block' ? 'none' : 'block'
}
viewer.onclick = (e) => {
  if (e.target === viewer) closeViewer()
  document.getElementById('vDropdown').style.display = 'none'
}

document.getElementById('vShare').onclick = async () => {
  const item = allMedia[currentIndex]
  if (!item) return
  const url = await window.AlbumAPI.getUrl(item)
  if (url && navigator.share) {
    try { await navigator.share({ url, title: 'Foto' }) } catch (e) {}
  }
  closeViewer()
}

document.getElementById('vDelete').onclick = () => {
  deleteType = 'media'
  deleteTarget = allMedia[currentIndex]
  closeViewer()
  deleteModal.classList.add('show')
}

// Logout
document.getElementById('logoutBtn').onclick = async () => {
  if (confirm('¿Cerrar sesión?')) {
    await window.AlbumAPI.logout()
    location.href = 'index.html'
  }
}

function closeViewer() {
  viewer.classList.remove('show')
  document.getElementById('vMenu').style.display = 'none'
  document.getElementById('vDropdown').style.display = 'none'
}

async function loadData() {
  allMedia = await window.AlbumAPI.loadMedia()
  allAlbums = await window.AlbumAPI.loadAlbums()
  renderPhotos()
  renderAlbums()
}

function renderPhotos() {
  photoGrid.innerHTML = ''
  if (allMedia.length === 0) {
    photoGrid.innerHTML = '<div class="empty">No hay fotos todavía 💕<br>Sube fotos a un álbum</div>'
    return
  }
  allMedia.forEach((item, i) => {
    const div = document.createElement('div')
    div.className = 'item'
    const img = document.createElement('img')
    img.loading = 'lazy'
    window.AlbumAPI.getUrl(item).then(url => { if (url) img.src = url })
    div.onclick = () => openViewer(i)
    div.appendChild(img)
    photoGrid.appendChild(div)
  })
}

function renderAlbums() {
  albumGrid.innerHTML = ''
  if (allAlbums.length === 0) {
    albumGrid.innerHTML = '<div class="empty">Crea un álbum para comenzar</div>'
    return
  }
  allAlbums.forEach(album => {
    const div = document.createElement('div')
    div.className = 'card'
    div.innerHTML = `<div class="cover"></div><div class="title">${album.name}</div>`
    div.onclick = () => location.href = `album.html?id=${album.id}`
    albumGrid.appendChild(div)
  })
}

function openViewer(index) {
  currentIndex = index
  const item = allMedia[index]
  window.AlbumAPI.getUrl(item).then(url => { if (url) vImg.src = url })
  viewer.classList.add('show')
  document.getElementById('vMenu').style.display = 'block'
  document.getElementById('vDropdown').style.display = 'none'
}

async function start() {
  await window.AlbumAPI.initApp()
  const ok = await window.AlbumAPI.checkAuth()
  if (!ok) {
    location.href = 'index.html'
    return
  }
  await loadData()
}

start()
