"""
Minimal SQLite-backed auth: bcrypt-hashed passwords + JWT sessions.

The database file lives at `backend/users.db` and is created on startup.
"""

from __future__ import annotations

import os
import sqlite3
import time
from typing import Optional

import bcrypt
import jwt  # from PyJWT

DB_PATH = os.path.join(os.path.dirname(__file__), "users.db")
JWT_SECRET = os.getenv("JWT_SECRET", "dev-debate-chamber-change-me")
JWT_ALGO = "HS256"
JWT_TTL_SECONDS = 60 * 60 * 24 * 30  # 30 days


def init_db() -> None:
    con = sqlite3.connect(DB_PATH)
    try:
        con.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                username      TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at    REAL NOT NULL
            )
            """
        )
        con.commit()
    finally:
        con.close()


def _hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _verify_password(pw: str, pw_hash: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), pw_hash.encode("utf-8"))
    except Exception:
        return False


def make_token(username: str) -> str:
    payload = {
        "sub": username,
        "iat": int(time.time()),
        "exp": int(time.time()) + JWT_TTL_SECONDS,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def decode_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        sub = payload.get("sub")
        return sub if isinstance(sub, str) else None
    except jwt.InvalidTokenError:
        return None


def register_user(username: str, password: str) -> bool:
    """Return True if created, False if the username already exists."""
    con = sqlite3.connect(DB_PATH)
    try:
        con.execute(
            "INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)",
            (username, _hash_password(password), time.time()),
        )
        con.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        con.close()


def authenticate(username: str, password: str) -> bool:
    con = sqlite3.connect(DB_PATH)
    try:
        cur = con.execute("SELECT password_hash FROM users WHERE username = ?", (username,))
        row = cur.fetchone()
    finally:
        con.close()
    if not row:
        return False
    return _verify_password(password, row[0])


def user_exists(username: str) -> bool:
    con = sqlite3.connect(DB_PATH)
    try:
        cur = con.execute("SELECT 1 FROM users WHERE username = ?", (username,))
        return cur.fetchone() is not None
    finally:
        con.close()
