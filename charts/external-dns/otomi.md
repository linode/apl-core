Chart customizations for Otomi:

added the option to add custom `env` to the `dep-ds.yaml` template line 305/307:
```
            {{- with .Values.env }}
            {{- toYaml . | nindent 12 }}
            {{- end }}
```
This is required to set env for using Civo DNS because it is not by default supported by external-dns.