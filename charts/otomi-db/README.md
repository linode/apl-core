# Verify an otomi-db backup by restoring it

The chart can schedule CloudNativePG backups through the Barman Cloud plugin, but a
completed `Backup` object only records that the backup operation finished. A
restore into a separate cluster checks whether PostgreSQL can actually read the
archive. The following procedure runs that check against an existing APL
database without changing the source cluster.

This applies when `backup.enabled` and `backup.usePlugin` are both true. The
chart names its `Cluster`, `ObjectStore`, and `ScheduledBackup` from `name`;
the database releases use `gitea/gitea-db`, `keycloak/keycloak-db`, and
`harbor/harbor-otomi-db`. It does not apply to the chart's legacy in-tree
Barman backup path or volume snapshots.

1. Confirm that the source cluster is healthy and has a completed plugin backup:

   ```bash
   kubectl -n gitea get cluster gitea-db
   kubectl -n gitea get objectstore gitea-db
   kubectl -n gitea get backups
   ```

2. [Install `cnpg-drill`](https://github.com/danielgaskins/cnpg-drill/blob/main/docs/FIRST-RUN.md)
   and save this example as `gitea-drill.json`:

   ```json
   {
     "namespace": "gitea",
     "cluster": "gitea-db",
     "timeoutSeconds": 1800,
     "maxBackupAgeSeconds": 172800,
     "checks": [
       {"name": "postgres-ready", "query": "SELECT 1", "expected": "1"},
       {"name": "gitea-schema", "database": "gitea", "query": "SELECT count(*) > 0 FROM pg_catalog.pg_tables WHERE schemaname = 'public'", "expected": "t"}
     ]
   }
   ```

   Replace the schema check with a read-only assertion on data your application
   needs. A successful `SELECT 1` alone does not establish that application data
   survived. Set `maxBackupAgeSeconds` to your recovery policy and use the
   matching namespace, cluster name, and database for another release.

3. Inspect the disposable cluster manifest, then run the drill:

   ```bash
   cnpg-drill plan --config gitea-drill.json
   cnpg-drill run --config gitea-drill.json --report gitea-drill-result.json
   ```

   The command restores the latest completed Barman plugin backup, runs the SQL
   checks in read-only transactions, records a JSON result, and removes the
   disposable cluster and its PVCs. It exits nonzero if recovery, an assertion,
   or cleanup fails. The report hashes query output instead of recording the
   returned data. Check cloud volumes after the first run: PV deletion still
   depends on the storage class.

Use a second, separately named `ObjectStore` with archive-read-only credentials
and set `recoveryObjectStore` in the JSON before using this routinely. It must
point to the same destination and endpoint as the source ObjectStore. The tool
checks those settings but cannot prove the credentials are read-only; verify
that the recovery identity cannot write to the bucket. Size the available
storage for one extra single-instance PostgreSQL cluster and its WAL PVC.

`cnpg-drill` currently refuses a source Cluster bootstrapped from recovery or
using tablespaces. It also does not cover snapshots. For point-in-time recovery,
add `targetTime` to the JSON and choose a timestamp within the retained WAL
window; a passing latest-backup drill does not prove every PITR target.
