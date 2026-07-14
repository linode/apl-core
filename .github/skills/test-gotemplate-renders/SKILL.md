---
name: test-gotemplate-renders
description: Enforces rendered Go template comparison before and after templating-related changes using bin/compare.sh.
---

# Compare Go Template Renders

## Quick start

1. Make your code changes.
2. export ENV_DIR=$PWD/tests/fixtures (if not already set)
3. Run:

```bash
bin/compare.sh
```

3. Review diffs in rendered output and confirm they match intent.

## Workflows

### Standard workflow for templating changes

- [ ] Run `bin/compare.sh` after making changes.
- [ ] Inspect before/after rendered template differences.
- [ ] Verify differences are expected and limited to intended behavior.
- [ ] If unexpected diffs appear, revise changes and rerun `bin/compare.sh`.
- [ ] Include a brief summary of observed render diffs in your report/PR notes.

### Scope guardrail

Use it only when changes affect `charts/**`, `values/**`, or `helmfile.d/**`
