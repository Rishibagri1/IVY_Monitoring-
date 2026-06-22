import "./Navigation.css";

export default function Navigation({ theme, setTheme }) {
  return (
    <nav className="navbar">

      <div className="navbar-brand">
        <span className="brand-icon">✈</span>
        <span>IAF Vital Monitoring</span>
      </div>

      <ul className="navbar-menu">
        <li>
          <a href="#/">Home</a>
        </li>

        <li>
          <a href="#/login">Login</a>
        </li>

        <li>
          <a href="#/register">Sign Up</a>
        </li>

        <li className="theme-toggle-li">
          <button 
            className="theme-toggle-btn" 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </li>
      </ul>

    </nav>
  );
}