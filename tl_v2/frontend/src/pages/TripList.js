import React, { useState, useEffect, useCallback } from 'react';
import TripForm from '../components/TripForm';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export default function TripList({ onSelect, onGoOrders }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const fetchTrips = useCallback(async () => {
    const res = await fetch(`${API}/api/trips`);
    setTrips(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);

  const handleCreate = async (fd) => {
    await fetch(`${API}/api/trips`, { method: 'POST', body: fd });
    setShowForm(false);
    fetchTrips();
    showToast('✈️ 새 여행이 추가되었습니다!');
  };

  // ── 통계 계산 ──────────────────────────────────────────────
  const totalPhotos = trips.reduce((s, t) => s + (t.photo_count || 0), 0);
  const totalDays = trips.reduce((s, t) => s + (t.trip_days || 0), 0);
  const countrySet = new Set(trips.map(t => t.destination.split(',').pop().trim()));

  const formatDate = (d) => d ? d.substring(0, 7).replace('-', '.') : '—';

  return (
    <>
      {/* 통계 스트립 — 총 여행일수 포함 */}
      <div className="stats">
        <div className="stat-item">
          <div className="stat-val">{trips.length}</div>
          <div className="stat-lbl">여행 기록</div>
        </div>
        <div className="stat-item stat-accent">
          <div className="stat-val">{totalDays || '—'}</div>
          <div className="stat-lbl">총 여행 일수</div>
        </div>
        <div className="stat-item">
          <div className="stat-val">{totalPhotos}</div>
          <div className="stat-lbl">사진</div>
        </div>
        <div className="stat-item">
          <div className="stat-val">{countrySet.size}</div>
          <div className="stat-lbl">나라</div>
        </div>
        <div className="stat-item" style={{ marginLeft: 'auto', justifyContent: 'center' }}>
          <button className="btn btn-primary btn-sm" onClick={onGoOrders}>📦 포토북 주문</button>
        </div>
      </div>

      <h1 className="page-title">나의 <em>여행</em> 기록</h1>
      <p className="page-sub">My Travel Journal — 사진과 이야기로 남긴 순간들</p>

      {loading ? <div className="spinner" /> : (
        <div className="trip-grid">
          <button className="add-card" onClick={() => setShowForm(true)}>
            <span className="add-icon">＋</span>
            <span className="add-lbl">새 여행 기록 추가</span>
          </button>
          {trips.map(t => (
            <div key={t.id} className="trip-card" onClick={() => onSelect(t.id)}>
              <div className="card-cover">
                <span className="card-cover-emoji">{t.country_emoji || '✈️'}</span>
              </div>
              <div className="card-body">
                <div className="card-dest">{t.destination}</div>
                <div className="card-title">{t.title}</div>
                {t.description && <div className="card-desc">{t.description}</div>}
              </div>
              <div className="card-footer">
                <span className="card-date">
                  {formatDate(t.started_at)}{t.ended_at ? ` ~ ${formatDate(t.ended_at)}` : ''}
                </span>
                <div className="card-pills">
                  {t.trip_days && <span className="card-pill card-pill-days">{t.trip_days}일</span>}
                  <span className="card-pill card-pill-photo">📷 {t.photo_count}</span>
                  {t.ai_story && <span className="card-pill card-pill-story">✍️</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && <TripForm onSubmit={handleCreate} onClose={() => setShowForm(false)} />}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
