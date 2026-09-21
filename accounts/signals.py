from django.db.models.signals import pre_save
from django.dispatch import receiver
from projects.models import Project
from accounts.models import AuditLog
from accounts.middleware import get_current_user

@receiver(pre_save, sender=Project)
def track_project_funds(sender, instance, **kwargs):
    if instance.pk:
        try:
            old_instance = sender.objects.get(pk=instance.pk)
            fields_to_track = ['fund_allocated', 'fund_utilized_claimed']
            for field in fields_to_track:
                old_value = getattr(old_instance, field)
                new_value = getattr(instance, field)
                if old_value != new_value:
                    AuditLog.log_event(
                        user=get_current_user(),
                        action=f'{field}_changed',
                        description=f"Project fund updated: {field} changed from {old_value} to {new_value}.",
                        model_name='Project',
                        object_id=instance.pk,
                        project=instance,
                        field_name=field,
                        old_value=str(old_value),
                        new_value=str(new_value)
                    )
        except sender.DoesNotExist:
            pass

