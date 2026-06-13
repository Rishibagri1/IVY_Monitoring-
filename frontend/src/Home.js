import './Home.css';
import airforceLogo from './image.png';

export default function Home() {
  return (
    <div className="home">
      <section className="hero">
        <div className="hero-content">
          <img src={airforceLogo} alt="Indian Air Force" className="airforce-logo" />
          <h1>Indian Air Force Station</h1>
          <h2>Vital Monitoring System</h2>
          <p>Advanced healthcare monitoring for military personnel</p>
        </div>
      </section>
    </div>
  );
}
