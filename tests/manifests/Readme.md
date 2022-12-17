# slice.sh

The slice.sh script generate all manifests using otomi template and then slice into many files

Run from root of the project

```
./tests/manifests/slice.sh ./out1
```

Example output

```
...
Creating out5/external-dns/templates/servicemonitor.yaml
Creating out5/jobs/templates/secret.yaml
Creating out5/jobs/templates/configmap.yaml
Creating out5/jobs/templates/job.yaml
Creating out5/wait-for/templates/serviceaccount.yaml
Creating out5/wait-for/templates/job.yaml
Creating out5/hello/templates/serviceaccount.yaml
Creating out5/hello/templates/service.yaml
Creating out5/hello/templates/deployment.yaml
Creating out5/httpbin/templates/service.yaml
Creating out5/httpbin/templates/deployment.yaml
Creating out5/kubeapps/templates/apprepository/serviceaccount.yaml
Creating out5/kubeapps/templates/kubeappsapis/serviceaccount.yaml
Creating out5/kubeapps/templates/kubeops/serviceaccount.yaml
Creating out5/kubeapps/charts/postgresql/templates/secrets.yaml
Creating out5/kubeapps/templates/dashboard/configmap.yaml
Creating out5/kubeapps/templates/frontend/configmap.yaml
Creating out5/kubeapps/templates/kubeappsapis/configmap.yaml
Creating out5/kubeapps/templates/shared/config.yaml
Creating out5/kubeapps/templates/apprepository/rbac.yaml
Creating out5/kubeapps/templates/kubeops/rbac.yaml
Creating out5/kubeapps/charts/postgresql/templates/metrics-svc.yaml
...
```

# Comparing outputs

It is possible to perform reqursive diff

```
diff -qr out1/ out2/
```

Example output

```
Files out5/grafana-dashboards/templates/dashboards-json-configmap.yaml and out4/grafana-dashboards/templates/dashboards-json-configmap.yaml differ
Files out5/harbor/templates/registry/registry-dpl.yaml and out4/harbor/templates/registry/registry-dpl.yaml differ
Files out5/harbor/templates/registry/registry-secret.yaml and out4/harbor/templates/registry/registry-secret.yaml differ
Files out5/jobs/templates/job.yaml and out4/jobs/templates/job.yaml differ
```
