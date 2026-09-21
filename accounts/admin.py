from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Division, NGO

class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ('DoSJE Info', {'fields': ('role', 'division', 'ngo', 'phone')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('DoSJE Info', {'fields': ('role', 'division', 'ngo', 'phone')}),
    )
    list_display = ('username', 'email', 'first_name', 'last_name', 'role', 'division', 'is_staff')
    list_filter = ('role', 'division', 'is_staff', 'is_superuser', 'is_active')

admin.site.register(User, CustomUserAdmin)
admin.site.register(Division)
admin.site.register(NGO)
