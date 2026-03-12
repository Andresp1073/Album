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