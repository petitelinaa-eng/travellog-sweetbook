import React, { useState } from 'react';
import TripList from './pages/TripList';
import TripDetail from './pages/TripDetail';
import OrdersPage from './pages/OrdersPage';
import './App.css';

export default function App() {
  const [page, setPage] = useState('list');
  const [tripId, setTripId] = useState(null);

  const goDetail = (id) => { setTripId(id); setPage('detail'); };
  const goList   = () => { setTripId(null); setPage('list'); };
  const goOrders = () => setPage('orders');

  return (
    <div className="app">
      <header className="hdr">
        <div className="hdr-inner">
          <div className="logo" onClick={goList}>
            <div className="logo-icon">✈</div>
            <div>
              <div className="logo-name">TravelLog</div>
              <div className="logo-sub">나의 여행을 포토북으로</div>
            </div>
          </div>
          <nav className="nav">
            <button className={`nav-btn ${page !== 'orders' ? 'active' : ''}`} onClick={goList}>여행 기록</button>
            <button className={`nav-btn ${page === 'orders' ? 'active' : ''}`} onClick={goOrders}>📦 포토북 주문</button>
          </nav>
        </div>
      </header>

      <main className="main">
        {page === 'list'   && <TripList onSelect={goDetail} onGoOrders={goOrders} />}
        {page === 'detail' && <TripDetail tripId={tripId} onBack={goList} onGoOrders={goOrders} />}
        {page === 'orders' && <OrdersPage />}
      </main>
    </div>
  );
}
