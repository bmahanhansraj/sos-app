import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { api, apiErrorMessage } from '../api/client';
import { useSocket } from '../context/SocketContext';
import BeaconBadge from '../components/BeaconBadge';
import { ServiceIcon, serviceIconSvg } from '../components/icons';

const DEFAULT_CENTER = [28.6139, 77.209]; // Delhi

const STATUS_OPTIONS = ['REQUESTED', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'];
const STATUS_COLORS = {
  REQUESTED: '#2196F3',
  ASSIGNED: '#FB8C00',
  EN_ROUTE: '#9C27B0',
  ARRIVED: '#00897B',
  IN_PROGRESS: '#FFA000',
};
const STATUS_LABELS = {
  REQUESTED: 'Requested',
  ASSIGNED: 'Assigned',
  EN_ROUTE: 'En route',
  ARRIVED: 'Arrived',
  IN_PROGRESS: 'In progress',
};

function partnerIcon(isAvailable) {
  const color = isAvailable ? '#43A047' : '#9C9C9C';
  return L.divIcon({
    className: '',
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #121212;box-shadow:0 0 0 2px ${color}55"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function requestIcon(status, iconKey, isSos) {
  const color = STATUS_COLORS[status] || '#9C9C9C';
  const glyphSvg = serviceIconSvg(iconKey, { color: '#FFFFFF', size: 13 });
  // Extract just the inner markup from the glyph's own <svg> so it can be
  // re-embedded inside the pin's coordinate space below.
  const inner = glyphSvg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  const html = `
    <div style="position:relative;width:30px;height:42px;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.45))">
      <svg viewBox="0 0 24 34" width="30" height="42">
        <path d="M12 0C5.4 0 0 5.4 0 12c0 8.7 10.7 19.3 11.4 20a0.9 0.9 0 0 0 1.2 0C13.3 31.3 24 20.7 24 12 24 5.4 18.6 0 12 0z" fill="${color}" stroke="#121212" stroke-width="1"/>
        <circle cx="12" cy="12" r="9" fill="#000000" opacity="0.16"/>
        <g transform="translate(4.7,4.7) scale(0.62)" fill="none" stroke="#FFFFFF" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">${inner}</g>
      </svg>
      ${isSos ? '<div style="position:absolute;top:-3px;right:-2px;width:14px;height:14px;border-radius:50%;background:#E53935;border:1.5px solid #121212;color:#fff;font-size:9px;font-weight:700;line-height:14px;text-align:center">!</div>' : ''}
    </div>
  `;
  return L.divIcon({ className: '', html, iconSize: [30, 42], iconAnchor: [15, 42], popupAnchor: [0, -38] });
}

function Recenter({ partners }) {
  const map = useMap();
  const didCenter = useRef(false);
  useEffect(() => {
    if (!didCenter.current && partners.length > 0) {
      map.setView([partners[0].lat, partners[0].lng], 12);
      didCenter.current = true;
    }
  }, [partners, map]);
  return null;
}

export default function LiveMap() {
  const [partners, setPartners] = useState([]);
  const [activeRequests, setActiveRequests] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [error, setError] = useState('');
  const [serviceFilter, setServiceFilter] = useState(new Set()); // empty = all
  const [statusFilter, setStatusFilter] = useState(new Set()); // empty = all
  const { socket } = useSocket();

  const serviceById = useMemo(() => Object.fromEntries(serviceTypes.map((s) => [s.id, s])), [serviceTypes]);
  const customerById = useMemo(() => Object.fromEntries(customers.map((c) => [c.id, c])), [customers]);

  async function load() {
    try {
      const { data } = await api.get('/admin/live-map');
      setPartners(data.partners);
      setActiveRequests(data.activeRequests);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function loadServiceTypes() {
    try {
      const { data } = await api.get('/catalog/services');
      setServiceTypes(data.serviceTypes);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function loadCustomers() {
    try {
      const { data } = await api.get('/admin/customers');
      setCustomers(data.customers);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  useEffect(() => {
    load();
    loadServiceTypes();
    loadCustomers();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!socket) return;
    function onLocation(payload) {
      setPartners((prev) =>
        prev.map((p) => (p.id === payload.partnerId ? { ...p, lat: payload.lat, lng: payload.lng } : p))
      );
    }
    socket.on('partner:location', onLocation);
    socket.on('request:status', load);
    return () => {
      socket.off('partner:location', onLocation);
      socket.off('request:status', load);
    };
  }, [socket]);

  function toggleService(id) {
    setServiceFilter((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleStatus(status) {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      next.has(status) ? next.delete(status) : next.add(status);
      return next;
    });
  }

  const visibleRequests = activeRequests.filter((r) => {
    if (serviceFilter.size > 0 && !serviceFilter.has(r.serviceTypeId)) return false;
    if (statusFilter.size > 0 && !statusFilter.has(r.status)) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-xl">
        <div className="radar-sweep pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-60" />
        <div className="relative">
          <h1 className="font-display text-2xl font-semibold">Live map</h1>
          <p className="mt-1 text-sm text-muted">
            {partners.length} partner{partners.length === 1 ? '' : 's'} online &middot; {visibleRequests.length} of{' '}
            {activeRequests.length} customer{activeRequests.length === 1 ? '' : 's'} with an active request shown
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="panel space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-muted">Service</span>
          <button
            onClick={() => setServiceFilter(new Set())}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${serviceFilter.size === 0 ? 'border-beacon bg-beacon/15 text-beacon' : 'border-hairline text-muted hover:text-ink'}`}
          >
            All
          </button>
          {serviceTypes.map((s) => {
            const active = serviceFilter.has(s.id);
            return (
              <button
                key={s.id}
                onClick={() => toggleService(s.id)}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition ${active ? 'border-beacon bg-beacon/15 text-beacon' : 'border-hairline text-muted hover:text-ink'}`}
              >
                <ServiceIcon icon={s.icon} width={13} height={13} />
                {s.name}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-muted">Status</span>
          <button
            onClick={() => setStatusFilter(new Set())}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${statusFilter.size === 0 ? 'border-beacon bg-beacon/15 text-beacon' : 'border-hairline text-muted hover:text-ink'}`}
          >
            All
          </button>
          {STATUS_OPTIONS.map((status) => {
            const active = statusFilter.has(status);
            const color = STATUS_COLORS[status];
            return (
              <button
                key={status}
                onClick={() => toggleStatus(status)}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition ${active ? '' : 'border-hairline text-muted hover:text-ink'}`}
                style={active ? { borderColor: color, backgroundColor: `${color}22`, color } : undefined}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                {STATUS_LABELS[status]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="panel overflow-hidden" style={{ height: 560 }}>
        <MapContainer center={DEFAULT_CENTER} zoom={12} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            className="dark-tiles"
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Recenter partners={partners} />

          {partners.map((p) => (
            <Marker key={p.id} position={[p.lat, p.lng]} icon={partnerIcon(p.isAvailable)}>
              <Popup>
                <div className="space-y-1.5 font-body text-sm">
                  <p className="font-medium">Partner &middot; {p.vehicleType.replaceAll('_', ' ')}</p>
                  <p className="text-xs text-muted">Rating {p.avgRating?.toFixed(1) ?? '—'} / 5</p>
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{
                      color: p.isAvailable ? '#43A047' : '#9C9C9C',
                      backgroundColor: p.isAvailable ? '#43A04720' : '#9C9C9C20',
                    }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: p.isAvailable ? '#43A047' : '#9C9C9C' }} />
                    {p.isAvailable ? 'Available' : 'On a job'}
                  </span>
                </div>
              </Popup>
            </Marker>
          ))}

          {visibleRequests.map((r) => (
            <Marker
              key={r.id}
              position={[r.pickupLat, r.pickupLng]}
              icon={requestIcon(r.status, serviceById[r.serviceTypeId]?.icon, r.isSos)}
            >
              <Popup>
                <div className="space-y-1.5 font-body text-sm">
                  <p className="font-mono text-xs">{r.requestNumber}</p>
                  <p className="font-medium">{customerById[r.customerId]?.user?.name || 'Customer'}</p>
                  <p className="flex items-center gap-1.5 text-muted">
                    <ServiceIcon icon={serviceById[r.serviceTypeId]?.icon} width={14} height={14} />
                    {serviceById[r.serviceTypeId]?.name || 'Service'}
                  </p>
                  {r.isSos && <p className="text-xs font-medium text-danger">SOS request</p>}
                  <BeaconBadge status={r.status} />
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#43A047' }} /> Partner available</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-muted" /> Partner busy</span>
        {STATUS_OPTIONS.map((status) => (
          <span key={status} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] }} />
            {STATUS_LABELS[status]}
          </span>
        ))}
        <span className="flex items-center gap-1.5"><span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-danger text-[8px] font-bold text-white">!</span> SOS</span>
      </div>
    </div>
  );
}
