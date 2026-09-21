from django.db import models
from inspections.models import Inspection
from django.conf import settings

class InspectionReport(models.Model):
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('finalized', 'Finalized'),
    )
    inspection = models.ForeignKey(Inspection, on_delete=models.CASCADE)
    submitted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    findings = models.TextField(blank=True, null=True)
    fund_utilized_verified = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    beneficiaries_claimed_count = models.IntegerField(default=0)
    beneficiaries_verified_count = models.IntegerField(default=0)
    ghost_beneficiaries_count = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    cctv_status = models.CharField(max_length=20, default='unknown')
    cctv_last_record_time = models.DateTimeField(null=True, blank=True)
    compliance_percentage = models.FloatField(null=True, blank=True)
    final_status = models.CharField(max_length=50, null=True, blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    client_submission_id = models.CharField(max_length=100, unique=True, null=True, blank=True)


    def __str__(self):
        return f"Report for {self.inspection.project.title}"

class Evidence(models.Model):
    report = models.ForeignKey(InspectionReport, on_delete=models.CASCADE)
    file = models.FileField(upload_to='evidence/')
    geo_lat = models.FloatField(null=True, blank=True)
    geo_lng = models.FloatField(null=True, blank=True)
    location_flagged = models.BooleanField(default=False)
    uploaded_at = models.DateTimeField(auto_now_add=True)

class Anomaly(models.Model):
    SEVERITY_CHOICES = (
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    )
    TYPE_CHOICES = (
        ('fund_mismatch', 'Fund Mismatch'),
        ('ghost_beneficiary', 'Ghost Beneficiary'),
        ('attendance', 'Attendance'),
        ('purpose_mismatch', 'Purpose Mismatch'),
        ('location_mismatch', 'Location Mismatch'),
        ('other', 'Other'),
    )
    report = models.ForeignKey(InspectionReport, on_delete=models.CASCADE)
    type = models.CharField(max_length=50, choices=TYPE_CHOICES)
    description = models.TextField()
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES)
    flagged_at = models.DateTimeField(auto_now_add=True)

class ReportBlock(models.Model):
    report = models.OneToOneField(InspectionReport, on_delete=models.CASCADE)
    index = models.IntegerField()
    report_hash = models.CharField(max_length=64)
    previous_hash = models.CharField(max_length=64)
    block_hash = models.CharField(max_length=64)
    timestamp = models.DateTimeField(auto_now_add=True)

class NGOPeriodicReport(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('under_review', 'Under Review'),
        ('approved', 'Verified/Approved'),
        ('rejected', 'Rejected'),
    )
    project = models.ForeignKey('projects.Project', on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    financial_utilization = models.DecimalField(max_digits=12, decimal_places=2)
    activity_details = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    submitted_at = models.DateTimeField(auto_now_add=True)
    client_submission_id = models.CharField(max_length=100, unique=True, null=True, blank=True)


    def __str__(self):
        return f"NGO Report: {self.title} for {self.project.title}"

class NSSVisitReport(models.Model):
    STATUS_CHOICES = (
        ('proper', 'Properly Implemented'),
        ('partial', 'Partially Implemented'),
        ('not_implemented', 'Not Implemented'),
    )
    nss_volunteer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='nss_visits')
    project = models.ForeignKey('projects.Project', on_delete=models.CASCADE, related_name='nss_visits')
    visit_date = models.DateTimeField(auto_now_add=True)
    findings = models.TextField()
    photo = models.ImageField(upload_to='nss_photos/', null=True, blank=True)
    scheme_implementation_status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"NSS Visit by {self.nss_volunteer.username} for {self.project.title}"


class ReportAssetVerification(models.Model):
    report = models.ForeignKey(InspectionReport, on_delete=models.CASCADE, related_name='asset_verifications')
    asset = models.ForeignKey('projects.ProjectAsset', on_delete=models.CASCADE)
    found_quantity = models.IntegerField(default=0)
    condition = models.CharField(max_length=255, blank=True, null=True)
    discrepancy_flag = models.BooleanField(default=False)

class ReportViolation(models.Model):
    SEVERITY_CHOICES = (
        ('critical', 'Critical'),
        ('major', 'Major'),
        ('minor', 'Minor'),
    )
    report = models.ForeignKey(InspectionReport, on_delete=models.CASCADE, related_name='violations')
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES)
    description = models.TextField()
    corrective_deadline = models.DateField(null=True, blank=True)

class ReportFeedback(models.Model):
    report = models.OneToOneField(InspectionReport, on_delete=models.CASCADE, related_name='feedback')
    food_rating = models.IntegerField(null=True, blank=True)
    medical_rating = models.IntegerField(null=True, blank=True)
    staff_rating = models.IntegerField(null=True, blank=True)
    cleanliness_rating = models.IntegerField(null=True, blank=True)
    safety_rating = models.IntegerField(null=True, blank=True)

class ReportBeneficiaryLog(models.Model):
    report = models.ForeignKey(InspectionReport, on_delete=models.CASCADE, related_name='beneficiary_logs')
    beneficiary = models.ForeignKey('projects.Beneficiary', on_delete=models.CASCADE)
    interaction_notes = models.TextField(blank=True, null=True)
    satisfaction_score = models.IntegerField(null=True, blank=True)

class ReportChecklistAnswer(models.Model):
    report = models.ForeignKey(InspectionReport, on_delete=models.CASCADE, related_name='checklist_answers')
    category = models.CharField(max_length=100)
    question = models.CharField(max_length=500)
    is_compliant = models.BooleanField(default=False)
    remarks = models.TextField(blank=True, null=True)

