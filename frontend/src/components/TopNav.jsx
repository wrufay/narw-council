export default function TopNav({ onNavigate }) {
  return (
    <nav className="narw-nav">
      <button className="narw-nav__brand" onClick={() => onNavigate('record')}>
        NARW COUNCIL
      </button>
      <div className="narw-nav__links">
        <button onClick={() => onNavigate('record')}>Record</button>
        <button onClick={() => onNavigate('map')}>Map</button>
        <button onClick={() => onNavigate('history')}>History</button>
        <button onClick={() => onNavigate('tutorial')}>Tutorial</button>
      </div>
    </nav>
  )
}
