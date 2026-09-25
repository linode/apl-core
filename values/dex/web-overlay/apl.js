// Externalized from password.html so the login page can run under a strict CSP
// (script-src 'self') without allowing 'unsafe-inline'.
;(function () {
  var form = document.querySelector('.apl-form')
  var submit = document.querySelector('#submit-login')
  var toggle = document.querySelector('.apl-password-toggle')
  var password = document.querySelector('#password')

  if (form && submit) {
    form.addEventListener('submit', function () {
      submit.setAttribute('disabled', 'disabled')
      submit.querySelector('span:first-child').textContent = 'Signing in…'
    })
  }

  if (toggle && password) {
    toggle.addEventListener('click', function () {
      var showing = password.type === 'text'
      password.type = showing ? 'password' : 'text'
      toggle.textContent = showing ? 'Show' : 'Hide'
      toggle.setAttribute('aria-label', showing ? 'Show password' : 'Hide password')
      toggle.setAttribute('aria-pressed', String(!showing))
    })
  }
})()
