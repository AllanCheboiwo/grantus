#!/bin/bash
set -e

echo "🚀 Starting Grantus Backend..."

# Wait for database to be ready
echo "⏳ Waiting for database..."

# Parse DATABASE_URL to get host (works with Railway's format)
if [ -n "$DATABASE_URL" ]; then
    # Extract host from DATABASE_URL (handles both postgres:// and postgresql://)
    DB_HOST=$(echo $DATABASE_URL | sed -e 's|.*@||' -e 's|:.*||' -e 's|/.*||')
    DB_PORT=$(echo $DATABASE_URL | sed -e 's|.*@[^:]*:||' -e 's|/.*||')
    
    echo "Connecting to database at $DB_HOST:$DB_PORT..."
    
    # Wait for database with timeout
    TIMEOUT=30
    COUNT=0
    until pg_isready -h "$DB_HOST" -p "$DB_PORT" > /dev/null 2>&1 || [ $COUNT -eq $TIMEOUT ]; do
        echo "Waiting for database... ($COUNT/$TIMEOUT)"
        sleep 1
        COUNT=$((COUNT + 1))
    done
    
    if [ $COUNT -eq $TIMEOUT ]; then
        echo "⚠️ Database wait timeout, proceeding anyway..."
    else
        echo "✅ Database is ready!"
    fi
else
    echo "⚠️ DATABASE_URL not set, skipping database wait..."
fi

# Run migrations
echo "📦 Running database migrations..."
alembic upgrade head || echo "⚠️ Migration failed or already up to date"

# Run seed data
echo "🌱 Seeding database..."
python -c "
from app.core.database import SessionLocal
from app.services.seed import run_seeds

db = SessionLocal()
try:
    run_seeds(db)
except Exception as e:
    print(f'Seeding note: {e}')
finally:
    db.close()
" || echo "⚠️ Seeding completed with notes"

echo "✅ Database setup complete!"

# Start the application
echo "🎯 Starting FastAPI server..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
