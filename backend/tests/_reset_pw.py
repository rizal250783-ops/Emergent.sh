import sys, os
sys.path.insert(0, '/app/backend')
os.chdir('/app/backend')
import asyncio
from dotenv import load_dotenv
load_dotenv()
from database import db
from security import hash_password

async def main():
    h = hash_password('BprsHM2026')
    await db.users.update_many({}, {'$set': {
        'password_hash': h,
        'requires_password_reset': True,
        'failed_login_attempts': 0,
        'locked_until': None,
    }})

asyncio.run(main())
