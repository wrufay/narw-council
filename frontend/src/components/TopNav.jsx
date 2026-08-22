import { NavLink } from 'react-router-dom'

export default function TopNav() {
  return (
    <nav className="narw-nav">
      <NavLink className="narw-nav__brand" to="/">
        NARW COUNCIL
      </NavLink>
      <div className="narw-nav__links">
        <NavLink to="/run/classify" className={({ isActive }) => (isActive ? 'active' : undefined)}>
          Classify
        </NavLink>
        <NavLink to="/run/map" className={({ isActive }) => (isActive ? 'active' : undefined)}>
          Map
        </NavLink>
        <NavLink to="/tutorial" className={({ isActive }) => (isActive ? 'active' : undefined)}>
          Tutorial
        </NavLink>
      </div>
    </nav>
  )
}
