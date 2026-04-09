from django.db import migrations, models


def add_userprofile_auth_fields(apps, schema_editor):
    vendor = schema_editor.connection.vendor

    if vendor == "postgresql":
        schema_editor.execute(
            "ALTER TABLE accounts_userprofile "
            "ADD COLUMN IF NOT EXISTS auth_provider varchar(32) NOT NULL DEFAULT 'email';"
        )
        schema_editor.execute(
            "ALTER TABLE accounts_userprofile "
            "ADD COLUMN IF NOT EXISTS is_uoft_verified boolean NOT NULL DEFAULT true;"
        )
        schema_editor.execute(
            "ALTER TABLE accounts_userprofile "
            "ADD COLUMN IF NOT EXISTS utorid varchar(64) NULL;"
        )
        schema_editor.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS accounts_userprofile_utorid_key "
            "ON accounts_userprofile (utorid) WHERE utorid IS NOT NULL;"
        )
        return

    # Fresh SQLite test databases do not support IF NOT EXISTS for these clauses,
    # so we can safely add the fields directly.
    schema_editor.execute(
        "ALTER TABLE accounts_userprofile ADD COLUMN auth_provider varchar(32) NOT NULL DEFAULT 'email';"
    )
    schema_editor.execute(
        "ALTER TABLE accounts_userprofile ADD COLUMN is_uoft_verified bool NOT NULL DEFAULT 1;"
    )
    schema_editor.execute(
        "ALTER TABLE accounts_userprofile ADD COLUMN utorid varchar(64) NULL;"
    )
    schema_editor.execute(
        "CREATE UNIQUE INDEX accounts_userprofile_utorid_key "
        "ON accounts_userprofile (utorid);"
    )


def remove_userprofile_auth_fields(apps, schema_editor):
    # We do not need reverse support for this project flow.
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0003_pendingregistration"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(add_userprofile_auth_fields, remove_userprofile_auth_fields),
            ],
            state_operations=[
                migrations.AddField(
                    model_name="userprofile",
                    name="auth_provider",
                    field=models.CharField(
                        choices=[("email", "Email"), ("uoft_sso", "UofT SSO")],
                        default="email",
                        max_length=32,
                    ),
                ),
                migrations.AddField(
                    model_name="userprofile",
                    name="is_uoft_verified",
                    field=models.BooleanField(default=True),
                ),
                migrations.AddField(
                    model_name="userprofile",
                    name="utorid",
                    field=models.CharField(blank=True, max_length=64, null=True, unique=True),
                ),
            ],
        ),
    ]
