import React, { useState } from 'react';

const EMOJIS = ['🇯🇵','🇰🇷','🇺🇸','🇫🇷','🇮🇹','🇪🇸','🇵🇹','🇹🇭','🇻🇳','🇮🇩','🇬🇧','🇩🇪','🇦🇺','🇨🇳','🇮🇳','🇲🇽','🇧🇷','🇹🇷','🇬🇷','🇨🇭'];

export default function TripForm({ onSubmit, onClose }) {
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [emoji, setEmoji] = useState('✈️');
  const [startedAt, setStartedAt] = useState('');
  const [endedAt, setEndedAt] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    if (!title.trim() || !destination.trim()) {
      alert('제목과 여행지는 필수입니다');
      return;
    }
    const fd = new FormData();
    fd.append('title', title);
    fd.append('destination', destination);
    fd.append('country_emoji', emoji);
    fd.append('started_at', startedAt);
    fd.append('ended_at', endedAt);
    fd.append('description', description);
    onSubmit(fd);
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-hd">
          <h2>새 여행 기록 추가</h2>
          <button className="modal-x" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="fg full">
              <label>여행 제목 *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="예: 교토의 벚꽃, 그 짧은 봄" />
            </div>
            <div className="fg">
              <label>여행지 *</label>
              <input value={destination} onChange={e => setDestination(e.target.value)} placeholder="예: 교토, 일본" />
            </div>
            <div className="fg">
              <label>국기/이모지</label>
              <div className="emoji-row">
                {EMOJIS.map(e => (
                  <button key={e} type="button"
                    className={`emoji-opt ${emoji === e ? 'sel' : ''}`}
                    onClick={() => setEmoji(e)}>{e}</button>
                ))}
              </div>
            </div>
            <div className="fg">
              <label>출발일</label>
              <input type="date" value={startedAt} onChange={e => setStartedAt(e.target.value)} />
            </div>
            <div className="fg">
              <label>귀국일</label>
              <input type="date" value={endedAt} onChange={e => setEndedAt(e.target.value)} />
            </div>
            <div className="fg full">
              <label>여행 메모</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                placeholder="이번 여행에 대해 간단히 적어보세요" rows={3} />
            </div>
          </div>
        </div>
        <div className="modal-ft">
          <button className="btn btn-secondary" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={handleSubmit}>여행 추가하기</button>
        </div>
      </div>
    </div>
  );
}
