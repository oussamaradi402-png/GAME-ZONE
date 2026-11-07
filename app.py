
from flask import Flask, render_template, request, jsonify
import sqlite3
import re

app = Flask(__name__)
DB = "gamezone.db"


def connect_db():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = connect_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS players (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            points INTEGER NOT NULL DEFAULT 0
        )
    """)
    conn.commit()
    conn.close()


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()

    if not re.fullmatch(r"[\w -]{2,20}", name, re.UNICODE):
        return jsonify({"error": "Name must be 2-20 characters."}), 400

    conn = connect_db()
    conn.execute("INSERT OR IGNORE INTO players (name) VALUES (?)", (name,))
    player = conn.execute(
        "SELECT name, points FROM players WHERE name = ?", (name,)
    ).fetchone()
    conn.commit()
    conn.close()

    return jsonify(dict(player))


@app.route("/api/score", methods=["POST"])
def score():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    points = data.get("points")

    if not isinstance(points, int) or isinstance(points, bool) or not 1 <= points <= 100:
        return jsonify({"error": "Invalid points"}), 400

    conn = connect_db()
    cursor = conn.execute(
        "UPDATE players SET points = points + ? WHERE name = ?",
        (points, name)
    )
    player = conn.execute(
        "SELECT name, points FROM players WHERE name = ?", (name,)
    ).fetchone()
    conn.commit()
    conn.close()

    if cursor.rowcount == 0 or player is None:
        return jsonify({"error": "Player not found"}), 404

    return jsonify(dict(player))


@app.route("/api/leaderboard")
def leaderboard():
    conn = connect_db()
    players = conn.execute("""
        SELECT name, points
        FROM players
        ORDER BY points DESC, name ASC
        LIMIT 10
    """).fetchall()
    conn.close()

    return jsonify([dict(player) for player in players])


if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5000, debug=True)


