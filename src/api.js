const SUPABASE_URL = "https://jodqkybcpxvqfxdqthfk.supabase.co"
const SUPABASE_KEY = "sb_publishable_EClHgpUxwV7Bshxeva7fww_HejLA6OF"

let userId

async function waitForSupabase() {
  let attempts = 0
  while (!window.supabase && attempts < 50) {
    await new Promise(r => setTimeout(r, 100))
    attempts++
  }
  if (!window.supabase) {
    throw new Error('Supabase library not loaded')
  }
}

async function initApp() {
  await window.AlbumDB.initDB()
  await waitForSupabase()
  window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  
  // Try to create albums table if it doesn't exist
  try {
    await window.supabaseClient.from('album').select('id').limit(1)
  } catch (e) {
    console.log('Album table might not exist, trying to create...')
    try {
      await window.supabaseClient.rpc('create_albums_table', {})
    } catch (e2) {
      console.log('Could not create albums table automatically')
    }
  }
}

async function checkAuth() {
  const session = localStorage.getItem('supabase_session')
  if (!session) return false
  
  if (!window.supabaseClient) {
    console.error('Supabase not initialized')
    return false
  }
  
  try {
    const { data, error } = await window.supabaseClient.auth.getUser()
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
    const { data } = await window.supabaseClient.storage.from('album-media').createSignedUrl(path, 3600)
    return data?.signedUrl || null
  } catch (e) {
    console.error('SignedURL error:', e)
    return null
  }
}

async function loadMedia(albumId = null) {
  if (!window.supabaseClient || !userId) {
    console.error('Not initialized')
    return []
  }
  
  try {
    let query = window.supabaseClient.from('media')
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
  if (!window.supabaseClient || !userId) {
    console.error('Not initialized')
    return []
  }
  
  const tableNames = ['album', 'albums']
  
  for (const tableName of tableNames) {
    try {
      const { data, error } = await window.supabaseClient.from(tableName)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (!error && data) {
        console.log('Albums loaded from:', tableName, data.length)
        // Filter is_deleted client-side if column exists
        const filtered = data.filter(a => a.is_deleted !== true)
        if (filtered.length > 0) await window.AlbumDB.saveAlbums(filtered)
        return filtered
      }
    } catch (e) {
      console.log('Try table:', tableName, e.message)
    }
  }
  
  // Try to get from local cache
  const localAlbums = await window.AlbumDB.getAlbums()
  if (localAlbums && localAlbums.length > 0) {
    console.log('Using local albums:', localAlbums.length)
    return localAlbums
  }
  
  // No albums found
  return []
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
  const { error } = await window.supabaseClient.from('media')
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq('id', id).eq('user_id', userId)
  
  if (!error) await window.AlbumDB.deleteMedia(id)
  return !error
}

async function removeAlbum(id) {
  const { error } = await window.supabaseClient.from('album')
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq('id', id).eq('user_id', userId)
  
  if (!error) await window.AlbumDB.deleteAlbum(id)
  return !error
}

async function addAlbum(name) {
  const { data, error } = await window.supabaseClient.from('album')
    .insert([{ name, user_id: userId }])
    .select().single()
  
  if (!error && data) await window.AlbumDB.saveAlbums([data])
  return { data, error }
}

async function uploadFile(file, albumId) {
  const name = `${Date.now()}_${file.name}`
  const type = file.type.startsWith('video') ? 'video' : 'image'
  
  const { error: upError } = await window.supabaseClient.storage.from('album-media').upload(name, file)
  if (upError) throw upError
  
  const { data, error } = await window.supabaseClient.from('media')
    .insert([{ file_path: name, file_type: type, album_id: albumId, user_id: userId }])
    .select().single()
  
  if (!error && data) {
    await window.AlbumDB.saveFile(name, file)
    await window.AlbumDB.saveMedia([data])
  }
  
  return { data, error }
}

async function logout() {
  await window.supabaseClient.auth.signOut()
  localStorage.removeItem('supabase_session')
}

window.AlbumAPI = {
  initApp, checkAuth, getUserId, loadMedia, loadAlbums, getUrl, remove, removeAlbum, addAlbum, uploadFile, logout
}
