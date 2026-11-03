from app.core.config import Settings

KEY = "x" * 44


def test_plain_postgresql_url_is_converted_to_psycopg():
    settings = Settings(database_url="postgresql://user:pw@host.example/db?sslmode=require", journal_key=KEY)
    assert settings.database_url == "postgresql+psycopg://user:pw@host.example/db?sslmode=require"


def test_postgres_scheme_is_converted_too():
    settings = Settings(database_url="postgres://user:pw@host.example/db", journal_key=KEY)
    assert settings.database_url.startswith("postgresql+psycopg://")


def test_psycopg_url_is_left_unchanged():
    url = "postgresql+psycopg://user:pw@127.0.0.1:5432/db"
    assert Settings(database_url=url, journal_key=KEY).database_url == url
