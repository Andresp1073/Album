const DB_NAME = 'AlbumApp'
const DB_VERSION = 1

let db = null

function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }
    request.onupgradeneeded = (e) => {
      const database = e.target.result
      if (!database.objectStoreNames.contains('media')) {
        database.createObjectStore('media', { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains('albums')) {
        database.createObjectStore('albums', { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains('files')) {
        database.createObjectStore('files', { keyPath: 'path' })
      }
    }
  })
}

function saveMedia(items) {
  if (!db) return Promise.reject('DB not initialized')
  const tx = db.transaction('media', 'readwrite')
  const store = tx.objectStore('media')
  items.forEach(item => store.put(item))
  return new Promise(resolve => tx.oncomplete = resolve)
}

function getMedia(albumId = null) {
  if (!db) return Promise.reject('DB not initialized')
  return new Promise((resolve, reject) => {
    const tx = db.transaction('media', 'readonly')
    const request = tx.objectStore('media').getAll()
    request.onsuccess = () => {
      let results = request.result
      if (albumId) results = results.filter(m => m.album_id === albumId)
      resolve(results)
    }
    request.onerror = () => reject(request.error)
  })
}

function deleteMedia(id) {
  if (!db) return Promise.reject('DB not initialized')
  const tx = db.transaction('media', 'readwrite')
  tx.objectStore('media').delete(id)
  return new Promise(resolve => tx.oncomplete = resolve)
}

function saveAlbums(items) {
  if (!db) return Promise.reject('DB not initialized')
  const tx = db.transaction('albums', 'readwrite')
  const store = tx.objectStore('albums')
  items.forEach(item => store.put(item))
  return new Promise(resolve => tx.oncomplete = resolve)
}

function getAlbums() {
  if (!db) return Promise.reject('DB not initialized')
  return new Promise((resolve, reject) => {
    const tx = db.transaction('albums', 'readonly')
    const request = tx.objectStore('albums').getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function deleteAlbum(id) {
  if (!db) return Promise.reject('DB not initialized')
  const tx = db.transaction('albums', 'readwrite')
  tx.objectStore('albums').delete(id)
  return new Promise(resolve => tx.oncomplete = resolve)
}

function saveFile(path, blob) {
  if (!db) return Promise.reject('DB not initialized')
  const tx = db.transaction('files', 'readwrite')
  tx.objectStore('files').put({ path, blob, time: Date.now() })
  return new Promise(resolve => tx.oncomplete = resolve)
}

function getFile(path) {
  if (!db) return Promise.reject('DB not initialized')
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readonly')
    const request = tx.objectStore('files').get(path)
    request.onsuccess = () => resolve(request.result?.blob)
    request.onerror = () => reject(request.error)
  })
}

function hasFile(path) {
  if (!db) return Promise.resolve(false)
  return new Promise(resolve => {
    const tx = db.transaction('files', 'readonly')
    const request = tx.objectStore('files').get(path)
    request.onsuccess = () => resolve(!!request.result)
    request.onerror = () => resolve(false)
  })
}

window.AlbumDB = {
  initDB, saveMedia, getMedia, deleteMedia, saveAlbums, getAlbums, deleteAlbum, saveFile, getFile, hasFile
}
