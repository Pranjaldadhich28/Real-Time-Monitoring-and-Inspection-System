from django.contrib import admin
from .models import InspectionReport, Evidence, Anomaly, ReportBlock

class EvidenceInline(admin.TabularInline):
    model = Evidence
    extra = 1

class AnomalyInline(admin.TabularInline):
    model = Anomaly
    extra = 1

class InspectionReportAdmin(admin.ModelAdmin):
    list_display = ('inspection', 'submitted_by', 'status', 'submitted_at')
    list_filter = ('status',)
    inlines = [EvidenceInline, AnomalyInline]

admin.site.register(InspectionReport, InspectionReportAdmin)
admin.site.register(Evidence)
admin.site.register(Anomaly)
admin.site.register(ReportBlock)
