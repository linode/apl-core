{{- define "html" -}}
{{- $v := .Values -}}
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
    <meta name="msapplication-TileColor" content="#ffc40d" />
    <meta name="theme-color" content="#ffffff" />
    <meta name="description" content="Dashboard for {{ $v.cluster.teamPrefix }}{{ $v.group }}.{{ $v.cluster.domain }}" />
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
              var group = xhr.getResponseHeader('Auth-Group')
              document.getElementsByClassName('admin')[0].innerHTML = `${user.email} (${group.charAt(0).toUpperCase() + group.substring(1)})`
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
        {{- range $provider, $p := $v.clouds }}
        {{- $clusters := index $v.clouds $provider }}
        {{- if ne $provider "aws" }} | {{ end }}
        {{- if eq $provider $v.cluster.provider }}
        <a class="active">{{ $provider | title }}</a>
        {{- else }}
        {{- if hasKey $clusters $v.cluster.name }}
        {{- $cluster := index $clusters $v.cluster.name }}
        <a href="https://index.{{ $v.cluster.teamPrefix }}{{ $v.group }}.{{ $cluster.domain }}">{{ $provider | title }}</a>
        {{- else }}
        <a href="https://index.{{ $v.cluster.teamPrefix }}{{ $v.group }}.{{ $v.cluster.name }}.{{ $p.domain }}">{{ $provider | title }}</a>
        {{- end }}
        {{- end }}
        {{- end }}
        - Cluster: 
        {{- $p := index $v.clouds $v.cluster.provider }}
        {{- $i := 0 }}
        {{- range $cluster, $c := $p.clusters }}
        {{- if $i }} | {{ end }}{{ $i = add $i 1 }}
        {{- if eq $cluster $v.cluster.name }}
        <a class="active">{{ $cluster }}</a>
        {{- else }}
        <a href="https://index.{{ $v.cluster.teamPrefix }}{{ $v.group }}.{{ $cluster }}.{{ $p.domain }}">{{ $cluster }}</a>
        {{- end }}
        {{- end }}
        - Teams: 
        {{- if eq $v.group "admin" }}
        <a class="active">Admin</a>
        {{- else }}
        <a href="https://index.{{ $v.cluster.teamPrefix }}admin.{{ $v.cluster.domain }}">Admin</a>
        {{- end }}
        {{- range $team := $v.teams }}
        {{- if eq $team $v.group }}
        | <a class="active">{{ $team | title }}</a>
        {{- else }}
        | <a href="https://index.{{ $v.cluster.teamPrefix }}{{ $team }}.{{ $v.cluster.domain }}">{{ $team | title }}</a>
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
          Domain <b>{{ $v.cluster.teamPrefix }}{{ $v.group }}.{{ $v.cluster.domain }}</b>
        </p>
      </div>
      {{- $allServices := (dict "Core" $v.coreServices "Team" $v.services) }}
      {{- range $type, $services := $allServices }}
      {{- if ne (len $services) 0 }}
      <h2>{{ $type }} Apps <span>({{ $services | len }})</span></h2>
      <div style="overflow: auto;">
        <div class="grid">
          {{- range $s := $services }}
          {{- $domain := (index $s "domain" | default (printf "%s.%s" (index $s "host" | default $s.name) $v.domain)) }}
          <div class="col-3">
            <a href='https://{{ $domain }}{{ $s.path | default "/" }}' target="_blank" class="tile">
              <div class="img-wrapper">
                {{- $img := (printf "%s_logo.svg" $s.name) }}{{ if $s.logo }}{{ $img = (hasKey $s.logo "name" | ternary (printf "%s_logo.svg" $s.logo.name) ($s.logo.url)) }}{{ end }}
                <img src="{{ $img }}" alt="{{ $s.name | title }} logo" style="width: 65px;" />
              </div>
              <h4>{{ $s.name | title }}</h4>
            </a>
          </div>
          {{- end }}
        </div>
      </div>
      {{- end }}
      {{- end }}
    </main>
  </body>
</html>
</html>
{{- end -}}