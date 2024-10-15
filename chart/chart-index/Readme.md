The chart-index Helm chart allows to manage most of the APL helm chart dependencies (a.k.a. core apps). 
The chart-index is so-called library Helm chart and cannot be installed by itself. It only defines dependencies in the `chart/chart-index/Chart.yaml` file. Each dependency follows the following format:
```
  - name: <chart name>
    version: <chart version>
    repository: <chart url>
```
,thus Helm knows the chart registry URL, chart name and version.

In the future, the chart-index is going to be combined with Renovate to discover new versions.

Currently, adding a new version of the core app is performed manually:
1. In the `chart/chart-index/Chart.yaml` file, change a given version in the `dependencies` list.
2. Call `npm run charts-update`, so Helm charts archives are downloaded to the `charts/` directory
3. In charts directory unpack the archive to the corresponding direcotry
4. Commit your changes: git commit -m'feat: chart upgrade <app-name>'
5. Perform smoke tests `npm run validate-templates`
6. Carefully compare the rendered manifests (your feature branch vs main) by executing `bin/compare.sh`
   

Note 1: some Helm charts do not have an official Helm chart repository. Those helm charts cannot be upgraded via the `chart-index`.
Note 1: some charts resides in different directory name that the original app name, e.g.: argo-cd app resides in charts/argocd directory