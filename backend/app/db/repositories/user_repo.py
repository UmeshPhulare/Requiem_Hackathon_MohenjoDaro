# ============================================================
# RiskLens — User Repository (MongoDB Atlas)
# ============================================================

import logging
from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId
from app.db.connection import get_collection, Collections

logger = logging.getLogger(__name__)


def _format_user_doc(doc: dict) -> dict:
    if not doc:
        return doc
    doc_copy = dict(doc)
    doc_copy["id"] = str(doc_copy.pop("_id"))
    return doc_copy


async def create_user(
    name: str,
    email: str,
    password_hash: str,
    risk_preference: str = "moderate"
) -> dict:
    col = get_collection(Collections.USERS)
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "name": name.strip(),
        "email": email.strip().lower(),
        "password_hash": password_hash,
        "risk_preference": risk_preference,
        "created_at": now,
        "updated_at": now,
    }
    result = await col.insert_one(doc)
    doc["_id"] = result.inserted_id
    logger.info("Created user '%s' (%s) in MongoDB", name, result.inserted_id)
    return _format_user_doc(doc)


async def get_user_by_email(email: str) -> Optional[dict]:
    col = get_collection(Collections.USERS)
    doc = await col.find_one({"email": email.strip().lower()})
    return _format_user_doc(doc) if doc else None


async def get_user_by_id(user_id: str) -> Optional[dict]:
    col = get_collection(Collections.USERS)
    try:
        oid = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id
        doc = await col.find_one({"_id": oid})
        return _format_user_doc(doc) if doc else None
    except Exception as exc:
        logger.warning("Error fetching user by id %s: %s", user_id, exc)
        return None


async def update_user_preference(user_id: str, risk_preference: str) -> Optional[dict]:
    col = get_collection(Collections.USERS)
    oid = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id
    now = datetime.now(timezone.utc).isoformat()
    res = await col.find_one_and_update(
        {"_id": oid},
        {"$set": {"risk_preference": risk_preference, "updated_at": now}},
        return_document=True,
    )
    return _format_user_doc(res) if res else None
