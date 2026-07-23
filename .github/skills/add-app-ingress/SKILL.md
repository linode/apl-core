---
name: add-app-ingress
description: Configure public exposure for a selected app by updating core namespace/admin app configuration and optionally scaffolding HTTPRoute auth-redirects plus authentication/authorization resources.
argument-hint: <name> [--configure-public-security true|false]
---

# Configure Public App Exposure

## Quick start

1. Ask for required input: app name.
2. Ask if HTTPRoute auth-redirects + authentication/authorization scaffolding should be created.
3. Run:

```bash
npx tsx ci/src/configure-public-exposure.ts <name> [--configure-public-security true|false]
```

4. Validate:

Use `/test-gotemplate-renders` skill to validate Go template rendering.

## Workflow

Checklist:

- [ ] Confirm selected app name.
- [ ] Confirm whether to scaffold public-security resources.
- [ ] Ensure namespace is configured for public exposure in core.yaml.
- [ ] Ensure adminApps entry exists in core.yaml.
- [ ] If security scaffolding is enabled, add `<name>-artifacts` release in the app Helmfile.
- [ ] If security scaffolding is enabled, create values/<name>/<name>-raw.gotmpl with an HTTPRoute named `<name>-auth-redirects`.
- [ ] If security scaffolding is enabled, ensure values/<name>/<name>.gotmpl defines podLabels with `otomi.io/auth: platform` and `otomi.io/auth-policy: platform`.
- [ ] Run validation and template-diff checks.
- [ ] Summarize touched files and rendered diffs.

## Notes

- The script expects an existing Helmfile release named `<name>` when `--configure-public-security` is true.
- The script is idempotent for existing entries and files.
- Main implementation is in ci/src/configure-public-exposure.ts.
- .github/skills/add-app-ingress/scripts/add-app-ingress.sh is a compatibility wrapper.
