from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
import sqlite3, json, zipfile, io, os, shutil, uuid
from datetime import datetime, date

app = FastAPI(title="TravelLog API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

DB_PATH = "/data/travellog.db"
UPLOAD_DIR = "/data/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ── 실제 api.sweetbook.com/templates/ 기반 갤러리 ─────────────────
SWEETBOOK_TEMPLATES_GALLERY = [
    {
        "uid": "photo-a",
        "name": "사진앨범 A",
        "subtitle": "ONE FINE DAY",
        "category": "사진앨범",
        "image_url": "https://api.sweetbook.com/_next/image/?url=%2Fimages%2Ftemplates%2Fphoto-a.png&w=828&q=75",
        "description": "여행 사진 중심의 모던한 레이아웃. 깔끔한 여백과 대형 사진이 특징.",
        "spec": "A4 가로형 · 최대 80페이지",
        "book_spec_uid": "bs_a4_landscape",
        "recommended_for": "여행 포토북",
    },
    {
        "uid": "photo-b",
        "name": "사진앨범 B",
        "subtitle": "나의 모든 순간들",
        "category": "사진앨범",
        "image_url": "https://api.sweetbook.com/_next/image/?url=%2Fimages%2Ftemplates%2Fphoto-b.png&w=828&q=75",
        "description": "텍스트와 사진을 함께 담기 좋은 정사각형 레이아웃. 감성적인 색감.",
        "spec": "정사각형 210 · 최대 60페이지",
        "book_spec_uid": "bs_square_210",
        "recommended_for": "여행+여행기 포토북",
    },
    {
        "uid": "photo-c",
        "name": "사진앨범 C",
        "subtitle": "Our Memories",
        "category": "사진앨범",
        "image_url": "https://api.sweetbook.com/_next/image/?url=%2Fimages%2Ftemplates%2Fphoto-c.png&w=828&q=75",
        "description": "2인 여행, 커플 여행에 최적화된 대칭형 레이아웃. 따뜻한 분위기.",
        "spec": "A4 세로형 · 최대 100페이지",
        "book_spec_uid": "bs_a4_portrait",
        "recommended_for": "커플·가족 여행 포토북",
    },
    {
        "uid": "diary-a",
        "name": "일기장 A",
        "subtitle": "나의 하루 기록",
        "category": "일기장",
        "image_url": "https://api.sweetbook.com/_next/image/?url=%2Fimages%2Ftemplates%2Fdiary-a.png&w=828&q=75",
        "description": "날짜·장소·텍스트 위주의 일기형 레이아웃. 여행기 텍스트에 최적.",
        "spec": "A5 세로형 · 최대 100페이지",
        "book_spec_uid": "bs_a5_portrait",
        "recommended_for": "여행 일기 포토북",
    },
    {
        "uid": "diary-b",
        "name": "일기장 B",
        "subtitle": "Diary Book",
        "category": "일기장",
        "image_url": "https://api.sweetbook.com/_next/image/?url=%2Fimages%2Ftemplates%2Fdiary-b.png&w=828&q=75",
        "description": "영문 타이포그래피 감성의 세로형 다이어리 레이아웃.",
        "spec": "A5 세로형 · 최대 100페이지",
        "book_spec_uid": "bs_a5_portrait",
        "recommended_for": "영문 여행 일기",
    },
]

SWEETBOOK_BOOK_SPECS = [
    {"uid": "bs_a4_landscape", "name": "A4 가로형", "orientation": "landscape",
     "width_mm": 297, "height_mm": 210, "min_pages": 24, "max_pages": 200,
     "description": "여행 사진에 최적화된 와이드 판형"},
    {"uid": "bs_a4_portrait", "name": "A4 세로형", "orientation": "portrait",
     "width_mm": 210, "height_mm": 297, "min_pages": 24, "max_pages": 200,
     "description": "텍스트와 사진을 함께 담기 좋은 판형"},
    {"uid": "bs_square_210", "name": "정사각형 210", "orientation": "square",
     "width_mm": 210, "height_mm": 210, "min_pages": 24, "max_pages": 120,
     "description": "SNS 감성의 정사각형 포토북"},
    {"uid": "bs_a5_portrait", "name": "A5 세로형", "orientation": "portrait",
     "width_mm": 148, "height_mm": 210, "min_pages": 24, "max_pages": 100,
     "description": "여행 가방에 쏙 들어가는 포켓 포토북"},
]


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    os.makedirs("/data", exist_ok=True)
    conn = get_db()
    c = conn.cursor()
    c.execute("""CREATE TABLE IF NOT EXISTS trips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        destination TEXT NOT NULL,
        country_emoji TEXT DEFAULT '✈️',
        started_at TEXT, ended_at TEXT,
        description TEXT, ai_story TEXT,
        created_at TEXT DEFAULT (datetime('now'))
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        caption TEXT, location TEXT, taken_at TEXT,
        sort_order INTEGER DEFAULT 0,
        sweetbook_photo_uid TEXT,
        FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id INTEGER NOT NULL,
        book_title TEXT NOT NULL,
        sweetbook_template_uid TEXT DEFAULT 'photo-a',
        status TEXT DEFAULT 'pending',
        sweetbook_book_uid TEXT,
        sweetbook_order_uid TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (trip_id) REFERENCES trips(id)
    )""")
    c.execute("SELECT COUNT(*) FROM trips")
    if c.fetchone()[0] == 0:
        _seed(c)
    conn.commit()
    conn.close()


def _seed(c):
    trips = [
        ("교토의 벚꽃, 그 짧은 봄", "교토, 일본", "🇯🇵", "2024-03-28", "2024-04-03",
         "일본 교토에서 보낸 6박 7일. 철학의 길, 기온 거리, 아라시야마 대나무 숲.",
         "벚꽃은 기다린다고 만날 수 있는 게 아니었다. 3월 말 교토행 비행기를 탔을 때, 솔직히 확신이 없었다.\n\n하지만 철학의 길에 들어선 순간, 그 걱정은 눈처럼 녹아버렸다. 연분홍 꽃잎이 수면 위로 흩날리고, 오래된 돌담 너머로 할머니가 꽃잎을 바라보고 있었다.\n\n기온의 골목은 밤이 깊을수록 더 빛났다. 붉은 제등 불빛이 젖은 돌바닥에 비치고, 어디선가 샤미센 소리가 새어나왔다.\n\n6일은 짧았다. 떠나는 날 아침, 숙소 창밖에는 어젯밤 비에 꽃잎이 더 많이 졌고, 나는 그게 더 아름답다는 걸 처음 알았다."),
        ("리스본의 파두, 그리움을 배우다", "리스본, 포르투갈", "🇵🇹", "2024-07-10", "2024-07-17",
         "7일간의 포르투갈 여행. 트램, 에그 타르트, 그리고 파두.",
         "리스본에는 사우다드(Saudade)라는 단어가 있다. 그리움, 향수, 달콤한 아픔.\n\n28번 트램을 탔을 때 이해했다. 알파마 언덕을 헐떡이며 올라가며, 빛바랜 아줄레주 타일 벽과 빨랫줄에 걸린 옷가지가 창밖을 스쳐 지났다.\n\n벨렘의 에그 타르트는 소문 이상이었다. 갓 구운 타르트를 한 입 베어 물자 바삭한 페이스트리가 무너졌다.\n\n파두 공연장에서 눈시울이 뜨거워졌다. 포르투갈어를 한 마디도 모르면서. 사우다드는 번역이 필요 없었다."),
        ("방콕 48시간: 카오스와 고요 사이", "방콕, 태국", "🇹🇭", "2024-10-05", "2024-10-07",
         "짧지만 강렬했던 방콕 단기 여행. 새벽 사원부터 카오산 로드까지.",
         "48시간으로 방콕을 알 수 있을까? 모른다. 하지만 방콕은 48시간 안에 전부를 보여주려 했다.\n\n새벽 5시, 왓 아룬 앞 차오프라야 강변에 앉았다. 사원의 첨탑이 떠오르는 태양에 물들었다.\n\n낮에는 달랐다. 카오산 로드의 혼돈, 뚝뚝 흥정, 팟타이 냄새와 배기가스가 뒤섞였다.\n\n48시간이라 오히려 좋았다. 방콕은 욕심 부리면 지는 도시다."),
    ]
    trip_ids = []
    for t in trips:
        c.execute("INSERT INTO trips (title,destination,country_emoji,started_at,ended_at,description,ai_story) VALUES(?,?,?,?,?,?,?)", t)
        trip_ids.append(c.lastrowid)
    seeds = [
        (trip_ids[0], "철학의 길 벚꽃 산책로", "2024-03-29", "철학의 길, 교토"),
        (trip_ids[0], "기온 거리 야경", "2024-03-30", "기온, 교토"),
        (trip_ids[0], "아라시야마 대나무 숲", "2024-04-01", "아라시야마, 교토"),
        (trip_ids[1], "28번 트램 창밖 풍경", "2024-07-11", "알파마, 리스본"),
        (trip_ids[1], "벨렘 수도원과 에그 타르트", "2024-07-12", "벨렘, 리스본"),
        (trip_ids[1], "파두 공연장 내부", "2024-07-14", "바이루 알투, 리스본"),
        (trip_ids[2], "왓 아룬 일출", "2024-10-05", "왓 아룬, 방콕"),
        (trip_ids[2], "카오산 로드 야시장", "2024-10-06", "카오산, 방콕"),
    ]
    for i, s in enumerate(seeds):
        c.execute("INSERT INTO photos(trip_id,caption,taken_at,location,filename,sort_order,sweetbook_photo_uid) VALUES(?,?,?,?,?,?,?)",
                  (s[0], s[1], s[2], s[3], "__placeholder__", i, f"photo_{uuid.uuid4().hex[:10]}"))
    c.execute("INSERT INTO orders(trip_id,book_title,sweetbook_template_uid,status,sweetbook_book_uid,sweetbook_order_uid) VALUES(?,?,?,?,?,?)",
              (trip_ids[0], "교토의 봄 — 나의 포토북", "photo-a", "completed", "book_kyoto_demo_001", "order_kyoto_demo_001"))


@app.on_event("startup")
def startup():
    init_db()
    if os.path.isdir(UPLOAD_DIR):
        try:
            app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
        except Exception:
            pass


# ── Sweetbook 갤러리 엔드포인트 ───────────────────────────────────
@app.get("/api/sweetbook/templates-gallery")
def get_templates_gallery(category: str = None):
    result = SWEETBOOK_TEMPLATES_GALLERY
    if category:
        result = [t for t in result if t["category"] == category]
    return result

@app.get("/api/sweetbook/book-specs")
def list_book_specs():
    return SWEETBOOK_BOOK_SPECS


# ── Trips CRUD ────────────────────────────────────────────────────
@app.get("/api/trips")
def list_trips():
    conn = get_db()
    trips = conn.execute("SELECT * FROM trips ORDER BY started_at DESC").fetchall()
    result = []
    for t in trips:
        row = dict(t)
        row["photo_count"] = conn.execute("SELECT COUNT(*) FROM photos WHERE trip_id=?", (row["id"],)).fetchone()[0]
        # 여행 일수 계산
        try:
            if row["started_at"] and row["ended_at"]:
                d1 = date.fromisoformat(row["started_at"])
                d2 = date.fromisoformat(row["ended_at"])
                row["trip_days"] = (d2 - d1).days + 1
            else:
                row["trip_days"] = None
        except Exception:
            row["trip_days"] = None
        result.append(row)
    conn.close()
    return result


@app.get("/api/trips/{trip_id}")
def get_trip(trip_id: int):
    conn = get_db()
    trip = conn.execute("SELECT * FROM trips WHERE id=?", (trip_id,)).fetchone()
    if not trip:
        raise HTTPException(404)
    row = dict(trip)
    row["photos"] = [dict(p) for p in conn.execute(
        "SELECT * FROM photos WHERE trip_id=? ORDER BY sort_order,taken_at", (trip_id,)).fetchall()]
    try:
        if row["started_at"] and row["ended_at"]:
            d1 = date.fromisoformat(row["started_at"])
            d2 = date.fromisoformat(row["ended_at"])
            row["trip_days"] = (d2 - d1).days + 1
        else:
            row["trip_days"] = None
    except Exception:
        row["trip_days"] = None
    conn.close()
    return row


@app.post("/api/trips")
async def create_trip(
    title: str = Form(...), destination: str = Form(...), country_emoji: str = Form("✈️"),
    started_at: str = Form(""), ended_at: str = Form(""), description: str = Form(""),
):
    conn = get_db()
    c = conn.cursor()
    c.execute("INSERT INTO trips(title,destination,country_emoji,started_at,ended_at,description) VALUES(?,?,?,?,?,?)",
              (title, destination, country_emoji, started_at or None, ended_at or None, description))
    conn.commit()
    row = dict(conn.execute("SELECT * FROM trips WHERE id=?", (c.lastrowid,)).fetchone())
    conn.close()
    return row


@app.patch("/api/trips/{trip_id}")
async def update_trip(trip_id: int, body: dict):
    allowed = {"title", "destination", "country_emoji", "started_at", "ended_at", "description", "ai_story"}
    fields = {k: v for k, v in body.items() if k in allowed}
    if not fields:
        raise HTTPException(400, "수정할 필드가 없습니다")
    conn = get_db()
    sets = ", ".join(f"{k}=?" for k in fields)
    conn.execute(f"UPDATE trips SET {sets} WHERE id=?", list(fields.values()) + [trip_id])
    conn.commit()
    row = conn.execute("SELECT * FROM trips WHERE id=?", (trip_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(404)
    return dict(row)


@app.delete("/api/trips/{trip_id}")
def delete_trip(trip_id: int):
    conn = get_db()
    photos = conn.execute("SELECT filename FROM photos WHERE trip_id=?", (trip_id,)).fetchall()
    for p in photos:
        if p["filename"] != "__placeholder__":
            fp = os.path.join(UPLOAD_DIR, p["filename"])
            if os.path.exists(fp):
                os.remove(fp)
    conn.execute("DELETE FROM trips WHERE id=?", (trip_id,))
    conn.commit()
    conn.close()
    return {"ok": True}


# ── Photos ────────────────────────────────────────────────────────
@app.post("/api/trips/{trip_id}/photos")
async def upload_photos(
    trip_id: int,
    files: list[UploadFile] = File(...),   # 멀티 업로드
    captions: str = Form(""),              # JSON array string or empty
    locations: str = Form(""),
):
    conn = get_db()
    if not conn.execute("SELECT id FROM trips WHERE id=?", (trip_id,)).fetchone():
        raise HTTPException(404)
    try:
        caps = json.loads(captions) if captions else []
    except Exception:
        caps = []
    try:
        locs = json.loads(locations) if locations else []
    except Exception:
        locs = []

    inserted = []
    for i, file in enumerate(files):
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in {".jpg", ".jpeg", ".png", ".gif", ".webp"}:
            continue
        filename = f"{uuid.uuid4()}{ext}"
        with open(os.path.join(UPLOAD_DIR, filename), "wb") as f:
            shutil.copyfileobj(file.file, f)
        cap = caps[i] if i < len(caps) else file.name.replace(ext, "")
        loc = locs[i] if i < len(locs) else ""
        sb_uid = f"photo_{uuid.uuid4().hex[:12]}"
        c = conn.cursor()
        c.execute("INSERT INTO photos(trip_id,filename,caption,location,sweetbook_photo_uid) VALUES(?,?,?,?,?)",
                  (trip_id, filename, cap, loc, sb_uid))
        conn.commit()
        inserted.append(dict(conn.execute("SELECT * FROM photos WHERE id=?", (c.lastrowid,)).fetchone()))
    conn.close()
    return inserted


@app.patch("/api/photos/{photo_id}")
async def update_photo(photo_id: int, body: dict):
    allowed = {"caption", "location", "taken_at"}
    fields = {k: v for k, v in body.items() if k in allowed}
    if not fields:
        raise HTTPException(400, "수정할 필드가 없습니다")
    conn = get_db()
    sets = ", ".join(f"{k}=?" for k in fields)
    conn.execute(f"UPDATE photos SET {sets} WHERE id=?", list(fields.values()) + [photo_id])
    conn.commit()
    row = conn.execute("SELECT * FROM photos WHERE id=?", (photo_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(404)
    return dict(row)


@app.delete("/api/photos/{photo_id}")
def delete_photo(photo_id: int):
    conn = get_db()
    row = conn.execute("SELECT filename FROM photos WHERE id=?", (photo_id,)).fetchone()
    if row and row["filename"] != "__placeholder__":
        fp = os.path.join(UPLOAD_DIR, row["filename"])
        if os.path.exists(fp):
            os.remove(fp)
    conn.execute("DELETE FROM photos WHERE id=?", (photo_id,))
    conn.commit()
    conn.close()
    return {"ok": True}


# ── AI Story ──────────────────────────────────────────────────────
@app.post("/api/trips/{trip_id}/generate-story")
async def generate_story(trip_id: int):
    conn = get_db()
    trip = conn.execute("SELECT * FROM trips WHERE id=?", (trip_id,)).fetchone()
    if not trip:
        raise HTTPException(404)
    trip = dict(trip)
    photos = conn.execute("SELECT * FROM photos WHERE trip_id=? ORDER BY sort_order,taken_at", (trip_id,)).fetchall()
    conn.close()
    photo_lines = "\n".join(f"- {p['caption'] or '사진'} ({p['location'] or '위치 미상'})" for p in photos) or "- 사진 없음"
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        story = trip.get("ai_story") or f"{trip['destination']} 여행기\n\n{trip.get('description','')}\n\n(ANTHROPIC_API_KEY를 설정하면 AI가 감성적인 여행기를 자동 생성합니다.)"
    else:
        import httpx
        prompt = f"""다음 여행 정보를 바탕으로 감성적이고 문학적인 한국어 여행기를 써줘.

여행지: {trip['destination']}
제목: {trip['title']}
기간: {trip.get('started_at','')} ~ {trip.get('ended_at','')}
메모: {trip.get('description','')}
사진들: {photo_lines}

조건: 4~5문단, 각 문단은 빈 줄(\\n\\n)로 구분, 총 400~600자, 1인칭, 감성적·문학적 문체, 마크다운 없이 순수 텍스트"""
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post("https://api.anthropic.com/v1/messages",
                    headers={"x-api-key": api_key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
                    json={"model": "claude-sonnet-4-20250514", "max_tokens": 1000, "messages": [{"role": "user", "content": prompt}]})
            story = resp.json()["content"][0]["text"]
        except Exception as e:
            story = trip.get("ai_story") or f"AI 생성 오류: {e}"
    conn = get_db()
    conn.execute("UPDATE trips SET ai_story=? WHERE id=?", (story, trip_id))
    conn.commit()
    conn.close()
    return {"story": story}


# ── Orders ────────────────────────────────────────────────────────
@app.get("/api/orders")
def list_orders():
    conn = get_db()
    rows = conn.execute("""
        SELECT o.*, t.title as trip_title, t.destination, t.country_emoji,
               t.started_at as trip_started_at, t.ended_at as trip_ended_at,
               t.ai_story as trip_story, t.description as trip_description
        FROM orders o JOIN trips t ON o.trip_id=t.id ORDER BY o.created_at DESC
    """).fetchall()
    result = []
    for row in rows:
        d = dict(row)
        # 여행 일수 계산
        try:
            if d.get("trip_started_at") and d.get("trip_ended_at"):
                d1 = date.fromisoformat(d["trip_started_at"])
                d2 = date.fromisoformat(d["trip_ended_at"])
                d["trip_days"] = (d2 - d1).days + 1
        except Exception:
            d["trip_days"] = None
        # 사진 수
        d["photo_count"] = conn.execute("SELECT COUNT(*) FROM photos WHERE trip_id=?", (d["trip_id"],)).fetchone()[0]
        # 템플릿 메타데이터
        tmpl = next((t for t in SWEETBOOK_TEMPLATES_GALLERY if t["uid"] == d.get("sweetbook_template_uid")), None)
        d["template_meta"] = tmpl
        result.append(d)
    conn.close()
    return result


@app.post("/api/orders")
def create_order(body: dict):
    trip_id = body.get("trip_id")
    book_title = body.get("book_title", "").strip()
    template_uid = body.get("sweetbook_template_uid", "photo-a")
    if not trip_id or not book_title:
        raise HTTPException(400, "trip_id와 book_title은 필수입니다")
    valid_uids = {t["uid"] for t in SWEETBOOK_TEMPLATES_GALLERY}
    if template_uid not in valid_uids:
        raise HTTPException(400, f"유효하지 않은 template_uid: {template_uid}")
    conn = get_db()
    if not conn.execute("SELECT id FROM trips WHERE id=?", (trip_id,)).fetchone():
        raise HTTPException(404, "여행을 찾을 수 없습니다")
    c = conn.cursor()
    c.execute("INSERT INTO orders(trip_id,book_title,sweetbook_template_uid) VALUES(?,?,?)",
              (trip_id, book_title, template_uid))
    conn.commit()
    row = conn.execute("""
        SELECT o.*, t.title as trip_title, t.destination, t.country_emoji
        FROM orders o JOIN trips t ON o.trip_id=t.id WHERE o.id=?
    """, (c.lastrowid,)).fetchone()
    conn.close()
    return dict(row)


@app.patch("/api/orders/{order_id}/status")
def update_order_status(order_id: int, body: dict):
    status = body.get("status")
    if status not in ("pending", "processing", "completed", "cancelled"):
        raise HTTPException(400, "유효하지 않은 상태")
    conn = get_db()
    conn.execute("UPDATE orders SET status=?,updated_at=datetime('now') WHERE id=?", (status, order_id))
    conn.commit()
    row = conn.execute("""
        SELECT o.*, t.title as trip_title, t.destination, t.country_emoji
        FROM orders o JOIN trips t ON o.trip_id=t.id WHERE o.id=?
    """, (order_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(404)
    return dict(row)


# ── Lv3 Export ───────────────────────────────────────────────────
@app.get("/api/orders/{order_id}/export")
def export_order(order_id: int):
    conn = get_db()
    order = conn.execute("SELECT * FROM orders WHERE id=?", (order_id,)).fetchone()
    if not order:
        raise HTTPException(404)
    order = dict(order)
    trip = dict(conn.execute("SELECT * FROM trips WHERE id=?", (order["trip_id"],)).fetchone())
    photos = [dict(p) for p in conn.execute(
        "SELECT * FROM photos WHERE trip_id=? ORDER BY sort_order,taken_at", (trip["id"],)).fetchall()]
    conn.close()

    tmpl = next((t for t in SWEETBOOK_TEMPLATES_GALLERY if t["uid"] == order.get("sweetbook_template_uid", "photo-a")), SWEETBOOK_TEMPLATES_GALLERY[0])
    spec = next((s for s in SWEETBOOK_BOOK_SPECS if s["uid"] == tmpl["book_spec_uid"]), SWEETBOOK_BOOK_SPECS[0])
    real_photos = [p for p in photos if p["filename"] != "__placeholder__"]

    # 여행 일수
    trip_days = None
    try:
        if trip.get("started_at") and trip.get("ended_at"):
            d1 = date.fromisoformat(trip["started_at"])
            d2 = date.fromisoformat(trip["ended_at"])
            trip_days = (d2 - d1).days + 1
    except Exception:
        pass

    sweetbook_payload = {
        "_meta": {
            "generated_at": datetime.now().isoformat(),
            "travellog_order_id": order["id"],
            "api_base_url_sandbox": "https://api-sandbox.sweetbook.com/v1",
            "api_base_url_live": "https://api.sweetbook.com/v1",
            "workflow_doc": "https://api.sweetbook.com/docs/guides/workflow/",
        },
        "selected_template": {
            "uid": tmpl["uid"],
            "name": tmpl["name"],
            "subtitle": tmpl["subtitle"],
            "category": tmpl["category"],
            "spec": tmpl["spec"],
            "image_url": tmpl["image_url"],
            "book_spec_uid": tmpl["book_spec_uid"],
            "book_spec_name": spec["name"],
            "book_spec_size": f"{spec['width_mm']}×{spec['height_mm']}mm",
            "book_spec_min_pages": spec["min_pages"],
            "book_spec_max_pages": spec["max_pages"],
        },
        "step1_create_book": {
            "endpoint": "POST /books",
            "payload": {"bookSpecUid": spec["uid"], "templateUid": tmpl["uid"], "title": order["book_title"]},
        },
        "step2_upload_photos": {
            "endpoint": "POST /books/{bookUid}/photos",
            "note": f"총 {len(real_photos)}장 업로드 필요 (trip/photos/ 폴더)",
            "payloads": [{"_file": f"trip/photos/{p['filename']}", "metadata": {"caption": p.get("caption"), "location": p.get("location"), "taken_at": p.get("taken_at"), "sweetbook_photo_uid": p.get("sweetbook_photo_uid")}} for p in real_photos],
        },
        "step3_finalize_order": {
            "endpoint": "POST /orders",
            "payload": {"bookUid": "<step1 응답의 uid>", "quantity": 1},
        },
    }

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("sweetbook_payload.json", json.dumps(sweetbook_payload, ensure_ascii=False, indent=2))
        zf.writestr("order.json", json.dumps({
            "order_id": order["id"], "book_title": order["book_title"],
            "sweetbook_template_uid": order.get("sweetbook_template_uid"),
            "template_name": tmpl["name"], "template_spec": tmpl["spec"],
            "status": order["status"],
            "sweetbook_book_uid": order.get("sweetbook_book_uid"),
            "sweetbook_order_uid": order.get("sweetbook_order_uid"),
            "exported_at": datetime.now().isoformat(),
        }, ensure_ascii=False, indent=2))
        zf.writestr("trip/metadata.json", json.dumps({
            "title": trip["title"], "destination": trip["destination"],
            "country_emoji": trip["country_emoji"],
            "started_at": trip["started_at"], "ended_at": trip["ended_at"],
            "trip_days": trip_days,
            "description": trip["description"],
            "photo_count": len(photos), "real_photo_count": len(real_photos),
        }, ensure_ascii=False, indent=2))
        if trip.get("ai_story"):
            zf.writestr("trip/story.txt", trip["ai_story"])
        zf.writestr("trip/photos_metadata.json", json.dumps([{
            "index": i+1, "caption": p.get("caption"), "location": p.get("location"),
            "taken_at": p.get("taken_at"), "filename": p["filename"],
            "sweetbook_photo_uid": p.get("sweetbook_photo_uid"),
            "is_placeholder": p["filename"] == "__placeholder__",
        } for i, p in enumerate(photos)], ensure_ascii=False, indent=2))
        for p in real_photos:
            fp = os.path.join(UPLOAD_DIR, p["filename"])
            if os.path.exists(fp):
                zf.write(fp, f"trip/photos/{p['filename']}")
        zf.writestr("README.txt", f"""TravelLog → Sweetbook Book Print API 연동 패키지
================================================
템플릿: {tmpl['name']} ({tmpl['subtitle']}) — {tmpl['spec']}
판형: {spec['name']} {spec['width_mm']}x{spec['height_mm']}mm
갤러리: https://api.sweetbook.com/templates/

연동 순서:
1. POST /books  (step1_create_book 참고)
2. POST /books/{{uid}}/photos  (step2_upload_photos 참고, trip/photos/ 사용)
3. POST /orders  (step3_finalize_order 참고)

API 문서: https://api.sweetbook.com/docs/guides/workflow/
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
""")

    buf.seek(0)
    return StreamingResponse(buf, media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=travellog_sweetbook_order_{order_id}.zip"})


@app.get("/health")
def health():
    return {"ok": True}
