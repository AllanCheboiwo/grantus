#!/bin/bash
set -e

echo "🚀 Starting Grantus Backend..."

# Wait for database to be ready
echo "⏳ Waiting for database..."
while ! pg_isready -h db -p 5432 -U ${POSTGRES_USER:-grantus} > /dev/null 2>&1; do
    sleep 1
done
echo "✅ Database is ready!"

# Run migrations
echo "📦 Running database migrations..."
alembic upgrade head

# Run seed data
echo "🌱 Seeding database..."
python -c "
from app.core.database import SessionLocal
from app.services.seed import run_seeds

db = SessionLocal()
try:
    run_seeds(db)
finally:
    db.close()
"

echo "✅ Database setup complete!"

# Start the application
echo "🎯 Starting FastAPI server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
