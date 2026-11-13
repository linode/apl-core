# TDD

## Mandatory Template Diff Check

When code changes any file under `charts/`, `values/`, or `helmfile.d/`, run:

if no ENV_DIR is set then

```bash

export ENV_DIR=$PWD/tests/fixtures
bin/compare.sh
```

Review and summarize the rendered diffs before finalizing changes.
