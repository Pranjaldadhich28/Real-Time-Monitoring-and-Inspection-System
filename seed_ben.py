import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "dosje_backend.settings")
django.setup()

from projects.models import Beneficiary

bens = list(Beneficiary.objects.all()[:3])

if not bens:
    print("No beneficiaries found.")
    exit()

seed_data = [
    {"pan": "ABCDE1234F", "phone": "9876543210"},
    {"pan": "FGHIJ5678K", "phone": "9876543211"},
    {"pan": "LMNOP9012Q", "phone": "9876543212"}
]

for i, b in enumerate(bens):
    b.pan_number = seed_data[i]["pan"]
    b.phone_number = seed_data[i]["phone"]
    b.save()
    print(f"Beneficiary: {b.name} -> PAN: {b.pan_number}, Phone: {b.phone_number}")
