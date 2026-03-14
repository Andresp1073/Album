const SUPABASE_URL = "https://jodqkybcpxvqfxdqthfk.supabase.co"
const SUPABASE_KEY = "sb_publishable_EClHgpUxwV7Bshxeva7fww_HejLA6OF"

let supabase, userId

async function initApp() {
  await window.AlbumDB.initDB()
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  window.supabaseClient = supabase
}

async function checkAuth() {
  const session = localStorage.getItem('supabase_session')
  if (!session) return false
  
  if (!supabase) {
    console.error('Supabase not initialized')
    return false
  }
  
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) {
      console.error('Auth error:', error)
      return false
    }
    userId = data.user.id
    console.log('User logged in:', userId)
    return true
  } catch (e) {
    console.error('CheckAuth error:', e)
    return false
  }
}

function getUserId() {
  return userId
}

async function signedUrl(path) {
  try {
    const { data } = await supabase.storage.from('album-media').createSignedUrl(path, 3600)
    return data?.signedUrl || null
  } catch (e) {
    console.error('SignedURL error:', e)
    return null
  }
}

async function loadMedia(albumId = null) {
  if (!supabase || !userId) {
    console.error('Not initialized')
    return []
  }
  
  try {
    let query = supabase.from('media')
      .select('id, album_id, file_path, file_type, created_at')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
    
    if (albumId) query = query.eq('album_id', albumId)
    
    const { data, error } = await query
    if (error) {
      console.error('Media query error:', error)
      return []
    }
    
    console.log('Media loaded:', data?.length || 0)
    if (data) await window.AlbumDB.saveMedia(data)
    return data || []
  } catch (e) {
    console.error('Load media error:', e)
    return await window.AlbumDB.getMedia(albumId)
  }
}

async function loadAlbums() {
  if (!supabase || !userId) {
    console.error('Not initialized')
    return []
  }
  
  try {
    const { data, error } = await supabase.from('albums')
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Albums query error:', error)
      return []
    }
    
    console.log('Albums loaded:', data?.length || 0)
    if (data) await window.AlbumDB.saveAlbums(data)
    return data || []
  } catch (e) {
    console.error('Load albums error:', e)
    return await window.AlbumDB.getAlbums()
  }
}

async function getUrl(item) {
  if (!item || !item.file_path) {
    console.error('Invalid item')
    return null
  }
  
  const path = item.file_path
  
  try {
    if (await window.AlbumDB.hasFile(path)) {
      const blob = await window.AlbumDB.getFile(path)
      if (blob) return URL.createObjectURL(blob)
    }
  } catch (e) {
    console.error('DB error:', e)
  }
  
  const url = await signedUrl(path)
  if (url) {
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      await window.AlbumDB.saveFile(path, blob)
      return URL.createObjectURL(blob)
    } catch (e) {
      console.error('Fetch error:', e)
    }
  }
  
  return url
}

async function remove(id) {
  const { error } = await supabase.from('media')
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq('id', id).eq('user_id', userId)
  
  if (!error) await window.AlbumDB.deleteMedia(id)
  return !error
}

async function removeAlbum(id) {
  const { error } = await supabase.from('albums')
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq('id', id).eq('user_id', userId)
  
  if (!error) await window.AlbumDB.deleteAlbum(id)
  return !error
}

async function addAlbum(name) {
  const { data, error } = await supabase.from('albums')
    .insert([{ name, user_id: userId }])
    .select().single()
  
  if (!error && data) await window.AlbumDB.saveAlbums([data])
  return { data, error }
}

async function uploadFile(file, albumId) {
  const name = `${Date.now()}_${file.name}`
  const type = file.type.startsWith('video') ? 'video' : 'image'
  
  const { error: upError } = await supabase.storage.from('album-media').upload(name, file)
  if (upError) throw upError
  
  const { data, error } = await supabase.from('media')
    .insert([{ file_path: name, file_type: type, album_id: albumId, user_id: userId }])
    .select().single()
  
  if (!error && data) {
    await window.AlbumDB.saveFile(name, file)
    await window.AlbumDB.saveMedia([data])
  }
  
  return { data, error }
}

async function logout() {
  await supabase.auth.signOut()
  localStorage.removeItem('supabase_session')
}

window.AlbumAPI = {
  initApp, checkAuth, getUserId, loadMedia, loadAlbums, getUrl, remove, removeAlbum, addAlbum, uploadFile, logout
}
