import { Outlet, NavLink } from 'react-router-dom';
import { NAV_SECTIONS } from './nav';
import { useAuth } from '../lib/hooks/useAuth';

export const AppLayout = () => {
  const { role, signOut, profile } = useAuth();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      {/* Sidebar */}
      <aside style={{ width: '250px', borderRight: '1px solid #ccc', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1rem', fontWeight: 'bold', fontSize: '1.2rem', borderBottom: '1px solid #ccc' }}>
          EcoSphere
        </div>
        <nav style={{ flex: 1, padding: '1rem 0' }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {NAV_SECTIONS.filter(section => !section.roles || (role && section.roles.includes(role))).map((section) => (
              <li key={section.path}>
                <NavLink 
                  to={section.path} 
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1rem',
                    textDecoration: 'none',
                    color: isActive ? '#000' : '#666',
                    background: isActive ? '#f0f0f0' : 'transparent'
                  })}
                >
                  <section.icon size={18} />
                  {section.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Topbar */}
        <header style={{ height: '60px', borderBottom: '1px solid #ccc', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 1rem', gap: '1rem' }}>
          {/* Reserved Bell Slot */}
          <div id="reserved-bell-slot">
            <span style={{ fontSize: '0.8rem', color: '#999', border: '1px dashed #ccc', padding: '0.2rem' }}>bell stub</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '0.9rem', color: '#333' }}>
              {profile?.email || 'User'} ({role})
            </span>
            <button onClick={signOut} style={{ padding: '0.4rem 0.8rem', cursor: 'pointer' }}>
              Sign Out
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main style={{ flex: 1, overflow: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
