from rest_framework import serializers
from .models import InspectionReport, Evidence, Anomaly, ReportBlock, NGOPeriodicReport

class EvidenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Evidence
        fields = '__all__'

class AnomalySerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source='report.inspection.project.title', read_only=True)
    ngo_name = serializers.CharField(source='report.inspection.project.ngo.name', read_only=True)

    class Meta:
        model = Anomaly
        fields = '__all__'

class ReportBlockSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportBlock
        fields = '__all__'


from .models import ReportAssetVerification, ReportViolation, ReportFeedback, ReportBeneficiaryLog, ReportChecklistAnswer

class ReportAssetVerificationSerializer(serializers.ModelSerializer):
    asset_name = serializers.CharField(source='asset.asset_name', read_only=True)
    approved_quantity = serializers.IntegerField(source='asset.approved_quantity', read_only=True)
    class Meta:
        model = ReportAssetVerification
        fields = '__all__'

class ReportViolationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportViolation
        fields = '__all__'

class ReportFeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportFeedback
        fields = '__all__'

class ReportBeneficiaryLogSerializer(serializers.ModelSerializer):
    beneficiary_name = serializers.CharField(source='beneficiary.name', read_only=True)
    class Meta:
        model = ReportBeneficiaryLog
        fields = '__all__'

class ReportChecklistAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportChecklistAnswer
        fields = '__all__'

class InspectionReportSerializer(serializers.ModelSerializer):
    evidence_set = EvidenceSerializer(many=True, read_only=True)
    anomaly_set = AnomalySerializer(many=True, read_only=True)
    reportblock = ReportBlockSerializer(read_only=True)
    
    asset_verifications = ReportAssetVerificationSerializer(many=True, read_only=True)
    violations = ReportViolationSerializer(many=True, read_only=True)
    feedback = ReportFeedbackSerializer(read_only=True)
    beneficiary_logs = ReportBeneficiaryLogSerializer(many=True, read_only=True)
    checklist_answers = ReportChecklistAnswerSerializer(many=True, read_only=True)

    class Meta:
        model = InspectionReport
        fields = '__all__'
        read_only_fields = ('submitted_by', 'status')

class NGOPeriodicReportSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source='project.title', read_only=True)

    class Meta:
        model = NGOPeriodicReport
        fields = '__all__'

from .models import NSSVisitReport

class NSSVisitReportSerializer(serializers.ModelSerializer):
    nss_volunteer_name = serializers.CharField(source='nss_volunteer.username', read_only=True)
    project_title = serializers.CharField(source='project.title', read_only=True)

    class Meta:
        model = NSSVisitReport
        fields = '__all__'
