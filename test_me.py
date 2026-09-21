import os
import django
import json

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "dosje_backend.settings")
django.setup()

from django.test import Client
c = Client()
res = c.post('/api/auth/login-beneficiary/', {'pan_number': 'ABCDE1234F', 'phone_number': '9876543210'}, content_type='application/json')
token = res.json()['access']

res2 = c.get('/api/beneficiary/me/', HTTP_AUTHORIZATION=f'Bearer {token}')
print(res2.status_code)
print(res2.content.decode('utf-8'))
