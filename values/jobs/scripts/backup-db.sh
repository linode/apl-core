set -e
set -o pipefail
FILENAME="backup_$(date +%Y%m%d%H%M%S%N).dump"
echo "MAINTENANCE TASK: creating backup of $PGDATABASE db and storing it in Minio $BUCKET bucket as $FILENAME"
pg_dump -O -Fc --no-owner | aws --endpoint-url $ENDPOINT s3 cp - s3://$BUCKET/$POSTFIX/$FILENAME