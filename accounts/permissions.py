from rest_framework import permissions
from inspections.models import Inspection, InspectionAssignment

class IsSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'super_admin')

class IsOfficialOfDivision(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'official')

    def has_object_permission(self, request, view, obj):
        if not self.has_permission(request, view):
            return False
            
        division = None
        if hasattr(obj, 'division'):
            division = obj.division
        elif hasattr(obj, 'project'):
            division = obj.project.division
        elif hasattr(obj, 'inspection') and hasattr(obj.inspection, 'project'):
            division = obj.inspection.project.division
        elif hasattr(obj, 'report') and hasattr(obj.report, 'inspection'):
            division = obj.report.inspection.project.division

        return division == request.user.division if division else False

class IsAssignedInspector(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'inspector')

    def has_object_permission(self, request, view, obj):
        if not self.has_permission(request, view):
            return False

        if isinstance(obj, InspectionAssignment):
            return obj.inspector == request.user
        elif isinstance(obj, Inspection):
            return obj.inspectionassignment_set.filter(inspector=request.user).exists()
        elif hasattr(obj, 'inspection'):
            return obj.inspection.inspectionassignment_set.filter(inspector=request.user).exists()
        elif hasattr(obj, 'report'):
            return obj.report.inspection.inspectionassignment_set.filter(inspector=request.user).exists()
        
        return False

class IsOwnerNGO(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'ngo')

    def has_object_permission(self, request, view, obj):
        if not self.has_permission(request, view):
            return False

        ngo = None
        if hasattr(obj, 'ngo'):
            ngo = obj.ngo
        elif hasattr(obj, 'project'):
            ngo = obj.project.ngo
            
        return ngo == request.user.ngo if ngo else False
