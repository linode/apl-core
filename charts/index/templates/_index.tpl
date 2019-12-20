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
      <h2>Apps <span>(4)</span></h2>
      <div class="grid">
        {{- if eq $v.group "Admins" }}
        <div class="col-6">
          <a href="https://scope{{ $v.interpunct }}{{ $v.domain }}" target="_blank" class="tile">
            <div class="img-wrapper">
              <img src="scope_logo.png" alt="Scope logo" style="width: 65px;" />
            </div>
            <h4>Weave Scope</h4>
          </a>
        </div>
        {{- end }}
        <div class="col-6">
          <a href="https://grafana{{ $v.interpunct }}{{ $v.domain }}" target="_blank" class="tile">
            <div class="img-wrapper">
              <img src="./grafana_logo.svg" alt="Grafana logo" style="width: 65px;" />
            </div>
            <h4>Grafana</h4>
          </a>
        </div>
        <div class="col-6">
          <a href="https://prometheus{{ $v.interpunct }}{{ $v.domain }}" target="_blank" class="tile">
            <div class="img-wrapper">
              <img src="./prometheus_logo.svg" alt="Prometheus logo" />
            </div>
            <h4>Prometheus</h4>
          </a>
        </div>
        <div class="col-6">
          <a href="https://alertmanager{{ $v.interpunct }}{{ $v.domain }}/" target="_blank" class="tile">
            <div class="img-wrapper">
              <img src="./prometheus_logo.svg" alt="Prometheus logo" />
            </div>
            <h4>Alertmanager</h4>
          </a>
        </div>
      </div>
    </main>
  </body>
</html>
</html>
{{- end -}}