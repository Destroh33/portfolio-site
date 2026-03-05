import { useState, useCallback } from 'react'
import GameCanvas from './components/GameCanvas'
import InfoModal from './components/InfoModal'
import MiniGame from './components/MiniGame'
import HUD from './components/HUD'

export default function App() {
  const [modal, setModal] = useState(null)   // { type, entity }
  const [miniGame, setMiniGame] = useState(false)
  const [zone, setZone] = useState('')

  const handleOpenModal = useCallback((data) => setModal(data), [])
  const handleOpenMiniGame = useCallback(() => setMiniGame(true), [])
  const handleZoneChange = useCallback((z) => setZone(z), [])
  const handleCloseModal = useCallback(() => setModal(null), [])
  const handleCloseMiniGame = useCallback(() => setMiniGame(false), [])

  const paused = !!modal || miniGame

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#050310' }}>
      <GameCanvas
        onOpenModal={handleOpenModal}
        onOpenMiniGame={handleOpenMiniGame}
        onZoneChange={handleZoneChange}
        paused={paused}
      />
      <HUD zone={zone} />
      {modal && <InfoModal data={modal} onClose={handleCloseModal} />}
      {miniGame && <MiniGame onClose={handleCloseMiniGame} />}
    </div>
  )
}
