The chart-index Helm chart allows to manage the most of the APL helm chart dependencies (a.k.a. core apps). 
In the future it is going to be combined with Renovate to discover new versions from chart registries. 

Currently, adding a new version of the core app is performed manually:
1. In the `chart/chart-index/Chart.yaml` file, change a given version in the `dependencies` list.
2. Call `npm run charts-update`, so Helm charts archives are downloaded to the `charts/` directory/
3. In charts directory unpack the archive to the corresponding direcotry
4. Commit you changes: git commit -m'feat: chart upgrade <app-name>'
5. Perform smoke tests `npm run validate-templates`
6. Carefully compare the rendered manifests (your feature branch vs main) by executing `bin/compare.sh`
   


Note: some Helm charts do not have an official Helm chart repository. Those helm charts cannot be upgraded via the `chart-index`.