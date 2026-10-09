import os
import requests
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv('GEMINI_API_KEY')
if not api_key:
    print('API key not found in .env')
    exit(1)

url = f'https://generativelanguage.googleapis.com/v1beta/models?key={api_key}'
response = requests.get(url)
if response.status_code == 200:
    print('API key is working. Models available:')
    models = response.json().get('models', [])
    for m in models:
        print(f"- {m['name']}")
else:
    print(f'API key failed. Status: {response.status_code}, Error: {response.text}')
