import React, { useState, useEffect } from 'react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export default function OrderModal({ trip, onClose, onCreated }) {
  const [title, setTitle] = useState(`${trip.title} — 나의 포토북`);
  const [loading, setLoading] = useState(false);
  const [gallery, setGallery] = useState([]);
  const [selectedTmpl, setSelectedTmpl] = useState('photo-a');

  useEffect(() => {
    // 실제 api.sweetbook.com/templates/ 기반 갤러리 불러오기
    fetch(`${API}/api/sweetbook/templates-gallery?category=사진앨범`)
      .then(r => r.json())
      .then(data => {
        setGallery(data);
        if (data.length) setSelectedTmpl(data[0].uid);
      });
  }, []);

  const handleSubmit = async () => {
    if (!title.trim()) { alert('책 제목을 입력해주세요'); return; }
    setLoading(true);
    const res = await fetch(`${API}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trip_id: trip.id, book_title: title, sweetbook_template_uid: selectedTmpl }),
    });
    setLoading(false);
    if (res.ok) { onCreated(); }
    else { const e = await res.json(); alert(e.detail || '주문 실패'); }
  };

  const selected = gallery.find(t => t.uid === selectedTmpl);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
        <div className="modal-hd">
          <h2>📚 포토북 주문하기</h2>
          <button className="modal-x" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="book-preview" style={{ marginBottom: '1.4rem' }}>
            <span className="bp-emoji">{trip.country_emoji || '✈️'}</span>
            <div className="bp-title">{trip.title}</div>
            <div style={{ fontSize: '.72rem', color: 'rgba(255,255,255,.5)', marginTop: '.2rem' }}>{trip.destination}</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div className="fg">
              <label>책 제목</label>
              <input value={title} onChange={e => setTitle(e.target.value)} />
            </div>

            {/* ── 실제 Sweetbook 템플릿 갤러리 (사진앨범 A/B/C) ── */}
            <div>
              <div style={{ fontSize: '.68rem', textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink-soft)', fontWeight: 600, marginBottom: '.55rem' }}>
                Sweetbook 템플릿 선택
                <span className="sb-badge">api.sweetbook.com/templates</span>
              </div>
              <div className="tmpl-gallery">
                {gallery.map(t => (
                  <div
                    key={t.uid}
                    className={`tmpl-gcard ${selectedTmpl === t.uid ? 'selected' : ''}`}
                    onClick={() => setSelectedTmpl(t.uid)}
                  >
                    <img
                      src={t.image_url}
                      alt={t.name}
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                    <div className="tmpl-gcard-body">
                      <div className="tmpl-gcard-name">{t.name}</div>
                      <div className="tmpl-gcard-sub">{t.subtitle}</div>
                      <div className="tmpl-gcard-spec">{t.spec}</div>
                    </div>
                  </div>
                ))}
              </div>
              {selected && (
                <div style={{ marginTop: '.6rem', padding: '.7rem', background: 'var(--terra-pale)', border: '1px solid #f0c4b0', borderRadius: 'var(--r)', fontSize: '.78rem', color: 'var(--ink-mid)' }}>
                  <strong>{selected.name}</strong> — {selected.description}
                </div>
              )}
            </div>

            <div className="order-includes">
              ✅ AI 여행기 텍스트 포함<br />
              ✅ 실제 Sweetbook 템플릿 메타데이터 포함<br />
              ✅ Sweetbook API 연동 패키지 ZIP 익스포트 가능<br />
              ℹ️ 결제·배송은 별도 진행됩니다
            </div>
          </div>
        </div>
        <div className="modal-ft">
          <button className="btn btn-secondary" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? '처리 중...' : '주문 접수하기 →'}
          </button>
        </div>
      </div>
    </div>
  );
}
