"""
SQLite persistence layer for debates.

Each debate is stored as (metadata columns + full JSON blob) in a single table.
The blob contains everything needed to replay the debate in view mode:
motion, constraints, teams, audience questions, transcript, scores, current_index.
"""

from __future__ import annotations

import json
import os
import sqlite3
import time
from typing import Any, Dict, List, Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "debates.db")


def init_db() -> None:
    con = sqlite3.connect(DB_PATH)
    try:
        con.execute(
            """
            CREATE TABLE IF NOT EXISTS debates (
                id             TEXT PRIMARY KEY,
                owner          TEXT NOT NULL,
                motion         TEXT NOT NULL,
                pro_team_name  TEXT NOT NULL,
                con_team_name  TEXT NOT NULL,
                status         TEXT NOT NULL DEFAULT 'pending',
                current_index  INTEGER NOT NULL DEFAULT 0,
                total_phases   INTEGER NOT NULL DEFAULT 16,
                data           TEXT NOT NULL,
                created_at     REAL NOT NULL,
                updated_at     REAL NOT NULL
            )
            """
        )
        con.execute("CREATE INDEX IF NOT EXISTS idx_debates_owner ON debates(owner)")
        con.commit()
    finally:
        con.close()


def _derive_status(current_index: int, total_phases: int) -> str:
    if current_index <= 0:
        return "pending"
    if current_index >= total_phases:
        return "completed"
    return "running"


def insert_debate(debate_id: str, owner: str, snapshot: Dict[str, Any]) -> None:
    now = time.time()
    status = _derive_status(int(snapshot.get("current_index", 0)), int(snapshot.get("total_phases", 16)))
    con = sqlite3.connect(DB_PATH)
    try:
        con.execute(
            """
            INSERT INTO debates (id, owner, motion, pro_team_name, con_team_name,
                                 status, current_index, total_phases,
                                 data, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                debate_id,
                owner,
                snapshot.get("motion", ""),
                snapshot.get("pro_team_name", "Proposition"),
                snapshot.get("con_team_name", "Opposition"),
                status,
                int(snapshot.get("current_index", 0)),
                int(snapshot.get("total_phases", 16)),
                json.dumps(snapshot, ensure_ascii=False),
                now,
                now,
            ),
        )
        con.commit()
    finally:
        con.close()


def update_debate(debate_id: str, snapshot: Dict[str, Any]) -> None:
    now = time.time()
    status = _derive_status(int(snapshot.get("current_index", 0)), int(snapshot.get("total_phases", 16)))
    con = sqlite3.connect(DB_PATH)
    try:
        con.execute(
            """
            UPDATE debates SET
                motion = ?,
                pro_team_name = ?,
                con_team_name = ?,
                status = ?,
                current_index = ?,
                total_phases = ?,
                data = ?,
                updated_at = ?
            WHERE id = ?
            """,
            (
                snapshot.get("motion", ""),
                snapshot.get("pro_team_name", "Proposition"),
                snapshot.get("con_team_name", "Opposition"),
                status,
                int(snapshot.get("current_index", 0)),
                int(snapshot.get("total_phases", 16)),
                json.dumps(snapshot, ensure_ascii=False),
                now,
                debate_id,
            ),
        )
        con.commit()
    finally:
        con.close()


def get_debate(debate_id: str, owner: str) -> Optional[Dict[str, Any]]:
    con = sqlite3.connect(DB_PATH)
    try:
        cur = con.execute(
            "SELECT data, created_at, updated_at, status FROM debates WHERE id = ? AND owner = ?",
            (debate_id, owner),
        )
        row = cur.fetchone()
    finally:
        con.close()
    if not row:
        return None
    data = json.loads(row[0])
    data["created_at"] = row[1]
    data["updated_at"] = row[2]
    data["status"] = row[3]
    return data


def list_debates(owner: str) -> List[Dict[str, Any]]:
    con = sqlite3.connect(DB_PATH)
    try:
        cur = con.execute(
            """
            SELECT id, motion, pro_team_name, con_team_name, status,
                   current_index, total_phases, created_at, updated_at
            FROM debates
            WHERE owner = ?
            ORDER BY updated_at DESC
            """,
            (owner,),
        )
        rows = cur.fetchall()
    finally:
        con.close()
    return [
        {
            "id": r[0],
            "motion": r[1],
            "pro_team_name": r[2],
            "con_team_name": r[3],
            "status": r[4],
            "current_index": r[5],
            "total_phases": r[6],
            "created_at": r[7],
            "updated_at": r[8],
        }
        for r in rows
    ]


def delete_debate(debate_id: str, owner: str) -> bool:
    con = sqlite3.connect(DB_PATH)
    try:
        cur = con.execute(
            "DELETE FROM debates WHERE id = ? AND owner = ?",
            (debate_id, owner),
        )
        con.commit()
        return cur.rowcount > 0
    finally:
        con.close()
