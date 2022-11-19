set -e
echo "MAINTENANCE TASK: creating backup of registry db and storing it in Minio harbor bucket"
pg_dump -O -Fc --no-owner | aws --endpoint-url $ENDPOINT s3 cp - s3://harbor/registry/backup_$(date +%F).dump