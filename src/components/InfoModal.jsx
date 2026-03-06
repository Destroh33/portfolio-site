import { useState, useEffect } from 'react'

function useTypewriter(text, speed = 18) {
  const [out, setOut] = useState('')
  useEffect(() => {
    setOut('')
    if (!text) return
    let i = 0
    const id = setInterval(() => {
      i++
      setOut(text.slice(0, i))
      if (i >= text.length) clearInterval(id)
    }, speed)
    return () => clearInterval(id)
  }, [text, speed])
  return out
}

function SkillBar({ name, value }) {
  const [w, setW] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setW(value), 80)
    return () => clearTimeout(t)
  }, [value])
  return (
    <div className="skill-row">
      <span className="skill-name">{name}</span>
      <div className="skill-bar-track">
        <div className="skill-bar-fill" style={{ width: `${w}%` }} />
      </div>
      <span className="skill-num">{value}</span>
    </div>
  )
}

function StatContent({ data }) {
  return (
    <div className="stat-sheet">
      <div className="stat-header">
        <img src="/images/gcprofile.png" alt="Krishna" className="stat-portrait" style={{ width: 110, height: 110 }} />
        <div>
          <div className="stat-name">KRISHNA THOLUDUR</div>
          <div className="stat-class">
            LVL 21 · CS @ UCLA<br />
            CLASS: Game Developer<br />
            GUILD: ACM Studio
          </div>
        </div>
      </div>
      <p className="stat-bio">
        I'm a CS student at UCLA who likes to make games and other weird interactive
        software. Currently working on Prime Weaver and Rebel Stars.
      </p>
      <div>
        <div className="skills-title">SKILLS</div>
        {data.skills.map(s => <SkillBar key={s.name} name={s.name} value={s.value} />)}
      </div>
      <div className="stat-links">
        <a href="https://github.com/Destroh33" className="rpg-btn" target="_blank" rel="noreferrer">GITHUB</a>
        <a href="https://www.linkedin.com/in/krishna-tholudur-5b90a5330/" className="rpg-btn purple" target="_blank" rel="noreferrer">LINKEDIN</a>
        <a href="https://destroh3.itch.io/" className="rpg-btn green" target="_blank" rel="noreferrer">ITCH.IO</a>
        <a href="/KrishnaTholudurResume.pdf" className="rpg-btn" download>RESUME ↓</a>
      </div>
    </div>
  )
}

function QuestContent({ data }) {
  const typed = useTypewriter(data.description)
  const done  = typed.length >= data.description.length
  return (
    <div className="quest-sheet">
      <span className={`quest-status-badge ${data.status}`}>
        {data.status === 'active' ? '★ ACTIVE QUEST' : '✓ COMPLETED'}
      </span>
      <h2 className="quest-title">{data.name}</h2>
      <p className="quest-desc">
        {typed}
        {!done && <span className="cursor-blink" />}
      </p>
      <div className="quest-tags">
        {data.tags.map(t => <span key={t} className="tag">{t}</span>)}
      </div>
      {data.embed && (
        <div className="quest-media--video">
          <iframe src={data.embed} frameBorder="0" allowFullScreen title={data.name} />
        </div>
      )}
      {data.image && !data.embed && (
        <div className="quest-media--image">
          <img src={data.image} alt={data.name} />
        </div>
      )}
      <div className="quest-links">
        {data.github     && <a href={data.github}     className="rpg-btn"        target="_blank" rel="noreferrer">GITHUB</a>}
        {data.play       && <a href={data.play}        className="rpg-btn green"  target="_blank" rel="noreferrer">PLAY DEMO</a>}
        {data.itch       && <a href={data.itch}        className="rpg-btn green"  target="_blank" rel="noreferrer">VIEW ON ITCH</a>}
        {data.slidesLink && <a href={data.slidesLink}  className="rpg-btn purple" target="_blank" rel="noreferrer">FULL SLIDES</a>}
      </div>
    </div>
  )
}

function ArtContent({ data }) {
  return (
    <div className="art-sheet">
      <div className="art-image-wrap">
        <img src={data.src} alt={data.caption} />
      </div>
      <p className="art-caption">{data.caption}</p>
    </div>
  )
}

export default function InfoModal({ data, onClose }) {
  const { type, entity } = data

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' || e.key === 'e' || e.key === 'E') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel rpg-box" onClick={e => e.stopPropagation()}>
        <div className="modal-top-bar">
          <button className="modal-close pixel-font" onClick={onClose} aria-label="Close">X</button>
        </div>
        <div className="modal-body">
          {type === 'stat'  && <StatContent  data={entity.data} />}
          {type === 'quest' && <QuestContent data={entity.data} />}
          {type === 'art'   && <ArtContent   data={entity.data} />}
        </div>
      </div>
    </div>
  )
}
