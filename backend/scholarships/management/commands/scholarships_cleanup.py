from django.core.management.base import BaseCommand

from scholarships.ingest_utils import prune_overdue_saved_scholarships


class Command(BaseCommand):
    help = (
        "Prune overdue SavedScholarship rows (saved/in_progress only) after deadline + grace. "
        "Run weekly via cron, or rely on ingest_awardexplorer which runs this by default."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--prune-grace-days",
            type=int,
            default=21,
            help="Days after deadline before pruning (default: 21).",
        )

    def handle(self, *args, **options):
        n = prune_overdue_saved_scholarships(grace_days=options["prune_grace_days"])
        self.stdout.write(self.style.SUCCESS(f"Pruned {n} overdue saved scholarship link(s)."))
