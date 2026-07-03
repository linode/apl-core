# Drop SOPS in favour of SealedSecrets

SOPS was used to encrypt `secrets.*.yaml` files in the values repo, requiring a `.dec` plaintext companion on disk (excluded from git) and a decrypt-modify-re-encrypt cycle on every property change. We replaced this with SealedSecrets: secret values are sealed using `@linode/kubeseal-encrypt` (in the browser before an API request, or by the operator at bootstrap/upgrade time) and stored as individual SealedSecret manifests in the values repo. The API and operator never decrypt secrets at runtime — they either receive pre-sealed values or read from live Kubernetes Secrets already decrypted by the SealedSecrets controller.

## Why SOPS was dropped

Three compounding problems made SOPS untenable:

- **`.dec` files live outside git.** The decrypted companion files are not tracked, which spreads ephemeral state across developer machines and adds special-case handling throughout the API and core codebases.
- **Every property change requires a full decrypt/re-encrypt cycle.** Any HTTP POST/PUT/PATCH that touches a secret field had to decrypt the whole file first, adding latency to every write.
- **Re-encryption rewrites the entire file.** A single field change produces a full diff, causing merge conflicts and making git history useless for auditing individual secret changes.

## Sealing model

Secrets are sealed by whoever introduces them:

- **Console users**: the browser seals the value using `@linode/kubeseal-encrypt` before the API request is sent. The API receives and stores ciphertext only — it never sees the plaintext.
- **Operator**: seals platform-managed secrets using `@linode/kubeseal-encrypt` during bootstrap and upgrade.
- **CLI users**: can seal manually with `kubeseal` when editing values repo files directly.

## Migration

The upgrade script decrypts all SOPS-encrypted secrets, converts them to SealedSecret manifests, and removes all `secrets.*.yaml` files and `.sops.yaml` from the values repo. After upgrade, SOPS tooling is no longer required on any machine.
