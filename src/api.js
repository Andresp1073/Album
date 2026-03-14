let userId = null

window.AlbumAPI = {
  initApp: async function() {
    await window.AlbumDB.initDB()
  },

  checkAuth: async function() {
    try {
      const { data: sessionData } = await window.sbClient.auth.getSession()
      if (!sessionData?.session) return false
      const { data, error } = await window.sbClient.auth.getUser()
      if (error || !data.user) return false
      userId = data.user.id
      return true
    } catch (e) {
      return false
    }
  },

  loadMedia: async function(albumId) {
    try {
      let query = window.sbClient.from('media')
        .select('id, album_id, file_path, file_type, created_at')
        .eq('user_id', userId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
      
      if (albumId) query = query.eq('album_id', albumId)
      
      const { data } = await query
      if (data) await window.AlbumDB.saveMedia(data)
      return data || []
    } catch (e) {
      return await window.AlbumDB.getMedia(albumId)
    }
  },

  loadAlbums: async function() {
    try {
      const { data } = await window.sbClient.from('albums')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (data) {
        const filtered = data.filter(a => !a.is_deleted)
        if (filtered.length > 0) await window.AlbumDB.saveAlbums(filtered)
        return filtered
      }
      return []
    } catch (e) {
      return await window.AlbumDB.getAlbums()
    }
  },

  getUrl: async function(item) {
    const path = item.file_path
    
    if (await window.AlbumDB.hasFile(path)) {
      const blob = await window.AlbumDB.getFile(path)
      if (blob) return URL.createObjectURL(blob)
    }
    
    try {
      const { data } = await window.sbClient.storage.from('album-media').createSignedUrl(path, 3600)
      if (data?.signedUrl) {
        const res = await fetch(data.signedUrl)
        const blob = await res.blob()
        await window.AlbumDB.saveFile(path, blob)
        return URL.createObjectURL(blob)
      }
    } catch (e) {}
    
    return null
  },

  addAlbum: async function(name) {
    const { data, error } = await window.sbClient.from('albums')
      .insert([{ name, user_id: userId }])
      .select()
      .single()
    
    if (!error && data) await window.AlbumDB.saveAlbums([data])
    return { data, error }
  },

  removeAlbum: async function(id) {
    await window.sbClient.from('albums').delete().eq('id', id).eq('user_id', userId)
    return true
  },

  remove: async function(id) {
    await window.sbClient.from('media').update({ is_deleted: true }).eq('id', id).eq('user_id', userId)
    return true
  },

  uploadFile: async function(file, albumId) {
    const name = `${Date.now()}_${file.name}`
    const type = file.type.startsWith('video') ? 'video' : 'image'
    
    await window.sbClient.storage.from('album-media').upload(name, file)
    
    const { data } = await window.sbClient.from('media')
      .insert([{ file_path: name, file_type: type, album_id: albumId, user_id: userId }])
      .select()
      .single()
    
    if (data) {
      await window.AlbumDB.saveFile(name, file)
      await window.AlbumDB.saveMedia([data])
    }
    
    return { data }
  },

  logout: async function() {
    await window.sbClient.auth.signOut()
    location.href = 'index.html'
  }
}
