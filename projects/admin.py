from django.contrib import admin
from .models import Project, Beneficiary, PurposeItem

class BeneficiaryInline(admin.TabularInline):
    model = Beneficiary
    extra = 1

class PurposeItemInline(admin.TabularInline):
    model = PurposeItem
    extra = 1

class ProjectAdmin(admin.ModelAdmin):
    list_display = ('title', 'ngo', 'division', 'status', 'fund_allocated', 'created_at')
    list_filter = ('status', 'division')
    inlines = [PurposeItemInline, BeneficiaryInline]

admin.site.register(Project, ProjectAdmin)
admin.site.register(Beneficiary)
admin.site.register(PurposeItem)
