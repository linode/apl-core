---
name: add-helm-chart
description: Add and wire a new Helm chart into APL Core by updating chart index, vendoring the chart, scaffolding Helmfile/defaults/values files, and running required validation checks. Use when adding a new app chart and the user provides or asks for name and repository; the script resolves the latest official stable semver chart version automatically.
argument-hint: <name> <repository>
---

# Add Helm Chart

## Quick start

1. Ask for required inputs: chart name and chart repository.
2. Ask if the app must be publicly exposed.
3. If public is needed, offer security scaffolding for HTTPRoute + Istio RequestAuthentication + AuthorizationPolicy.
4. Run:

```bash
npx tsx ci/src/add-helm-chart.ts <name> <repository>
```

3. Validate:

```bash
npm run validate-values
bin/compare.sh
```

## Workflow

Checklist:

- [ ] Collect required parameters: name and repository.
- [ ] Resolve latest official stable semver chart version automatically.
- [ ] Keep chart name, app key, release name, and namespace identical.
- [ ] Ask if the app is public and whether to scaffold HTTPRoute/authentication/authorization resources.
- [ ] Add dependency entry in chart/chart-index/Chart.yaml.
- [ ] Vendor chart into charts/<name>/.
- [ ] Create a new Helmfile file with the next highest numeric prefix in helmfile.d.
- [ ] Add Helmfile release stanza in that new file using \*default anchor.
- [ ] Always add namespace entry in core.yaml.
- [ ] If public, ensure sidecar injection is enabled for that namespace.
- [ ] Add empty defaults entry in helmfile.d/snippets/defaults.yaml in alphabetical order.
- [ ] Create values/<name>/<name>.gotmpl.
- [ ] Add tests fixture app file in tests/fixtures/env/apps/<name>.yaml.
- [ ] Add corresponding app entries in tests/integration/\*.yaml.
- [ ] Run schema and template-diff checks.
- [ ] Summarize generated diffs and touched files.

## Notes

- Default release anchor used by script is \*default.
- Script is idempotent for existing entries and directories.
- New Chart.yaml dependency entry is inserted in alphabetical order by dependency name.
- If chart source is OCI, repository should be oci://... (script pulls from <repository>/<name>).
- Chart version is auto-selected as latest stable semver; pre-release versions are ignored.
- Main implementation is in ci/src/add-helm-chart.ts.
- .github/skills/add-helm-chart/scripts/add-helm-chart.sh is a compatibility wrapper.
- Script confirms rendering path by running bin/compare.sh.
