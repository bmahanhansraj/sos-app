import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { IconGrid, IconMap, IconList, IconUsers, IconTag, IconLogout, IconBuilding, IconShield, IconBell, IconGeofence, IconAudit, IconTrigger } from './icons';

const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: IconGrid },
  { to: '/live-map', label: 'Live map', icon: IconMap },
  { to: '/requests', label: 'Requests', icon: IconList },
  { to: '/partners', label: 'Partners', icon: IconUsers },
  { to: '/users', label: 'Users', icon: IconUsers },
  { to: '/fleets', label: 'Fleets', icon: IconBuilding },
  { to: '/cities', label: 'Cities', icon: IconGeofence },
  { to: '/pricing', label: 'Pricing', icon: IconTag },
  { to: '/notifications', label: 'Notifications', icon: IconBell },
  { to: '/notification-rules', label: 'Triggers', icon: IconTrigger },
  { to: '/team', label: 'Team', icon: IconShield, superAdminOnly: true },
  { to: '/audit-logs', label: 'Audit log', icon: IconAudit, superAdminOnly: true },
];

export default function Layout() {
  const { user, logout, isSuperAdmin } = useAuth();
  const { connected } = useSocket();
  const visibleNavItems = NAV_ITEMS.filter((item) => !item.superAdminOnly || isSuperAdmin);

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 flex-shrink-0 flex-col border-r border-hairline bg-panel">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <img src="/logo-dark.png" alt="SoS" className="h-8 w-auto" />
          <p className="font-logo text-[11px] font-bold uppercase tracking-wide leading-tight text-muted">
            Dispatch<br />Console
          </p>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {visibleNavItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-beacon/10 text-beacon font-medium'
                    : 'text-muted hover:bg-panel-raised hover:text-ink'
                }`
              }
            >
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-hairline px-4 py-4">
          <div className="mb-3 flex items-center gap-2 text-xs">
            <span className={`beacon-dot ${connected ? 'is-live bg-live' : 'bg-muted'}`} />
            <span className="text-muted">{connected ? 'Live feed connected' : 'Reconnecting...'}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user?.name || 'Admin'}</p>
              <p className="truncate text-xs text-muted">{user?.phone}</p>
            </div>
            <button
              onClick={logout}
              className="rounded-md p-2 text-muted hover:bg-panel-raised hover:text-ink"
              aria-label="Log out"
            >
              <IconLogout />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-void px-8 py-6">
        <Outlet />
      </main>
    </div>
  );
}
