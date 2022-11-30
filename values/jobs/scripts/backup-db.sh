set -e
set -o pipefail
echo "MAINTENANCE TASK: creating backup of $PGDATABASE db and storing it in Minio $BUCKET bucket"
pg_dump -O -Fc --no-owner | aws --endpoint-url $ENDPOINT s3 cp - s3://$BUCKET/$POSTFIX/backup_$(date +%Y%m%d%H%M%S%N).dump