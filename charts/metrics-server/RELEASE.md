
### Changed

- Update the _Metrics Server_ OCI image to [`0.8.1`](https://github.com/kubernetes-sigs/metrics-server/releases/tag/v0.8.1). ([#1770](https://github.com/kubernetes-sigs/metrics-server/pull/1770)) _@stevehipwell_

### Fixed

- Conditionally render `insecureSkipTLSVerify` field in APIService template to prevent GitOps sync drift when value is `false`. ([#1727](https://github.com/kubernetes-sigs/metrics-server/pull/1727)) _@pawl_
- Do not render annotations as null in APIService template to prevent permanent OutOfSync in ArgoCD. ([#1752](https://github.com/kubernetes-sigs/metrics-server/pull/1752)) _@Serializator_
