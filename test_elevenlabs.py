
import os
import requests
from dotenv import load_dotenv

print("Starting ElevenLabs test...")

load_dotenv()

api_key = os.getenv("ELEVENLABS_API_KEY")
voice_id = os.getenv("ELEVENLABS_VOICE_ID")

print("API key loaded:", bool(api_key))
print("Voice ID loaded:", bool(voice_id))

if not api_key or not voice_id:
    raise ValueError("Missing API key or voice ID")

url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"

response = requests.post(
    url,
    headers={
        "xi-api-key": api_key,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg"
    },
    json={
        "text": "Hello, welcome to our hospital.",
        "model_id": "eleven_flash_v2_5"
    },
    timeout=60
)

print("HTTP Status:", response.status_code)

if response.status_code == 200:
    with open("test_voice.mp3", "wb") as file:
        file.write(response.content)

    print("SUCCESS! Audio generated.")
else:
    print("ERROR:", response.text)
