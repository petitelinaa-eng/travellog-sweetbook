# ✈️ TravelLog — 여행 기록을 포토북으로

> 여행 사진과 AI 여행기를 기록하고, Sweetbook Book Print API 연동 구조로 포토북을 주문하는 콘텐츠 서비스

**콘텐츠 서비스가 본체, 책은 부가 기능** — 여행 기록이 핵심이고, 포토북 제작은 그 위의 레이어입니다.

---

## 서비스 소개

- **어떤 서비스인가**: 여행 기록(사진 + AI 여행기)을 저장하고, Sweetbook Book Print API와 연동 가능한 포토북으로 주문하는 풀스택 웹앱
- **타겟 사용자**: 여행 후 사진을 의미 있는 형태로 남기고 싶은 사람
- **주요 기능**:
  - 여행 기록 생성·조회·편집 (Lv1)
  - 사진 업로드 및 관리 (Lv1)
  - AI 여행기 자동 생성 — Claude API 사용 (Lv1)
  - Sweetbook 판형(BookSpec) 및 템플릿 선택 UI (Lv2)
  - 포토북 주문 생성·상태 관리 (pending → processing → completed) (Lv2)
  - Sweetbook API 연동 패키지 ZIP 익스포트 (Lv3)

---

## 실행 방법 (Docker)

```bash
# 저장소 클론
git clone <repo-url>
cd travellog

# 환경변수 준비
cp .env.example .env
# .env에서 ANTHROPIC_API_KEY 설정 (AI 여행기 생성에 사용, 없으면 샘플 텍스트 표시)

# 실행
docker-compose up

# 접속
http://localhost:3000
```

포트 변경이 필요한 경우 `docker-compose.yml`의 `ports` 항목 수정:
```yaml
ports:
  - "원하는포트:3000"   # 프론트엔드
  - "원하는포트:8000"   # 백엔드 API
```

---

## 완성한 레벨

### ✅ Lv1 — 서비스 구현
- 여행 기록 CRUD (제목, 여행지, 날짜, 메모, 이모지)
- 사진 업로드·삭제 (jpg/png/webp/gif)
- AI 여행기 자동 생성 (Claude API, ANTHROPIC_API_KEY 설정 시 활성화)
- 더미 데이터 3개 여행 포함 (교토·리스본·방콕)
- 로그인 없이 즉시 사용 가능

### ✅ Lv2 — 자체 주문 기능 (Sweetbook 연동 구조)
- **Sweetbook BookSpec 연동**: A4 가로형/세로형, 정사각형 210, A5 세로형 판형 선택
- **Sweetbook Template 연동**: 표지 템플릿(여행기 클래식, 미니멀 모던) + 내지 템플릿(스토리 텍스트, 전면 사진, 2열/3열 갤러리) 선택
- 판형에 따른 호환 템플릿 자동 필터링
- 주문 상태 관리: `pending → processing → completed`
- `GET /api/sweetbook/book-specs`, `GET /api/sweetbook/templates` 엔드포인트 구현

### ✅ Lv3 — Sweetbook API 연동 익스포트
- `GET /api/orders/{id}/export` — Sweetbook Book Print API 워크플로우 순서대로 구조화된 ZIP 생성
- ZIP 내용:
  - **`sweetbook_payload.json`**: API 호출 6단계(책 생성→사진 업로드→표지→내지→최종화→주문) 페이로드
  - `order.json` / `trip/metadata.json` / `trip/story.txt` / `trip/photos_metadata.json` / `trip/photos/`
  - `README.txt`: API 연동 가이드

---

## 기술 스택 및 아키텍처

| 영역 | 선택 | 이유 |
|------|------|------|
| 프론트엔드 | React (CRA) | 컴포넌트 분리가 명확하고 빠른 프로토타이핑 |
| 백엔드 | FastAPI (Python) | 비동기 지원, 자동 OpenAPI 문서, httpx로 Anthropic API 연동 용이 |
| DB | SQLite | 단일 파일 DB로 Docker 환경에서 별도 DB 컨테이너 불필요 |
| 컨테이너 | Docker Compose | 프론트/백 분리 실행, 심사자 환경 재현 |

```
travellog/
├── backend/
│   ├── main.py          # FastAPI 앱 (Trips, Photos, Orders, AI Story, Sweetbook 스펙)
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.js
│   │   ├── pages/
│   │   │   ├── TripList.js
│   │   │   ├── TripDetail.js
│   │   │   └── OrdersPage.js   # Sweetbook BookSpec/Template 선택 UI
│   │   └── components/
│   │       ├── OrderModal.js   # 판형·템플릿 선택 모달
│   │       └── TripForm.js
│   └── Dockerfile
└── docker-compose.yml
```

---

## API 엔드포인트

| 엔드포인트 | 설명 |
|---|---|
| `GET /api/trips` | 여행 목록 |
| `POST /api/trips` | 여행 생성 |
| `POST /api/trips/{id}/photos` | 사진 업로드 |
| `POST /api/trips/{id}/generate-story` | AI 여행기 생성 |
| `GET /api/sweetbook/book-specs` | Sweetbook 판형 목록 |
| `GET /api/sweetbook/templates` | Sweetbook 템플릿 목록 |
| `POST /api/orders` | 주문 생성 (book_spec_uid, template_uid 포함) |
| `PATCH /api/orders/{id}/status` | 주문 상태 변경 |
| `GET /api/orders/{id}/export` | Sweetbook API 연동 ZIP 다운로드 |

---

## Sweetbook API 연동 구조

이 서비스의 Lv3 익스포트는 [Sweetbook Book Print API 워크플로우](https://api.sweetbook.com/docs/guides/workflow/)를 그대로 따릅니다.

```
주문 생성 → export ZIP 다운로드 → sweetbook_payload.json 사용
→ POST /books → POST /books/{uid}/photos → POST /books/{uid}/cover
→ POST /books/{uid}/contents (×n) → POST /books/{uid}/finalization
→ POST /orders/estimate → POST /orders
```

---

## AI 도구 사용 내역

| AI 도구 | 활용 내용 |
|---------|----------|
| Claude | 전체 아키텍처 설계, 백엔드 라우팅, Sweetbook API 연동 구조 설계, 더미 데이터 생성 |
| Claude API | AI 여행기 자동 생성 기능 (claude-sonnet-4-20250514) |

---

## 설계 의도

- **왜 여행 기록인가**: 여행 사진은 찍고 나면 사라지기 쉽다. "찍는 것"이 아니라 "남기는 것"에 집중한 서비스가 필요하다고 생각했다. 포토북은 그 기록의 가장 물리적인 결과물이다.
- **사업적 가능성**: Sweetbook 같은 인쇄 API를 파트너사로 두면, 자체 인쇄 설비 없이 B2C 포토북 서비스를 런칭할 수 있다. 마진은 인쇄 원가 위에 얹히는 구조.
- **더 시간이 있었다면**: 실제 Sweetbook Sandbox API 연동, 사진 드래그앤드롭 정렬, 포토북 미리보기 (판형 비율로 레이아웃 시뮬레이션)

---

## 유의사항

- `.env` 파일에 API 키 등 민감 정보를 관리하세요 (`.gitignore`에 포함됨)
- `ANTHROPIC_API_KEY` 없이도 서비스 동작은 가능 (AI 여행기 생성만 제한)
