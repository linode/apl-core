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
    <header>
      <h1>service index for {{ $v.domain }}</h1>
    </header>
    <main>
      <h3>Services</h3>
      {{ range $svc := $v.services }}
      <a target="_blank" href="https://{{ $svc }}.{{ $v.domain }}">{{ $svc }}</a><br/>
      {{- end }}
      <h3>Websites</h3>
      {{ range $site := $v.sites }}
      <a target="_blank" href="https://{{ $site }}">{{ $site }}</a><br/>
      {{- end }}
    </main>
  </body>
</html>
{{- end -}}