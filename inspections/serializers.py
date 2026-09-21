from rest_framework import serializers
from .models import Inspection, InspectionAssignment

class InspectionAssignmentSerializer(serializers.ModelSerializer):
    inspector_name = serializers.CharField(source='inspector.username', read_only=True)
    
    class Meta:
        model = InspectionAssignment
        fields = '__all__'

class InspectionSerializer(serializers.ModelSerializer):
    assignments = InspectionAssignmentSerializer(source='inspectionassignment_set', many=True, read_only=True)

    class Meta:
        model = Inspection
        fields = '__all__'
        read_only_fields = ('created_by',)

from .models import DutySwapRequest

class DutySwapRequestSerializer(serializers.ModelSerializer):
    original_inspector_name = serializers.CharField(source='original_inspector.username', read_only=True)
    proposed_inspector_name = serializers.CharField(source='proposed_inspector.username', read_only=True)

    class Meta:
        model = DutySwapRequest
        fields = '__all__'
        read_only_fields = ['original_inspector', 'created_at']

from .models import InspectorLocationPing

class InspectorLocationPingSerializer(serializers.ModelSerializer):
    class Meta:
        model = InspectorLocationPing
        fields = '__all__'

from .models import DirectCall

class DirectCallSerializer(serializers.ModelSerializer):
    official_name = serializers.CharField(source='official.username', read_only=True)
    ngo_name = serializers.CharField(source='ngo.username', read_only=True)

    class Meta:
        model = DirectCall
        fields = '__all__'
        read_only_fields = ['official', 'room_name', 'status']

from .models import CallLog

class CallLogSerializer(serializers.ModelSerializer):
    caller_name = serializers.CharField(source='caller.username', read_only=True)
    callee_name = serializers.CharField(source='callee.username', read_only=True)
    
    class Meta:
        model = CallLog
        fields = '__all__'
