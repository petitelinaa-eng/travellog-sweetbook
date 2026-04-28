import React, { useState, useEffect, useCallback, useRef } from 'react';
import OrderModal from '../components/OrderModal';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const EMOJIS = ['🇯🇵','🇰🇷','🇺🇸','🇫🇷','🇮🇹','🇪🇸','🇵🇹','🇹🇭','🇻🇳','🇮🇩','🇬🇧','🇩🇪','🇦🇺','🇨🇳','🇮🇳','🇲🇽','🇧🇷','🇹🇷','🇬🇷','🇨🇭'];

export default function TripDetail({ tripId, onBack, onGoOrders }) {
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [genLoading, setGenLoading] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [toast, setToast] = useState('');
  const fileRef = useRef();

  // ── 여행 수정 모달 state ──────────────────────────────────
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});

  // ── 사진 인라인 편집 state ───────────────────────────────
  const [editingPhotoId, setEditingPhotoId] = useState(null);
  const [photoEditForm, setPhotoEditForm] = useState({ caption: '', location: '' });

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const fetchTrip = useCallback(async () => {
    const res = await fetch(`${API}/api/trips/${tripId}`);
    const data = await res.json();
    setTrip(data);
    setLoading(false);
  }, [tripId]);

  useEffect(() => { fetchTrip(); }, [fetchTrip]);

  // ── 여행 수정 ─────────────────────────────────────────────
  const openEditModal = () => {
    setEditForm({
      title: trip.title,
      destination: trip.destination,
      country_emoji: trip.country_emoji || '✈️',
      started_at: trip.started_at || '',
      ended_at: trip.ended_at || '',
      description: trip.description || '',
    });
    setShowEditModal(true);
  };

  const handleSaveTrip = async () => {
    const res = await fetch(`${API}/api/trips/${tripId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      setShowEditModal(false);
      fetchTrip();
      showToast('✅ 여행 정보가 수정되었습니다');
    }
  };

  // ── AI 여행기 ─────────────────────────────────────────────
  const handleGenerateStory = async () => {
    setGenLoading(true);
    try {
      const res = await fetch(`${API}/api/trips/${tripId}/generate-story`, { method: 'POST' });
      const data = await res.json();
      setTrip(prev => ({ ...prev, ai_story: data.story }));
      showToast('✨ AI 여행기가 생성되었습니다!');
    } catch { showToast('❌ 생성에 실패했습니다'); }
    setGenLoading(false);
  };

  // ── 사진 멀티 업로드 ──────────────────────────────────────
  const handleUploadPhotos = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    showToast(`📷 ${files.length}장 업로드 중...`);
    const fd = new FormData();
    files.forEach(f => fd.append('files', f));
    await fetch(`${API}/api/trips/${tripId}/photos`, { method: 'POST', body: fd });
    fetchTrip();
    showToast(`✅ 사진 ${files.length}장이 추가되었습니다`);
    e.target.value = '';
  };

  // ── 사진 인라인 편집 ──────────────────────────────────────
  const openPhotoEdit = (photo) => {
    setEditingPhotoId(photo.id);
    setPhotoEditForm({ caption: photo.caption || '', location: photo.location || '' });
  };

  const handleSavePhoto = async (photoId) => {
    await fetch(`${API}/api/photos/${photoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(photoEditForm),
    });
    setEditingPhotoId(null);
    fetchTrip();
    showToast('✅ 사진 정보가 수정되었습니다');
  };

  // ── 사진 삭제 ─────────────────────────────────────────────
  const handleDeletePhoto = async (photoId) => {
    if (!window.confirm('이 사진을 삭제하시겠습니까?')) return;
    await fetch(`${API}/api/photos/${photoId}`, { method: 'DELETE' });
    fetchTrip();
    showToast('🗑️ 사진을 삭제했습니다');
  };

  const handleDeleteTrip = async () => {
    if (!window.confirm(`"${trip.title}" 여행 기록을 삭제하시겠습니까?`)) return;
    await fetch(`${API}/api/trips/${tripId}`, { method: 'DELETE' });
    onBack();
  };

  const handleOrderCreated = () => {
    setShowOrderModal(false);
    showToast('📦 포토북 주문이 접수되었습니다!');
    setTimeout(onGoOrders, 800);
  };

  if (loading) return <div className="spinner" style={{ marginTop: '4rem' }} />;
  if (!trip) return <div className="empty"><div className="ei">😕</div><p>여행을 찾을 수 없습니다</p></div>;

  const coverPhoto = trip.photos?.find(p => p.filename !== '__placeholder__');

  return (
    <>
      <button className="back-btn" onClick={onBack}>← 목록으로</button>

      <div className="detail-hero">
        {coverPhoto && <img src={`${API}/uploads/${coverPhoto.filename}`} alt="cover" />}
        {coverPhoto && <div className="detail-hero-overlay" />}
        <span className="detail-hero-emoji">{trip.country_emoji || '✈️'}</span>
      </div>

      <div className="detail-layout">
        {/* ── 메인 ── */}
        <div>
          <div style={{ fontSize: '.7rem', textTransform: 'uppercase', letterSpacing: '.11em', color: 'var(--terra)', marginBottom: '.3rem' }}>
            {trip.destination}
          </div>
          <h1 className="page-title" style={{ marginBottom: '.7rem' }}>{trip.title}</h1>

          <div className="meta-row">
            {trip.started_at && (
              <div className="meta-item"><label>출발일</label><div className="mv">{trip.started_at}</div></div>
            )}
            {trip.ended_at && (
              <div className="meta-item"><label>귀국일</label><div className="mv">{trip.ended_at}</div></div>
            )}
            {trip.trip_days && (
              <div className="meta-item"><label>여행 기간</label><div className="mv mv-accent">{trip.trip_days}일</div></div>
            )}
            <div className="meta-item"><label>사진</label><div className="mv">{trip.photos?.length || 0}장</div></div>
          </div>

          {trip.description && (
            <p style={{ fontSize: '.88rem', color: 'var(--ink-mid)', lineHeight: 1.85 }}>{trip.description}</p>
          )}

          {/* AI Story */}
          <div className="story-box">
            <div className="story-hd">
              <div className="story-hd-title">✍️ AI 여행기</div>
              <button className="btn btn-teal btn-sm" onClick={handleGenerateStory} disabled={genLoading}>
                {genLoading ? '✨ 생성 중...' : trip.ai_story ? '🔄 다시 생성' : '✨ AI로 생성'}
              </button>
            </div>
            {trip.ai_story ? (
              <p className="story-text">{trip.ai_story}</p>
            ) : (
              <div className="story-ph">
                <div className="ph-icon">📝</div>
                <p>AI 버튼을 눌러 감성적인 여행기를 자동 생성해보세요!</p>
              </div>
            )}
          </div>

          {/* Photos */}
          <div className="photo-section">
            <div className="section-title">
              <span>📷 여행 사진 ({trip.photos?.length || 0})</span>
              <button className="btn btn-secondary btn-sm" onClick={() => fileRef.current.click()}>
                + 사진 추가 (멀티)
              </button>
            </div>
            <input
              ref={fileRef} type="file" accept="image/*"
              multiple                               // ← 멀티 업로드
              style={{ display: 'none' }}
              onChange={handleUploadPhotos}
            />
            <div className="photo-grid">
              <button className="add-photo" onClick={() => fileRef.current.click()}>
                <span>＋</span><span>사진 추가</span>
              </button>
              {trip.photos?.map(p => (
                <div key={p.id}>
                  {/* 인라인 편집 모드 */}
                  {editingPhotoId === p.id ? (
                    <div className="photo-inline-edit">
                      <div className="pie-row">
                        <span style={{ fontSize: '.65rem', color: 'var(--ink-soft)', whiteSpace: 'nowrap' }}>캡션</span>
                        <input
                          value={photoEditForm.caption}
                          onChange={e => setPhotoEditForm(f => ({ ...f, caption: e.target.value }))}
                          placeholder="사진 설명"
                        />
                      </div>
                      <div className="pie-row">
                        <span style={{ fontSize: '.65rem', color: 'var(--ink-soft)', whiteSpace: 'nowrap' }}>위치</span>
                        <input
                          value={photoEditForm.location}
                          onChange={e => setPhotoEditForm(f => ({ ...f, location: e.target.value }))}
                          placeholder="촬영 장소"
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '.35rem' }}>
                        <button className="btn btn-primary btn-xs" onClick={() => handleSavePhoto(p.id)}>저장</button>
                        <button className="btn btn-secondary btn-xs" onClick={() => setEditingPhotoId(null)}>취소</button>
                      </div>
                    </div>
                  ) : (
                    <div className="photo-thumb">
                      {p.filename !== '__placeholder__'
                        ? <img src={`${API}/uploads/${p.filename}`} alt={p.caption || ''} />
                        : (
                          <div className="photo-ph">
                            <span className="ph-e">🗺️</span>
                            <span>{p.caption}</span>
                          </div>
                        )}
                      <div className="photo-overlay">
                        <div className="photo-caption-text">{p.caption}{p.location ? ` · ${p.location}` : ''}</div>
                      </div>
                      <div className="photo-actions">
                        <button className="photo-btn photo-btn-edit" title="편집" onClick={() => openPhotoEdit(p)}>✏️</button>
                        <button className="photo-btn" title="삭제" onClick={() => handleDeletePhoto(p.id)}>✕</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── 사이드바 ── */}
        <div>
          <div className="sidebar-card">
            <h3>📚 포토북으로 만들기</h3>
            <div className="book-preview">
              <span className="bp-emoji">{trip.country_emoji || '✈️'}</span>
              <div className="bp-title">{trip.title}</div>
            </div>
            <p style={{ fontSize: '.8rem', color: 'var(--ink-soft)', marginBottom: '.9rem', lineHeight: 1.75 }}>
              이 여행을 한 권의 포토북으로 제작 주문하세요.<br />Sweetbook API로 실제 인쇄물을 만들 수 있습니다.
            </p>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => setShowOrderModal(true)}>
              이 여행을 책으로 주문하기 →
            </button>
          </div>

          {/* 여행 정보 + 수정 */}
          <div className="sidebar-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.9rem' }}>
              <h3 style={{ margin: 0 }}>🗓️ 여행 정보</h3>
              <button className="btn btn-secondary btn-sm" onClick={openEditModal}>✏️ 수정</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.7rem' }}>
              <div className="meta-item"><label>여행지</label><div className="mv">{trip.destination}</div></div>
              {trip.started_at && (
                <div className="meta-item">
                  <label>기간</label>
                  <div className="mv">
                    {trip.started_at}{trip.ended_at ? ` ~ ${trip.ended_at}` : ''}
                    {trip.trip_days ? <span className="mv-accent" style={{ marginLeft: '.5rem' }}>({trip.trip_days}일)</span> : ''}
                  </div>
                </div>
              )}
              <div className="meta-item"><label>생성일</label><div className="mv">{trip.created_at?.substring(0, 10)}</div></div>
            </div>
            <button className="btn btn-danger btn-sm" style={{ marginTop: '1.1rem' }} onClick={handleDeleteTrip}>
              여행 기록 삭제
            </button>
          </div>
        </div>
      </div>

      {/* ── 여행 수정 모달 ── */}
      {showEditModal && (
        <div className="overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-hd">
              <h2>✏️ 여행 정보 수정</h2>
              <button className="modal-x" onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="fg full">
                  <label>여행 제목</label>
                  <input value={editForm.title || ''} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} />
                </div>
                <div className="fg">
                  <label>여행지</label>
                  <input value={editForm.destination || ''} onChange={e => setEditForm(f => ({ ...f, destination: e.target.value }))} />
                </div>
                <div className="fg">
                  <label>국기/이모지</label>
                  <div className="emoji-row">
                    {EMOJIS.map(em => (
                      <button key={em} type="button"
                        className={`emoji-opt ${editForm.country_emoji === em ? 'sel' : ''}`}
                        onClick={() => setEditForm(f => ({ ...f, country_emoji: em }))}>{em}</button>
                    ))}
                  </div>
                </div>
                <div className="fg">
                  <label>출발일</label>
                  <input type="date" value={editForm.started_at || ''} onChange={e => setEditForm(f => ({ ...f, started_at: e.target.value }))} />
                </div>
                <div className="fg">
                  <label>귀국일</label>
                  <input type="date" value={editForm.ended_at || ''} onChange={e => setEditForm(f => ({ ...f, ended_at: e.target.value }))} />
                </div>
                <div className="fg full">
                  <label>여행 메모</label>
                  <textarea value={editForm.description || ''} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={3} />
                </div>
              </div>
            </div>
            <div className="modal-ft">
              <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>취소</button>
              <button className="btn btn-primary" onClick={handleSaveTrip}>저장</button>
            </div>
          </div>
        </div>
      )}

      {showOrderModal && (
        <OrderModal trip={trip} onClose={() => setShowOrderModal(false)} onCreated={handleOrderCreated} />
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
