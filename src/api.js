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
  
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return false
  
  userId = data.user.id
  return true
}

function getUserId() {
  return userId
}

async function signedUrl(path) {
  const { data } = await supabase.storage.from('album-media').createSignedUrl(path, 3600)
  return data?.signedUrl || null
}

async function loadMedia(albumId = null) {
  try {
    let query = supabase.from('media')
      .select('id, album_id, file_path, file_type, created_at')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
    
    if (albumId) query = query.eq('album_id', albumId)
    
    const { data } = await query
    if (data) await window.AlbumDB.saveMedia(data)
    return data || []
  } catch (e) {
    console.error('Error loading media:', e)
    return await window.AlbumDB.getMedia(albumId)
  }
}

async function loadAlbums() {
  try {
    const { data } = await supabase.from('albums')
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
    
    if (data) await window.AlbumDB.saveAlbums(data)
    return data || []
  } catch (e) {
    console.error('Error loading albums:', e)
    return await window.AlbumDB.getAlbums()
  }
}

async function getUrl(item) {
  const path = item.file_path
  
  if (await window.AlbumDB.hasFile(path)) {
    const blob = await window.AlbumDB.getFile(path)
    if (blob) return URL.createObjectURL(blob)
  }
  
  const url = await signedUrl(path)
  if (url) {
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      await window.AlbumDB.saveFile(path, blob)
      return URL.createObjectURL(blob)
    } catch (e) {
      console.error('Error caching file:', e)
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
