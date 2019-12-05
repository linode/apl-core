{{- define "html" -}}
{{- $v := .Values -}}
<html>
  <head>
    <title>{{ $v.domain }}</title>
    <style>
      body {
        background-color: lightgrey;
        color: red;
        font-family: Arial, Helvetica, sans-serif;
        margin: 0;
      }
      header {
        text-align: center;
        background-color: red;
        color: white;
      }
      header a {
        color: white;
        text-decoration: none;
        text-transform: uppercase;
      }
      main a {
        color: red;
      }
      main {
        font-size: 2vw;
        padding: 8px;
      }
    </style>
  </head>
  <body>
    {{- if $v.isCustomer }}
    <header>
      <h1>service index for {{ $v.domain }}</h1>
    </header>
    <main>
    {{- else }}
    <header>
      <h1>
        {{- range $name, $dom := $v.clusters }}
        <a href="https://index.{{ $dom }}">{{ $name }}</a>{{ if not (eq $name "prd") }} | {{ end }}
        {{- end }}
      </h1>
    </header>
    <main>
      <h2>index for cluster: {{ $v.domain }}</h2>
    {{- end }}
      <h3>Services</h3>
      {{- range $svc := $v.services }}
      {{- if not (or (eq $svc.name "index") (hasKey $svc "private")) }}
      <a target="_blank" href="https://{{ $svc.name }}.{{ $v.domain }}">{{ $svc.name }}</a><br/>
      {{- end }}
      {{- end }}
      <h3>Websites</h3>
      {{ range $site := $v.sites }}
      <a target="_blank" href="https://{{ $site }}">{{ $site }}</a><br/>
      {{- end }}
    </main>
  </body>
</html>
{{- end -}}