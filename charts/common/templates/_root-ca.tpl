{{- define "extraRootCA.init" }}
{{- $image := "busybox:stable" }}
{{- if .rootCA }}
- name: extra-root-ca-init
  image: {{ $image }}
  {{- include "common.resources" . | nindent 2 }}
  command: ["sh"]
  args:
    - '-c'
    - |
      extraRootCA="/etc/ssl/certs/extra-root-ca.pem"
      rootCA="/etc/ssl/certs/ca-certificates.crt"
      rootCAnew="/etc/ssl/certs-new/ca-certificates.crt"
      ls -als $rootCA
      cat $rootCA > $rootCAnew
      cat $extraRootCA >> $rootCAnew
      ls -als $rootCAnew
  securityContext:
    runAsUser: 1000
    runAsGroup: 1000
  volumeMounts:
  - name: extra-root-ca-secret
    mountPath: "/etc/ssl/certs/extra-root-ca.pem"
    subPath: "extra-root-ca.pem"
  - name: extra-root-ca-new
    mountPath: "/etc/ssl/certs-new"
- name: extra-root-ca-finish
  image: {{ $image }}
  {{- include "common.resources" . | nindent 2 }}
  command: ["sh"]
  args:
    - '-c'
    - |
      rootCA="/etc/ssl/certs/ca-certificates.crt"
      rootCAnew="/etc/ssl/certs-new/ca-certificates.crt"
      cat $rootCAnew > $rootCA
      ls -als $rootCA
  securityContext:
    runAsUser: 1000
    runAsGroup: 1000
  volumeMounts:
  - name: extra-root-ca-new
    mountPath: "/etc/ssl/certs-new"
  - name: extra-root-ca
    mountPath: "/etc/ssl/certs/"
    subPath: "ca-certificates.crt"
{{- end }}
{{- end }}

{{- define "extraRootCA.volumeMounts" }}
{{- if .rootCA }}
- name: extra-root-ca-secret
  mountPath: "/etc/ssl/certs/"
  subPath: "ca-certificates.crt"
{{- end }}
{{- end }}

{{- define "extraRootCA.volumes" }}
{{- if .rootCA }}
- name: extra-root-ca-secret
  secret:
    secretName: extra-root-ca
- name: extra-root-ca
  emptyDir: {}
- name: extra-root-ca-new
  emptyDir: {}
{{- end }}
{{- end }}

{{- define "extraRootCA.secret" }}
{{- if .rootCA }}
apiVersion: v1
kind: Secret
metadata:
  name: extra-root-ca
data:
  extra-root-ca.pem: {{ .rootCA | b64enc }}
---
{{- end }}
{{- end }}