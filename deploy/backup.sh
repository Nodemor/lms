#!/usr/bin/env bash
# Daily backup of the database and uploaded files. Keeps 14 days.
# Install: sudo cp deploy/backup.sh /opt/nodemore/backup.sh && sudo chmod 700 /opt/nodemore/backup.sh
#          sudo crontab -e   ->   30 2 * * * /opt/nodemore/backup.sh >> /var/log/nodemore-backup.log 2>&1
set -euo pipefail
DIR=/opt/nodemore/backups
STAMP=$(date +%Y-%m-%d_%H%M)
mkdir -p "$DIR"
source /opt/nodemore/.env
docker exec nodemore-postgres pg_dump -U "${DB_USER:-nodemore}" -d nodemore_lms --format=custom > "$DIR/db-$STAMP.dump"
docker run --rm -v nodemore_uploads:/data:ro -v "$DIR":/backup alpine tar czf "/backup/uploads-$STAMP.tar.gz" -C /data .
find "$DIR" -type f -mtime +14 -delete
echo "$(date) backup ok: db-$STAMP.dump uploads-$STAMP.tar.gz"
