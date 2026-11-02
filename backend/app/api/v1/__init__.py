from fastapi import APIRouter

from app.api.v1 import account, appointments, auth, platform, professionals, wellbeing

router = APIRouter()
router.include_router(auth.router)
router.include_router(account.router)
router.include_router(wellbeing.router)
router.include_router(professionals.router)
router.include_router(appointments.router)
router.include_router(platform.consent_router)
router.include_router(platform.notifications_router)
router.include_router(platform.admin_router)
router.include_router(platform.platform_router)
