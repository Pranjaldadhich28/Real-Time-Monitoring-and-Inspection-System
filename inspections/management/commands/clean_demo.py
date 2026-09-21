from django.core.management.base import BaseCommand
from inspections.models import (
    Inspection, DutySwapRequest, InspectorLocationPing, 
    DirectCall, CallLog, RandomVerificationEvent
)
from reports.models import InspectionReport, ReportBlock
from accounts.models import AuditLog, InspectorActivityLog

class Command(BaseCommand):
    help = 'Clears all transactional data (Inspections, Reports, Logs) for a clean demo, keeping Projects, NGOs, and Users intact.'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.WARNING("Starting database cleanup for Demo..."))
        
        # Inspections cascade deletes Assignments, Reports, Evidences, Anomalies, etc.
        count, _ = Inspection.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f"- Deleted {count} Inspections (and associated Reports/Assignments)."))
        
        count, _ = ReportBlock.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f"- Deleted {count} Blockchain ReportBlocks."))
        
        count, _ = RandomVerificationEvent.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f"- Deleted {count} Random Verification Events."))
        
        count, _ = DirectCall.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f"- Deleted {count} Direct Calls."))
        
        count, _ = CallLog.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f"- Deleted {count} Call Logs."))
        
        count, _ = InspectorLocationPing.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f"- Deleted {count} GPS Pings."))
        
        count, _ = DutySwapRequest.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f"- Deleted {count} Duty Swap Requests."))
        
        count, _ = InspectorActivityLog.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f"- Deleted {count} Inspector Activity Logs."))
        
        count, _ = AuditLog.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f"- Deleted {count} Audit Logs (System Logs)."))
        
        self.stdout.write(self.style.SUCCESS("\nDatabase is clean and ready for the demo! All core Project/NGO/User data is untouched."))
