{{- define "html" -}}
{{- $v := .Values -}}
{{- $provider := index $v.clusters $v.provider }}
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
    <meta name="msapplication-TileColor" content="#ffc40d" />
    <meta name="theme-color" content="#ffffff" />
    <meta name="description" content="Dashboard for cluster {{ $v.prefix }}-{{ $v.stage }}.{{ $provider.host }}" />
    <meta name="application-name" content="Otomi" />
    <title>Otomi - All of your apps in the cloud.</title>
    <link type="text/css" rel="stylesheet" href="style.css" />
    <link rel="shortcut icon" href="favicon.ico" />
    <script type="text/javascript">
      function getCookie(cname) {
        var name = cname + '='
        var decodedCookie = decodeURIComponent(document.cookie)
        var ca = decodedCookie.split(';')
        for (var i = 0; i < ca.length; i++) {
          var c = ca[i]
          while (c.charAt(0) == ' ') {
            c = c.substring(1)
          }
          if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length)
          }
        }
        return ''
      }
      window.onload = function() {
        // var authCookie = getCookie('_oauth2_proxy');
        var xhr = new XMLHttpRequest()
        xhr.open('GET', '/oauth2/userinfo', true)
        xhr.responseType = 'json'
        xhr.onload = function(res) {
          if (xhr.readyState === xhr.DONE) {
            if (xhr.status === 200) {
              var user = xhr.response
              document.getElementsByClassName('admin')[0].innerHTML = user.email
            }
          }
        }
        xhr.send(null)
      }
    </script>
  </head>
  <body>
    <nav>
      {{- if $v.isNS }}
      <a href="/" class="logo-link">
        <img src="ns_logo_blue.svg" alt="NS logo" class="logo" />
      </a>
      {{- end }}
      <div class="env-links">
        Cloud:
        {{- range $p, $c := $v.clusters }}
        {{- if ne $p "azure" }} | {{ end }}
        {{- if eq $p $v.provider }}
        <a class="active">{{ $p | title }}</a>
        {{- else }}
        <a href="https://index{{ $v.interpunct }}{{ $v.prefix }}-{{ $v.stage }}.{{ $c.host }}">{{ $p | title }}</a>
        {{- end }}
        {{- end }}
        - Stage: 
        {{- range $i, $stage := $provider.stages }}
        {{- if $i }} | {{ end }}
        {{- if eq $stage $v.stage }}
        <a class="active">{{ $stage }}</a>
        {{- else }}
        <a href="https://index{{ $v.interpunct }}{{ $v.prefix }}-{{ $stage }}.{{ $provider.host }}">{{ $stage }}</a>
        {{- end }}
        {{- end }}
      </div>
      <div class="user-menu"><span class="admin">Admin</span><img src="user.svg" alt="user icon" /></div>
    </nav>
    <main>
      <div class="title">
        <h1>
          Team Dashboard - {{ $v.group | title }}
        </h1>
        <p class="sub">
          Domain <b>{{ $v.prefix }}-{{ $v.stage }}.{{ $provider.host }}</b>
        </p>
      </div>
      <h2>Apps <span>({{ $v.services | len }})</span></h2>
      <div class="grid">
        {{- range $s := $v.services }}
        {{- if ne $s.name "index" }}
        <div class="col-3">
          <a href='https://{{ $s.host | default $s.name }}{{ $v.interpunct }}{{ $v.prefix }}-{{ $v.stage }}.{{ $provider.host }}{{ $s.path | default "/" }}' target="_blank" class="tile">
            <div class="img-wrapper">
              <img src="{{ $s.logo | default $s.name }}_logo.svg" alt="{{ $s.name | title }} logo" style="width: 65px;" />
            </div>
            <h4>{{ $s.name | title }}</h4>
          </a>
        </div>
        {{- end }}
        {{- end }}
      </div>
    </main>
  </body>
</html>
</html>
{{- end -}}