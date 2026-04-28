import React, { useState, useEffect, useCallback } from 'react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const STATUS_NEXT = { pending: 'processing', processing: 'completed' };
const STATUS_NEXT_LABEL = { pending: '⚙️ 제작 시작', processing: '✅ 제작 완료' };
const STATUS_LABEL = { pending: '주문 대기', processing: '제작 중', completed: '완료', cancelled: '취소' };

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [trips, setTrips] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ trip_id: '', book_title: '', sweetbook_template_uid: 'photo-a' });
  const [toast, setToast] = useState('');
  const [showForm, setShowForm] = useState(false);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2800); };

  const fetchAll = useCallback(async () => {
    const [oRes, tRes, gRes] = await Promise.all([
      fetch(`${API}/api/orders`),
      fetch(`${API}/api/trips`),
      fetch(`${API}/api/sweetbook/templates-gallery`),
    ]);
    setOrders(await oRes.json());
    setTrips(await tRes.json());
    setGallery(await gRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleCreate = async () => {
    if (!form.trip_id || !form.book_title.trim()) { showToast('여행과 책 제목을 입력해주세요'); return; }
    const res = await fetch(`${API}/api/orders`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, trip_id: parseInt(form.trip_id) }),
    });
    if (!res.ok) { const e = await res.json(); showToast(`❌ ${e.detail}`); return; }
    setForm({ trip_id: '', book_title: '', sweetbook_template_uid: 'photo-a' });
    setShowForm(false);
    fetchAll();
    showToast('📦 주문이 접수되었습니다!');
  };

  const handleStatusUpdate = async (orderId, currentStatus) => {
    const next = STATUS_NEXT[currentStatus];
    if (!next) return;
    await fetch(`${API}/api/orders/${orderId}/status`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    fetchAll();
    showToast(`✅ 상태: "${STATUS_LABEL[next]}"으로 변경`);
  };

  const handleExport = async (order) => {
    showToast('📥 Sweetbook 연동 패키지 생성 중...');
    const res = await fetch(`${API}/api/orders/${order.id}/export`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `travellog_sweetbook_order_${order.id}.zip`; a.click();
    URL.revokeObjectURL(url);
    showToast('✅ 다운로드 완료!');
  };

  const handleTripChange = (tripId) => {
    const trip = trips.find(t => t.id === parseInt(tripId));
    setForm(f => ({ ...f, trip_id: tripId, book_title: trip ? `${trip.title} — 나의 포토북` : f.book_title }));
  };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">📦 포토북 <em>주문</em></h1>
          <p className="page-sub">Sweetbook Book Print API 연동 주문 관리</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}>
          {showForm ? '✕ 닫기' : '+ 새 주문'}
        </button>
      </div>

      {/* 새 주문 폼 */}
      {showForm && (
        <div className="new-order-form">
          <h3>새 포토북 주문</h3>
          <p style={{ fontSize: '.8rem', color: 'var(--ink-soft)', marginBottom: '1.1rem', lineHeight: 1.7 }}>
            Sweetbook 템플릿을 선택하면 실제 api.sweetbook.com 인쇄 연동 페이로드가 자동 구성됩니다.
          </p>
          <div className="form-grid" style={{ marginBottom: '1rem' }}>
            <div className="fg">
              <label>여행 선택 *</label>
              <select value={form.trip_id} onChange={e => handleTripChange(e.target.value)}>
                <option value="">— 여행을 선택하세요 —</option>
                {trips.map(t => <option key={t.id} value={t.id}>{t.country_emoji} {t.title}</option>)}
              </select>
            </div>
            <div className="fg full">
              <label>책 제목 *</label>
              <input value={form.book_title} onChange={e => setForm(f => ({ ...f, book_title: e.target.value }))} placeholder="나의 포토북 제목" />
            </div>
          </div>

          {/* 실제 Sweetbook 템플릿 갤러리 */}
          <div style={{ marginBottom: '1.1rem' }}>
            <div className="fg-label" style={{ marginBottom: '.5rem' }}>
              템플릿 선택 <span className="sb-badge">api.sweetbook.com/templates</span>
            </div>
            <div className="tmpl-gallery">
              {gallery.map(t => (
                <div key={t.uid} className={`tmpl-gcard ${form.sweetbook_template_uid === t.uid ? 'selected' : ''}`}
                  onClick={() => setForm(f => ({ ...f, sweetbook_template_uid: t.uid }))}>
                  <img src={t.image_url} alt={t.name} onError={e => { e.target.style.display = 'none'; }} />
                  <div className="tmpl-gcard-body">
                    <div className="tmpl-gcard-name">{t.name}</div>
                    <div className="tmpl-gcard-sub">{t.subtitle}</div>
                    <div className="tmpl-gcard-spec">{t.spec}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button className="btn btn-primary" onClick={handleCreate}>주문 접수하기 →</button>
        </div>
      )}

      {/* 주문 목록 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.1rem' }}>
        <h2 style={{ fontFamily: 'var(--serif)', fontSize: '1.05rem' }}>주문 현황</h2>
        <span style={{ fontSize: '.76rem', color: 'var(--ink-soft)' }}>총 {orders.length}건</span>
      </div>

      {loading ? <div className="spinner" /> : orders.length === 0 ? (
        <div className="empty">
          <div className="ei">📭</div>
          <p>아직 주문이 없습니다.<br />위 버튼으로 첫 포토북을 주문해보세요!</p>
        </div>
      ) : (
        <div className="orders-grid">
          {orders.map(o => {
            const tmpl = o.template_meta || gallery.find(t => t.uid === o.sweetbook_template_uid);
            return (
              <div key={o.id} className={`order-card s-${o.status}`}>
                <div style={{ display: 'flex', gap: '.75rem', alignItems: 'flex-start' }}>
                  <span className="oc-emoji">{o.country_emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="oc-dest">{o.destination}</div>
                    <div className="oc-title">{o.book_title}</div>
                  </div>
                </div>

                {/* ── 주문 상세: 여행 내용 미리보기 ── */}
                <div className="order-trip-preview">
                  <div className="otp-header">
                    <span style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--ink)' }}>{o.trip_title}</span>
                    {o.trip_days && <span className="card-pill card-pill-days" style={{ fontSize: '.63rem' }}>{o.trip_days}일</span>}
                    <span className="card-pill card-pill-photo" style={{ fontSize: '.63rem' }}>📷 {o.photo_count}</span>
                  </div>
                  {o.trip_description && (
                    <div style={{ fontSize: '.73rem', color: 'var(--ink-soft)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {o.trip_description}
                    </div>
                  )}
                  {o.trip_story && (
                    <div className="otp-story">{o.trip_story}</div>
                  )}
                </div>

                {/* 템플릿 칩 */}
                {tmpl && (
                  <div className="order-tmpl-chip">
                    📖 {tmpl.name} — {tmpl.spec}
                  </div>
                )}

                <div className="oc-meta">
                  <div className="oc-meta-item"><strong>#{o.id}</strong>주문번호</div>
                  <div className="oc-meta-item"><strong>{o.created_at?.substring(0, 10)}</strong>주문일</div>
                </div>

                <span className={`pill pill-${o.status}`}>
                  {o.status === 'pending' && '⏳ '}
                  {o.status === 'processing' && '⚙️ '}
                  {o.status === 'completed' && '✅ '}
                  {o.status === 'cancelled' && '❌ '}
                  {STATUS_LABEL[o.status]}
                </span>

                <div className="order-actions">
                  {STATUS_NEXT[o.status] && (
                    <button className="btn btn-primary btn-sm" onClick={() => handleStatusUpdate(o.id, o.status)}>
                      {STATUS_NEXT_LABEL[o.status]}
                    </button>
                  )}
                  <button className="btn btn-sweetbook btn-sm" onClick={() => handleExport(o)}>
                    📦 Sweetbook 익스포트
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
