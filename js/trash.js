// trash.js — lógica de la página Papelera

let trashedMedia = []
let currentIndex = 0
let pendingAction = null // { type: 'restore'|'deleteForever'|'restoreAll'|'emptyAll' }

const galleryGrid    = document.getElementById('galleryGrid')
const viewerModal    = document.getElementById('viewerModal')
const mediaContainer = document.getElementById('viewerMediaContainer')
const viewerDropdown = document.getElementById('viewerDropdown')
const trashDropdown  = document.getElementById('trashDropdown')
const confirmModal   = document.getElementById('confirmModal')
const confirmTitle   = document.getElementById('confirmTitle')
const confirmText    = document.getElementById('confirmText')

// ── Auth ──────────────────────────────────────────────────────────────────────
async function getUser() {
  const { data, error } = await window.sbClient.auth.getUser()
  if (error || !data.user) { location.href = 'index.html'; return null }
  return data.user
}

// ── Load ─────────────────────────────────────────────────────────────────────
async function loadTrash(user) {
  const { data } = await window.sbClient
    .from('media')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_deleted', true)
    .order('created_at', { ascending: false })
  trashedMedia = data || []
  renderGallery(user)
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderGallery(user) {
  galleryGrid.innerHTML = ''
  if (trashedMedia.length === 0) {
    galleryGrid.innerHTML = '<div class="empty-state"><p>La papelera está vacía 🎉</p></div>'
    return
  }
  trashedMedia.forEach((item, i) => {
    const card = document.createElement('div')
    card.className = 'media-card'

    const inner = document.createElement('div')
    inner.className = 'media-inner'

    const badge = document.createElement('div')
    badge.className = 'media-badge'
    badge.textContent = item.file_type === 'video' ? '▶ Video' : '🖼 Foto'

    const preview = document.createElement('img')
    preview.className = 'media-preview'
    preview.loading = 'lazy'
    preview.alt = ''

    getUrl(item, user).then(url => { if (url) preview.src = url })

    inner.appendChild(badge)
    inner.appendChild(preview)
    card.appendChild(inner)
    card.onclick = () => openViewer(i, user)
    galleryGrid.appendChild(card)
  })
}

// ── URL generator ─────────────────────────────────────────────────────────────
async function getUrl(item, user) {
  try {
    const { data } = await window.sbClient.storage
      .from('album-media')
      .createSignedUrl(item.file_path, 3600)
    return data?.signedUrl || null
  } catch { return null }
}

// ── Viewer ────────────────────────────────────────────────────────────────────
function openViewer(i, user) {
  currentIndex = i
  viewerDropdown.style.display = 'none'
  mediaContainer.innerHTML = ''
  viewerModal.style.display = 'flex'

  const item = trashedMedia[i]
  getUrl(item, user).then(url => {
    if (!url) return
    let el
    if (item.file_type === 'video') {
      el = document.createElement('video')
      el.controls = true
      el.autoplay = true
    } else {
      el = document.createElement('img')
    }
    el.src = url
    el.className = 'viewer-media'
    mediaContainer.appendChild(el)
  })
}

document.getElementById('viewerCloseBtn').onclick = () => {
  viewerModal.style.display = 'none'
  mediaContainer.innerHTML = ''
  viewerDropdown.style.display = 'none'
}

document.getElementById('viewerMenuBtn').onclick = (e) => {
  e.stopPropagation()
  viewerDropdown.style.display = viewerDropdown.style.display === 'flex' ? 'none' : 'flex'
}

// ── Confirm modal ─────────────────────────────────────────────────────────────
function showConfirm(title, text, action) {
  confirmTitle.textContent = title
  confirmText.textContent  = text
  pendingAction = action
  confirmModal.style.display = 'flex'
}

document.getElementById('confirmNoBtn').onclick = () => {
  confirmModal.style.display = 'none'
  pendingAction = null
}

document.getElementById('confirmYesBtn').onclick = async () => {
  confirmModal.style.display = 'none'
  if (!pendingAction) return

  const { type, user } = pendingAction

  if (type === 'restore') {
    const item = trashedMedia[currentIndex]
    await window.sbClient.from('media').update({ is_deleted: false }).eq('id', item.id)
    viewerModal.style.display = 'none'
    await loadTrash(user)
  } else if (type === 'deleteForever') {
    const item = trashedMedia[currentIndex]
    await window.sbClient.storage.from('album-media').remove([item.file_path])
    await window.sbClient.from('media').delete().eq('id', item.id)
    viewerModal.style.display = 'none'
    await loadTrash(user)
  } else if (type === 'restoreAll') {
    const ids = trashedMedia.map(m => m.id)
    for (const id of ids) {
      await window.sbClient.from('media').update({ is_deleted: false }).eq('id', id)
    }
    await loadTrash(user)
  } else if (type === 'emptyAll') {
    const paths = trashedMedia.map(m => m.file_path)
    const ids   = trashedMedia.map(m => m.id)
    if (paths.length) await window.sbClient.storage.from('album-media').remove(paths)
    for (const id of ids) {
      await window.sbClient.from('media').delete().eq('id', id)
    }
    await loadTrash(user)
  }

  pendingAction = null
}

// ── Viewer menu actions ───────────────────────────────────────────────────────
document.getElementById('restoreOneBtn').onclick = () => {
  viewerDropdown.style.display = 'none'
  showConfirm('Recuperar', '¿Deseas recuperar esta foto/video?', { type: 'restore', user: window._trashUser })
}

document.getElementById('deleteForeverBtn').onclick = () => {
  viewerDropdown.style.display = 'none'
  showConfirm('Eliminar definitivamente', 'Esta acción no se puede deshacer. ¿Continuar?', { type: 'deleteForever', user: window._trashUser })
}

// ── Header menu actions ───────────────────────────────────────────────────────
document.getElementById('backBtn').onclick = () => location.href = 'dashboard.html'

document.getElementById('trashMenuBtn').onclick = (e) => {
  e.stopPropagation()
  trashDropdown.style.display = trashDropdown.style.display === 'flex' ? 'none' : 'flex'
}

document.getElementById('restoreAllBtn').onclick = () => {
  trashDropdown.style.display = 'none'
  showConfirm('Recuperar todo', '¿Deseas recuperar todos los elementos de la papelera?', { type: 'restoreAll', user: window._trashUser })
}

document.getElementById('emptyTrashBtn').onclick = () => {
  trashDropdown.style.display = 'none'
  showConfirm('Vaciar papelera', '¿Eliminar definitivamente todo? Esta acción no se puede deshacer.', { type: 'emptyAll', user: window._trashUser })
}

// Cerrar dropdowns al hacer clic fuera
document.addEventListener('click', () => {
  viewerDropdown.style.display = 'none'
  trashDropdown.style.display  = 'none'
})

// ── Init ──────────────────────────────────────────────────────────────────────
;(async () => {
  const user = await getUser()
  if (!user) return
  window._trashUser = user
  await loadTrash(user)
})()
