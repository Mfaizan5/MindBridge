"""Empties the TEST database and rebuilds its schema from the migrations. Used before end-to-end tests.

It refuses to run unless the connection string names a database called mindbridge_test, so it can never reset
the development or production database.
"""

import os
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from dotenv import dotenv_values  # noqa: E402
from sqlalchemy import create_engine, text  # noqa: E402

url = os.environ.get("TEST_DATABASE_URL") or dotenv_values(BACKEND / ".env").get("TEST_DATABASE_URL")
if not url or "mindbridge_test" not in url:
    raise SystemExit("Refusing to reset: TEST_DATABASE_URL must point at mindbridge_test.")

# Alembic and the application read DATABASE_URL, so point both at the test database.
os.environ["DATABASE_URL"] = url

engine = create_engine(url.replace("postgresql+psycopg://", "postgresql+psycopg://"), future=True)
with engine.begin() as conn:
    conn.execute(text("DROP SCHEMA public CASCADE"))
    conn.execute(text("CREATE SCHEMA public"))
engine.dispose()

from alembic.config import Config  # noqa: E402

from alembic import command  # noqa: E402

config = Config(str(BACKEND / "alembic.ini"))
command.upgrade(config, "head")
print("Test database reset and migrated.")
