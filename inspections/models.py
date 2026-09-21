from django.db import models
from projects.models import Project
from django.conf import settings

class Inspection(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
    )
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    scheduled_time = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='inspections_created')

    def __str__(self):
        return f"Inspection for {self.project.title} at {self.scheduled_time}"

class InspectionAssignment(models.Model):
    inspection = models.ForeignKey(Inspection, on_delete=models.CASCADE)
    inspector = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='assignments_as_inspector')
    official = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='assignments_as_official', null=True, blank=True)
    assigned_at = models.DateTimeField(auto_now_add=True)
    jitsi_room_name = models.CharField(max_length=100, null=True, blank=True)
    is_accepted = models.BooleanField(default=False)

    def __str__(self):
        return f"Assignment: Inspector {self.inspector.username}, Official {self.official.username}"

class DutySwapRequest(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    )
    inspection = models.ForeignKey(Inspection, on_delete=models.CASCADE)
    original_inspector = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='swap_requests_sent')
    proposed_inspector = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='swap_requests_received')
    reason = models.TextField()
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Swap: {self.original_inspector.username} -> {self.proposed_inspector.username} ({self.status})"

class InspectorLocationPing(models.Model):
    inspection = models.ForeignKey(Inspection, on_delete=models.CASCADE)
    inspector = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    lat = models.FloatField()
    lng = models.FloatField()
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Ping by {self.inspector.username} for {self.inspection.id} at {self.timestamp}"

class DirectCall(models.Model):
    official = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='outgoing_direct_calls')
    ngo = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='incoming_direct_calls')
    room_name = models.CharField(max_length=255, unique=True)
    status = models.CharField(max_length=20, default='ringing') # ringing, active, ended
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Direct call from {self.official.username} to {self.ngo.username} ({self.status})"

class CallLog(models.Model):
    STATUS_CHOICES = (
        ('ringing', 'Ringing'),
        ('answered', 'Answered'),
        ('missed', 'Missed'),
    )
    caller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='calls_made')
    callee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='calls_received')
    inspection = models.ForeignKey('Inspection', on_delete=models.SET_NULL, null=True, blank=True)
    attempt_number = models.IntegerField(default=1)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ringing')
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Call attempt {self.attempt_number} from {self.caller} to {self.callee} ({self.status})"


class RandomVerificationEvent(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('declined', 'Declined'),
        ('no_response', 'No Response'),
        ('missed', 'Missed'),
    )
    inspection = models.ForeignKey(Inspection, on_delete=models.CASCADE, related_name='verification_events')
    inspector = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='verifications_received')
    official = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='verifications_initiated')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    attempt_number = models.IntegerField(default=1)
    jitsi_room_name = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    selected_at = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    response_deadline = models.DateTimeField(null=True, blank=True)
    missed_reason = models.CharField(max_length=255, null=True, blank=True)
    vc_room_created_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Random VC for {self.inspection.id} ({self.status})"
