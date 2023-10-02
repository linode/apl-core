---
name: Kubernetes version support
about: Kubernetes new version support
title: 'Support kubernetes v1.XX'
labels: 'k8s'
assignees: ''
---

# Requirments

The following files needs to be either updated or generated:

Get familiar with the `schemas/Readme.md` file
**src/**

- [ ] the `supportedK8sVersions.json` file is updated with new version and the oldest one is removed

**schemas/**

- [ ] The `schemas/api-versions/${VERSION}.txt` file added
- [ ] The `schemas/gen-k8s-schemas.sh` file updated and executed
- [ ] The `v${VERSION}-standalone.tar.gz` file generated and added to git repo

**tools/Dockerfile**

- [ ] Kubectl [version skew](https://kubernetes.io/releases/version-skew-policy/#kubectl) from is compatible with all three supported k8s versions
- [ ] Helm [version skew](https://helm.sh/docs/topics/version_skew/#supported-version-skew) from is compatible with all three supported k8s versions
- [ ] A new otomi/tools version is published
- [ ] The otomi/tools version is used by the otomi/core image

**.github/workflows**

- [ ] The .github/workflows/integration.yml file is updated to use the new k8s version (see workflow_call, workflow_dispatch)

**package.json**

- [ ] update the `validate-templates:all` script

# Validation

- [ ] The `npm run validate-templates` is passing
- [ ] The `npm run lint` is passing
- [ ] The deployment of the `full` test case scenerio with a new k8s version is successful

# Definition of done

- [ ] Relevant PRs are merged
- [ ] Tested by peer
