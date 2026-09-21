import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "dosje_backend.settings")
django.setup()

from accounts.models import User, Division

# Fetch existing divisions
divisions = list(Division.objects.all())
if not divisions:
    print("No divisions found!")
    exit(1)

volunteers = [
    {"username": "amit_nss", "first_name": "Amit", "last_name": "Sharma", "email": "amit@nss.org", "division": divisions[0]},
    {"username": "priya_nss", "first_name": "Priya", "last_name": "Patel", "email": "priya@nss.org", "division": divisions[min(1, len(divisions)-1)]},
    {"username": "rahul_nss", "first_name": "Rahul", "last_name": "Verma", "email": "rahul@nss.org", "division": divisions[min(2, len(divisions)-1)]}
]

created_users = []
for v in volunteers:
    user, created = User.objects.get_or_create(username=v["username"], defaults={
        "first_name": v["first_name"],
        "last_name": v["last_name"],
        "email": v["email"],
        "role": "nss_volunteer",
        "division": v["division"]
    })
    user.set_password("pw")
    user.role = "nss_volunteer"
    user.division = v["division"]
    user.save()
    created_users.append(user)
    print(f"User: {user.username}, Pass: pw, Div: {user.division.name}")
