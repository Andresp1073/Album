const params = new URLSearchParams(window.location.search)
const albumId = params.get('id')

let media = []
let currentIndex = 0

const photoGrid = document.getElementById('photoGrid')
const viewer = document.getElementById('viewer')
const vContent = document.getElementById('vContent')
const deleteModal = document.getElementById('deleteModal')

if (!albumId) location.href = 'dashboard.html'

document.getElementById('uploadBtn').onclick = () => document.getElementById('fileInput').click()
document.getElementById('fileInput').onchange = async (e) => {
  const files = Array.from(e.target.files)
  for (const file of files) {
    await window.AlbumAPI.uploadFile(file, albumId)
  }
  loadData()
  e.target.value = ''
}

document.getElementById('vClose').onclick = () => {
  viewer.classList.remove('show')
  document.getElementById('vMenu').style.display = 'none'
  document.getElementById('vDropdown').style.display = 'none'
}
document.getElementById('vPrev').onclick = () => { if (currentIndex > 0) showMedia(--currentIndex) }
document.getElementById('vNext').onclick = () => { if (currentIndex < media.length - 1) showMedia(++currentIndex) }

document.getElementById('vMenu').onclick = (e) => {
  e.stopPropagation()
  const menu = document.getElementById('vDropdown')
  menu.style.display = menu.style.display === 'block' ? 'none' : 'block'
}
viewer.onclick = (e) => {
  if (e.target === viewer) document.getElementById('vClose').onclick()
  document.getElementById('vDropdown').style.display = 'none'
}

document.getElementById('vShare').onclick = async () => {
  const item = media[currentIndex]
  if (!item) return
  const url = await window.AlbumAPI.getUrl(item)
  if (url && navigator.share) {
    try { await navigator.share({ url, title: 'Foto' }) } catch (e) {}
  }
  document.getElementById('vClose').onclick()
}

document.getElementById('vDelete').onclick = () => {
  document.getElementById('vClose').onclick()
  deleteModal.classList.add('show')
}

document.getElementById('yesBtn').onclick = async () => {
  deleteModal.classList.remove('show')
  const item = media[currentIndex]
  if (item) {
    await window.AlbumAPI.remove(item.id)
    media = media.filter(m => m.id !== item.id)
    renderPhotos()
    if (media.length > 0) {
      currentIndex = Math.min(currentIndex, media.length - 1)
      showMedia(currentIndex)
    } else {
      viewer.classList.remove('show')
    }
  }
}

document.getElementById('noBtn').onclick = () => deleteModal.classList.remove('show')

document.getElementById('deleteBtn').onclick = async () => {
  if (confirm('¿Eliminar este álbum?')) {
    await window.AlbumAPI.removeAlbum(albumId)
    location.href = 'dashboard.html'
  }
}

async function loadData() {
  media = await window.AlbumAPI.loadMedia(albumId)
  renderPhotos()
}

function renderPhotos() {
  photoGrid.innerHTML = ''
  if (media.length === 0) {
    photoGrid.innerHTML = '<div class="empty">Sube fotos o videos a este álbum</div>'
    return
  }
  media.forEach((item, i) => {
    const div = document.createElement('div')
    div.className = 'item'
    const img = document.createElement('img')
    img.loading = 'lazy'
    window.AlbumAPI.getUrl(item).then(url => { if (url) img.src = url })
    
    if (item.file_type === 'video') {
      const icon = document.createElement('div')
      icon.className = 'video-icon'
      icon.textContent = '▶️'
      div.appendChild(icon)
    }
    
    div.onclick = () => openViewer(i)
    div.appendChild(img)
    photoGrid.appendChild(div)
  })
}

function openViewer(i) {
  currentIndex = i
  showMedia(i)
  viewer.classList.add('show')
  document.getElementById('vMenu').style.display = 'block'
  document.getElementById('vDropdown').style.display = 'none'
}

function showMedia(i) {
  const item = media[i]
  vContent.innerHTML = ''
  if (!item) return
  
  window.AlbumAPI.getUrl(item).then(url => {
    if (!url) return
    if (item.file_type === 'video') {
      const video = document.createElement('video')
      video.src = url
      video.controls = true
      vContent.appendChild(video)
      video.play()
    } else {
      const img = document.createElement('img')
      img.src = url
      vContent.appendChild(img)
    }
  })
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
