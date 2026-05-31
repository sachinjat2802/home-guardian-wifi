import shutil
import os

src = "/home/sachin/.gemini/antigravity/brain/74c1e755-da22-4f95-ab50-63c88b537d0c/guardian_shield_logo_1780197289437.png"
dst = "/home/sachin/home-guardian-wifi/public/guardian_shield_logo.png"

if os.path.exists(src):
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copy(src, dst)
    print("✅ Image copied successfully to Next.js public directory!")
else:
    print("❌ Source image not found")
