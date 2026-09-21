from django.contrib import admin
from .models import Inspection, InspectionAssignment

class InspectionAssignmentInline(admin.TabularInline):
    model = InspectionAssignment
    extra = 1

class InspectionAdmin(admin.ModelAdmin):
    list_display = ('project', 'scheduled_time', 'status', 'created_by')
    list_filter = ('status',)
    inlines = [InspectionAssignmentInline]

admin.site.register(Inspection, InspectionAdmin)
admin.site.register(InspectionAssignment)
