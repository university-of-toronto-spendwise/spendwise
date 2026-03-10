from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("transactions", "0004_alter_transaction_category"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.AddField(
                    model_name="transaction",
                    name="pending_transaction_id",
                    field=models.CharField(blank=True, max_length=255, null=True),
                ),
                migrations.AddField(
                    model_name="transaction",
                    name="logo_url",
                    field=models.CharField(blank=True, max_length=200, null=True),
                ),
                migrations.AddField(
                    model_name="transaction",
                    name="website",
                    field=models.CharField(blank=True, max_length=200, null=True),
                ),
                migrations.AddField(
                    model_name="transaction",
                    name="iso_currency_code",
                    field=models.CharField(default="USD", max_length=10),
                ),
                migrations.AddField(
                    model_name="transaction",
                    name="authorized_date",
                    field=models.DateField(blank=True, null=True),
                ),
                migrations.AddField(
                    model_name="transaction",
                    name="category_id",
                    field=models.CharField(blank=True, max_length=255, null=True),
                ),
                migrations.AddField(
                    model_name="transaction",
                    name="personal_finance_category",
                    field=models.JSONField(blank=True, null=True),
                ),
                migrations.AddField(
                    model_name="transaction",
                    name="payment_channel",
                    field=models.CharField(default="", max_length=50),
                ),
                migrations.AddField(
                    model_name="transaction",
                    name="location",
                    field=models.JSONField(blank=True, default=dict),
                ),
                migrations.AddField(
                    model_name="transaction",
                    name="raw_data",
                    field=models.JSONField(blank=True, default=dict),
                ),
                migrations.AddField(
                    model_name="transaction",
                    name="synced_at",
                    field=models.DateTimeField(auto_now=True),
                ),
                migrations.AddField(
                    model_name="transaction",
                    name="user_category",
                    field=models.CharField(blank=True, max_length=100, null=True),
                ),
                migrations.AlterField(
                    model_name="transaction",
                    name="amount",
                    field=models.DecimalField(decimal_places=2, max_digits=12),
                ),
            ],
        ),
    ]
