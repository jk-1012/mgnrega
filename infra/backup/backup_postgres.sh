#!/bin/bash
# Env: PGHOST, PGPORT, PGUSER, PGPASSWORD
OUT=/backups/mgnrega-$(date +%F).sql.gz
pg_dump -h ${PGHOST:-localhost} -U ${PGUSER:-postgres} -d ${PGDATABASE:-mgnrega} | gzip > $OUT
# Upload to S3 or object storage (configure awscli or rclone)
