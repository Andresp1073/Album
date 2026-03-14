import { initDB, saveMedia, getMedia, deleteMedia, saveAlbums, getAlbums, deleteAlbum, saveFile, getFile, hasFile } from './db.js'

const SUPABASE_URL = "https://jodqkybcpxvqfxdqthfk.supabase.co"
const SUPABASE_KEY = "sb_publishable_EClHgpUxwV7Bshxeva7fww_HejLA6OF"

let supabase, userId

export async function init() {
  await initDB()
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  window.supabaseClient = supabase
}

export async function checkAuth() {
  const session = localStorage.getItem('supabase_session')
  if (!session) return false
  
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return false
  
  userId = data.user.id
  return true
}

export function getUserId() {
  return userId
}

async function signedUrl(path) {
  const { data } = await supabase.storage.from('album-media').createSignedUrl(path, 3600)
  return data?.signedUrl || null
}

export async function loadMedia(albumId = null) {
  try {
    let query = supabase.from('media')
      .select('id, album_id, file_path, file_type, created_at')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
    
    if (albumId) query = query.eq('album_id', albumId)
    
    const { data } = await query
    if (data) await saveMedia(data)
    return data || []
  } catch (e) {
    return await getMedia(albumId)
  }
}

export async function loadAlbums() {
  try {
    const { data } = await supabase.from('albums')
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
    
    if (data) await saveAlbums(data)
    return data || []
  } catch (e) {
    return await getAlbums()
  }
}

export async function getUrl(item) {
  const path = item.file_path
  
  if (await hasFile(path)) {
    const blob = await getFile(path)
    if (blob) return URL.createObjectURL(blob)
  }
  
  const url = await signedUrl(path)
  if (url) {
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      await saveFile(path, blob)
      return URL.createObjectURL(blob)
    } catch (e) {}
  }
  
  return url
}

export async function remove(id) {
  const { error } = await supabase.from('media')
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq('id', id).eq('user_id', userId)
  
  if (!error) await deleteMedia(id)
  return !error
}

export async function removeAlbum(id) {
  const { error } = await supabase.from('albums')
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq('id', id).eq('user_id', userId)
  
  if (!error) await deleteAlbum(id)
  return !error
}

export async function addAlbum(name) {
  const { data, error } = await supabase.from('albums')
    .insert([{ name, user_id: userId }])
    .select().single()
  
  if (!error && data) await saveAlbums([data])
  return { data, error }
}

export async function upload(file, albumId) {
  const name = `${Date.now()}_${file.name}`
  const type = file.type.startsWith('video') ? 'video' : 'image'
  
  const { error: upError } = await supabase.storage.from('album-media').upload(name, file)
  if (upError) throw upError
  
  const { data, error } = await supabase.from('media')
    .insert([{ file_path: name, file_type: type, album_id: albumId, user_id: userId }])
    .select().single()
  
  if (!error && data) {
    await saveFile(name, file)
    await saveMedia([data])
  }
  
  return { data, error }
}

export async function logout() {
  await supabase.auth.signOut()
  localStorage.removeItem('supabase_session')
}
