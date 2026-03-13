window.supabaseClient.auth.onAuthStateChange((event, session) => {
  if (session) {
    localStorage.setItem("supabase_session", JSON.stringify(session))
  } else {
    localStorage.removeItem("supabase_session")
  }
})

const savedSession = localStorage.getItem("supabase_session")
if (savedSession) {
  const session = JSON.parse(savedSession)
  if (session && session.expires_at > Date.now() / 1000) {
    window.supabaseClient.auth.setSession(session.access_token)
  }
}

const form = document.getElementById("loginForm")

form.addEventListener("submit", async (e) => {
  e.preventDefault()

  const email = document.getElementById("email").value.trim()
  const password = document.getElementById("password").value

  const { data, error } = await window.supabaseClient.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    alert(error.message)
    return
  }

  window.location.href = "dashboard.html"
})
