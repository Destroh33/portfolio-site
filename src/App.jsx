import { useState, useCallback } from 'react'
import GameCanvas from './components/GameCanvas'
import InfoModal from './components/InfoModal'
import HUD from './components/HUD'

function NavBar({ room, onNav }) {
  return (
    <nav className="nav-bar">
      <span className="nav-logo pixel-font">KT</span>
      <div className="nav-links">
        <button className={`nav-btn pixel-font${room === 'home'     ? ' active' : ''}`} onClick={() => onNav('home')}>HOME</button>
        <button className={`nav-btn pixel-font${room === 'projects' ? ' active' : ''}`} onClick={() => onNav('projects')}>PROJECTS</button>
        <button className={`nav-btn pixel-font${room === 'art'      ? ' active' : ''}`} onClick={() => onNav('art')}>ART</button>
      </div>
    </nav>
  )
}

export default function App() {
  const [room,  setRoom]  = useState('home')
  const [modal, setModal] = useState(null)

  const handleOpenModal  = useCallback((data) => setModal(data), [])
  const handleCloseModal = useCallback(()     => setModal(null), [])
  const handleRoomChange = useCallback((r)    => setRoom(r),     [])

  const paused = !!modal

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#c4bdb4' }}>
      <div className="rotate-overlay">
        <div className="rotate-icon">&#8635;</div>
        <div>ROTATE YOUR PHONE</div>
        <div className="rotate-sub">THIS SITE IS LANDSCAPE ONLY</div>
      </div>
      <NavBar room={room} onNav={setRoom} />
      <GameCanvas
        room={room}
        onRoomChange={handleRoomChange}
        onOpenModal={handleOpenModal}
        paused={paused}
      />
      <HUD />
      {modal && <InfoModal data={modal} onClose={handleCloseModal} />}
    </div>
  )
}
