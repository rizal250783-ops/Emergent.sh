from dotenv import load_dotenv
load_dotenv()

import logging

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import db
from seed import seed_users, seed_settings
from demo_seed import seed_demo
from storage import init_storage
from routers import auth, admin, incentive, collection, views, data_mgmt

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ao360")

app = FastAPI(title="AO-360 API")

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(admin.router)
api_router.include_router(incentive.router)
api_router.include_router(collection.router)
api_router.include_router(views.router)
api_router.include_router(data_mgmt.router)


@api_router.get("/")
async def root():
    return {"app": "AO-360", "org": "PT BPRS Haji Miskin", "status": "ok"}


@api_router.get("/meta/constants")
async def constants():
    from routers.collection import STATUS_OPTIONS
    from calc import INCENTIVE_RATES, STATUS_LABELS
    return {
        "roles": ["Direktur", "Admin", "AO Pembiayaan", "AO Funding", "Collection & Remedial"],
        "jenis_akad": ["Murabahah", "Musyarakah", "MMQ", "Rahn"],
        "jenis_simpanan": ["Tabungan", "Deposito"],
        "status_penagihan": STATUS_OPTIONS,
        "incentive_rates": INCENTIVE_RATES,
        "status_labels": STATUS_LABELS,
    }


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await seed_users()
    await seed_settings()
    await seed_demo()
    try:
        init_storage()
        logger.info("Object storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
    logger.info("AO-360 backend started")
