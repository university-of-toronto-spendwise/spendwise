from django.db import migrations, models


def _add_columns_if_missing(apps, schema_editor):
    """Safe when Postgres volume already has faculty/major/year from an earlier partial migrate."""
    connection = schema_editor.connection
    table = "accounts_userprofile"
    with connection.cursor() as cursor:
        if connection.vendor == "postgresql":
            cursor.execute(
                f'ALTER TABLE "{table}" ADD COLUMN IF NOT EXISTS faculty varchar(120) NOT NULL DEFAULT \'\''
            )
            cursor.execute(
                f'ALTER TABLE "{table}" ADD COLUMN IF NOT EXISTS major varchar(120) NOT NULL DEFAULT \'\''
            )
            cursor.execute(
                f'ALTER TABLE "{table}" ADD COLUMN IF NOT EXISTS year smallint NOT NULL DEFAULT 1'
            )
            return
        # SQLite (tests): older SQLite lacks ADD COLUMN IF NOT EXISTS
        cursor.execute(f"PRAGMA table_info({table})")
        existing = {row[1] for row in cursor.fetchall()}
        if "faculty" not in existing:
            cursor.execute(
                f"ALTER TABLE {table} ADD COLUMN faculty varchar(120) NOT NULL DEFAULT ''"
            )
        if "major" not in existing:
            cursor.execute(
                f"ALTER TABLE {table} ADD COLUMN major varchar(120) NOT NULL DEFAULT ''"
            )
        if "year" not in existing:
            cursor.execute(
                f"ALTER TABLE {table} ADD COLUMN year smallint NOT NULL DEFAULT 1"
            )


def _noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    """
    Adds faculty, major, year. Idempotent on PostgreSQL (IF NOT EXISTS) and SQLite
    (PRAGMA check) so existing Docker DB volumes do not hit DuplicateColumn.
    """

    dependencies = [
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name="userprofile",
                    name="faculty",
                    field=models.CharField(blank=True, max_length=120),
                ),
                migrations.AddField(
                    model_name="userprofile",
                    name="major",
                    field=models.CharField(blank=True, max_length=120),
                ),
                migrations.AddField(
                    model_name="userprofile",
                    name="year",
                    field=models.PositiveSmallIntegerField(default=1),
                ),
            ],
            database_operations=[
                migrations.RunPython(_add_columns_if_missing, _noop_reverse),
            ],
        ),
    ]
