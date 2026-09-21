import os
import django
import json

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "dosje_backend.settings")
django.setup()

from django.test import Client
c = Client()
res = c.post('/api/auth/login-beneficiary/', {'pan_number': 'ABCDE1234F', 'phone_number': '9876543210'}, content_type='application/json')
print("Status Code:", res.status_code)
print("Response:", res.json() if res.content else "Empty")
