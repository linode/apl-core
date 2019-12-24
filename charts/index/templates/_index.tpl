{{- define "html" -}}
{{- $v := .Values -}}
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
    <meta name="msapplication-TileColor" content="#ffc40d" />
    <meta name="theme-color" content="#ffffff" />
    <meta name="description" content="Index for cluster k8s-dev.aks.redkubes.net" />
    <meta name="application-name" content="Otomi" />
    <title>Otomi - All of your apps in the cloud.</title>
    <link type="text/css" rel="stylesheet" href="style.css" />
    <link rel="shortcut icon" href="favicon.ico" />
  </head>
  <body>
    <nav>
      <div class="env-links">
        <a href="/" class="active">dev</a> |
        <a href="/">prod</a>
      </div>
      <div class="user-menu"><span>Admin</span><img src="user.svg" alt="user icon" /></div>
    </nav>
    <main>
      <div class="title">
        <h1>
          Team Dashboard - {{ $v.group | title }}
        </h1>
        <p class="sub">
          Domain <b>{{ $v.domain }}</b>
        </p>
      </div>
      <h2>Apps <span>({{ $v.services | len }})</span></h2>
      <div class="grid">
        {{- range $s := $v.services }}
        {{- if and (ne $s.name "index") (not (hasKey $s "private")) }}
        <div class="col-3">
          <a href='https://{{ $s.host | default $s.name }}{{ $v.interpunct }}{{ $v.domain }}{{ $s.path | default "/" }}' target="_blank" class="tile">
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