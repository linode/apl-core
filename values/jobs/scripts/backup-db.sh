#!/bin/bash
set -e
set -o pipefail
set -u
fileName="backup_$(date +%Y%m%d%H%M%S%N).dump"
fileUrl="s3://${BUCKET}/${POSTFIX}/${fileName}"
echo "MAINTENANCE TASK: creating backup of $PGDATABASE db and storing to $fileUrl at Minio"
pg_dump -O -Fc --no-owner | aws --endpoint-url "$ENDPOINT" s3 cp - "$fileUrl"
echo "Success"
