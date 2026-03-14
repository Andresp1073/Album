const DB_NAME = 'AlbumApp'
const DB_VERSION = 1

let db = null

window.AlbumDB = {
  initDB: function() {
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
  },

  saveMedia: function(items) {
    if (!db) return Promise.reject('DB not initialized')
    const tx = db.transaction('media', 'readwrite')
    const store = tx.objectStore('media')
    items.forEach(item => store.put(item))
    return new Promise(resolve => tx.oncomplete = resolve)
  },

  getMedia: function(albumId) {
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
  },

  getAlbums: function() {
    if (!db) return Promise.reject('DB not initialized')
    return new Promise((resolve, reject) => {
      const tx = db.transaction('albums', 'readonly')
      const request = tx.objectStore('albums').getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  },

  saveAlbums: function(items) {
    if (!db) return Promise.reject('DB not initialized')
    const tx = db.transaction('albums', 'readwrite')
    const store = tx.objectStore('albums')
    items.forEach(item => store.put(item))
    return new Promise(resolve => tx.oncomplete = resolve)
  },

  saveFile: function(path, blob) {
    if (!db) return Promise.reject('DB not initialized')
    const tx = db.transaction('files', 'readwrite')
    tx.objectStore('files').put({ path, blob, time: Date.now() })
    return new Promise(resolve => tx.oncomplete = resolve)
  },

  getFile: function(path) {
    if (!db) return Promise.reject('DB not initialized')
    return new Promise((resolve, reject) => {
      const tx = db.transaction('files', 'readonly')
      const request = tx.objectStore('files').get(path)
      request.onsuccess = () => resolve(request.result?.blob)
      request.onerror = () => reject(request.error)
    })
  },

  hasFile: function(path) {
    if (!db) return Promise.resolve(false)
    return new Promise(resolve => {
      const tx = db.transaction('files', 'readonly')
      const request = tx.objectStore('files').get(path)
      request.onsuccess = () => resolve(!!request.result)
      request.onerror = () => resolve(false)
    })
  }
}
