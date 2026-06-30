import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../api/client';
import { ServiceIcon } from '../components/icons';
import { useAuth } from '../context/AuthContext';

const EMPTY_SERVICE = { code: '', name: '', basePrice: '', pricePerKm: '', estimatedMins: '', isEmergencySos: false };
const EMPTY_RULE = { serviceTypeId: '', cityId: '', basePrice: '', pricePerKm: '', surgeMultiplier: '1', nightMultiplier: '1', minFare: '' };

export default function Pricing() {
  const { isSuperAdmin } = useAuth();
  const [serviceTypes, setServiceTypes] = useState([]);
  const [cities, setCities] = useState([]);
  const [rules, setRules] = useState([]);
  const [error, setError] = useState('');
  const [newService, setNewService] = useState(EMPTY_SERVICE);
  const [newRule, setNewRule] = useState(EMPTY_RULE);
  const [savingService, setSavingService] = useState(false);
  const [savingRule, setSavingRule] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [editRuleForm, setEditRuleForm] = useState(null);

  async function load() {
    try {
      const [st, ci, pr] = await Promise.all([
        api.get('/admin/catalog/services'),
        api.get('/catalog/cities'),
        api.get('/admin/catalog/pricing-rules'),
      ]);
      setServiceTypes(st.data.serviceTypes);
      setCities(ci.data.cities);
      setRules(pr.data.pricingRules);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  useEffect(() => { load(); }, []);

  async function toggleActive(service) {
    try {
      await api.patch(`/admin/catalog/services/${service.id}`, { isActive: !service.isActive });
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function toggleRuleActive(rule) {
    try {
      await api.patch(`/admin/catalog/pricing-rules/${rule.id}`, { isActive: rule.isActive === false ? true : false });
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  function startEditRule(r) {
    setEditingRuleId(r.id);
    setEditRuleForm({
      basePrice: String(r.basePrice),
      pricePerKm: String(r.pricePerKm ?? 0),
      surgeMultiplier: String(r.surgeMultiplier),
      nightMultiplier: String(r.nightMultiplier),
      minFare: String(r.minFare),
    });
  }

  async function saveRuleEdit() {
    setSavingRule(true);
    try {
      await api.patch(`/admin/catalog/pricing-rules/${editingRuleId}`, {
        basePrice: Number(editRuleForm.basePrice),
        pricePerKm: Number(editRuleForm.pricePerKm),
        surgeMultiplier: Number(editRuleForm.surgeMultiplier),
        nightMultiplier: Number(editRuleForm.nightMultiplier),
        minFare: Number(editRuleForm.minFare),
      });
      setEditingRuleId(null);
      setEditRuleForm(null);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSavingRule(false);
    }
  }

  async function createService(e) {
    e.preventDefault();
    setSavingService(true);
    try {
      await api.post('/admin/catalog/services', {
        code: newService.code.trim().toUpperCase().replaceAll(' ', '_'),
        name: newService.name.trim(),
        basePrice: Number(newService.basePrice),
        pricePerKm: newService.pricePerKm ? Number(newService.pricePerKm) : 0,
        estimatedMins: newService.estimatedMins ? Number(newService.estimatedMins) : 20,
        isEmergencySos: newService.isEmergencySos,
      });
      setNewService(EMPTY_SERVICE);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSavingService(false);
    }
  }

  async function createRule(e) {
    e.preventDefault();
    if (!newRule.serviceTypeId) return;
    setSavingRule(true);
    try {
      await api.post('/admin/catalog/pricing-rules', {
        serviceTypeId: newRule.serviceTypeId,
        cityId: newRule.cityId || undefined,
        basePrice: Number(newRule.basePrice),
        pricePerKm: newRule.pricePerKm ? Number(newRule.pricePerKm) : 0,
        surgeMultiplier: Number(newRule.surgeMultiplier || 1),
        nightMultiplier: Number(newRule.nightMultiplier || 1),
        minFare: newRule.minFare ? Number(newRule.minFare) : 0,
      });
      setNewRule(EMPTY_RULE);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSavingRule(false);
    }
  }

  // Picking a service pre-fills its catalog default base price / per-km
  // rate, so an admin setting up a city-wise or surge rule starts from the
  // existing default rather than a blank field they'd have to look up
  // separately -- they can still adjust it before saving.
  function onRuleServiceChange(serviceTypeId) {
    const service = serviceTypes.find((s) => s.id === serviceTypeId);
    setNewRule((prev) => ({
      ...prev,
      serviceTypeId,
      basePrice: service ? String(service.basePrice) : prev.basePrice,
      pricePerKm: service ? String(service.pricePerKm) : prev.pricePerKm,
    }));
  }

  const serviceNameById = Object.fromEntries(serviceTypes.map((s) => [s.id, s.name]));
  const serviceIconById = Object.fromEntries(serviceTypes.map((s) => [s.id, s.icon]));
  const cityNameById = Object.fromEntries(cities.map((c) => [c.id, c.name]));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">Pricing &amp; catalog</h1>
        <p className="mt-1 text-sm text-muted">Add new service types and configure city-level pricing without a deploy.</p>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <section className="panel p-5">
        <p className="mb-4 text-sm font-medium text-ink">Service catalog</p>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-hairline text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="py-2">Service</th>
              <th className="py-2">Code</th>
              <th className="py-2">Base price</th>
              <th className="py-2">Per km</th>
              <th className="py-2">Active</th>
            </tr>
          </thead>
          <tbody>
            {serviceTypes.map((s) => (
              <tr key={s.id} className="border-b border-hairline last:border-0">
                <td className="py-2.5">
                  <span className="flex items-center gap-2">
                    <ServiceIcon icon={s.icon} width={16} height={16} className="text-muted" />
                    {s.name}
                    {s.isEmergencySos && <span className="rounded bg-danger/15 px-1.5 py-0.5 text-[10px] font-medium text-danger">SOS</span>}
                  </span>
                </td>
                <td className="py-2.5 font-mono text-xs text-muted">{s.code}</td>
                <td className="py-2.5 font-mono text-xs">₹{s.basePrice}</td>
                <td className="py-2.5 font-mono text-xs">₹{s.pricePerKm}/km</td>
                <td className="py-2.5">
                  {isSuperAdmin ? (
                    <button
                      onClick={() => toggleActive(s)}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${s.isActive ? 'bg-ok/15 text-ok' : 'bg-muted/15 text-muted'}`}
                    >
                      {s.isActive ? 'Active' : 'Disabled'}
                    </button>
                  ) : (
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${s.isActive ? 'bg-ok/15 text-ok' : 'bg-muted/15 text-muted'}`}>
                      {s.isActive ? 'Active' : 'Disabled'}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {isSuperAdmin && (
          <form onSubmit={createService} className="mt-5 grid grid-cols-2 gap-3 border-t border-hairline pt-4 lg:grid-cols-5">
            <input required value={newService.name} onChange={(e) => setNewService({ ...newService, name: e.target.value })} placeholder="Service name" className="rounded-lg border border-hairline bg-panel-raised px-2.5 py-2 text-sm outline-none focus:border-live" />
            <input required value={newService.code} onChange={(e) => setNewService({ ...newService, code: e.target.value })} placeholder="CODE" className="rounded-lg border border-hairline bg-panel-raised px-2.5 py-2 font-mono text-sm outline-none focus:border-live" />
            <input required type="number" min="0" value={newService.basePrice} onChange={(e) => setNewService({ ...newService, basePrice: e.target.value })} placeholder="Base price" className="rounded-lg border border-hairline bg-panel-raised px-2.5 py-2 text-sm outline-none focus:border-live" />
            <input type="number" min="0" value={newService.pricePerKm} onChange={(e) => setNewService({ ...newService, pricePerKm: e.target.value })} placeholder="Price / km" className="rounded-lg border border-hairline bg-panel-raised px-2.5 py-2 text-sm outline-none focus:border-live" />
            <button type="submit" disabled={savingService} className="rounded-lg bg-beacon px-3 py-2 text-sm font-medium text-void disabled:opacity-50">
              {savingService ? 'Adding...' : 'Add service'}
            </button>
          </form>
        )}
      </section>

      <section className="panel p-5">
        <p className="mb-4 text-sm font-medium text-ink">City pricing rules &amp; surge</p>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-hairline text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="py-2">Service</th>
              <th className="py-2">City</th>
              <th className="py-2">Base</th>
              <th className="py-2">Per km</th>
              <th className="py-2">Surge</th>
              <th className="py-2">Night</th>
              <th className="py-2">Min fare</th>
              <th className="py-2">Active</th>
              {isSuperAdmin && <th className="py-2"></th>}
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => {
              const editing = editingRuleId === r.id;
              return (
                <tr key={r.id} className="border-b border-hairline last:border-0">
                  <td className="py-2.5">
                    <span className="flex items-center gap-2">
                      <ServiceIcon icon={serviceIconById[r.serviceTypeId]} width={15} height={15} className="text-muted" />
                      {serviceNameById[r.serviceTypeId] || '—'}
                    </span>
                  </td>
                  <td className="py-2.5 text-muted">{r.cityId ? cityNameById[r.cityId] || '—' : 'All cities'}</td>
                  {editing ? (
                    <>
                      <td className="py-1.5"><input type="number" min="0" value={editRuleForm.basePrice} onChange={(e) => setEditRuleForm({ ...editRuleForm, basePrice: e.target.value })} className="w-20 rounded border border-hairline bg-panel-raised px-1.5 py-1 text-xs outline-none focus:border-live" /></td>
                      <td className="py-1.5"><input type="number" min="0" value={editRuleForm.pricePerKm} onChange={(e) => setEditRuleForm({ ...editRuleForm, pricePerKm: e.target.value })} className="w-16 rounded border border-hairline bg-panel-raised px-1.5 py-1 text-xs outline-none focus:border-live" /></td>
                      <td className="py-1.5"><input type="number" min="0" step="0.05" value={editRuleForm.surgeMultiplier} onChange={(e) => setEditRuleForm({ ...editRuleForm, surgeMultiplier: e.target.value })} className="w-16 rounded border border-hairline bg-panel-raised px-1.5 py-1 text-xs outline-none focus:border-live" /></td>
                      <td className="py-1.5"><input type="number" min="0" step="0.05" value={editRuleForm.nightMultiplier} onChange={(e) => setEditRuleForm({ ...editRuleForm, nightMultiplier: e.target.value })} className="w-16 rounded border border-hairline bg-panel-raised px-1.5 py-1 text-xs outline-none focus:border-live" /></td>
                      <td className="py-1.5"><input type="number" min="0" value={editRuleForm.minFare} onChange={(e) => setEditRuleForm({ ...editRuleForm, minFare: e.target.value })} className="w-20 rounded border border-hairline bg-panel-raised px-1.5 py-1 text-xs outline-none focus:border-live" /></td>
                    </>
                  ) : (
                    <>
                      <td className="py-2.5 font-mono text-xs">₹{r.basePrice}</td>
                      <td className="py-2.5 font-mono text-xs">₹{r.pricePerKm ?? 0}/km</td>
                      <td className="py-2.5 font-mono text-xs">{r.surgeMultiplier}x</td>
                      <td className="py-2.5 font-mono text-xs">{r.nightMultiplier}x</td>
                      <td className="py-2.5 font-mono text-xs">₹{r.minFare}</td>
                    </>
                  )}
                  <td className="py-2.5">
                    {isSuperAdmin ? (
                      <button onClick={() => toggleRuleActive(r)} className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.isActive !== false ? 'bg-ok/15 text-ok' : 'bg-muted/15 text-muted'}`}>
                        {r.isActive !== false ? 'Active' : 'Disabled'}
                      </button>
                    ) : (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.isActive !== false ? 'bg-ok/15 text-ok' : 'bg-muted/15 text-muted'}`}>
                        {r.isActive !== false ? 'Active' : 'Disabled'}
                      </span>
                    )}
                  </td>
                  {isSuperAdmin && (
                    <td className="py-2.5">
                      {editing ? (
                        <div className="flex gap-2">
                          <button onClick={saveRuleEdit} disabled={savingRule} className="text-xs text-beacon hover:underline disabled:opacity-50">Save</button>
                          <button onClick={() => { setEditingRuleId(null); setEditRuleForm(null); }} className="text-xs text-muted hover:text-ink">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => startEditRule(r)} className="text-xs text-muted hover:text-ink">Edit</button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
            {rules.length === 0 && (
              <tr><td colSpan={isSuperAdmin ? 9 : 8} className="py-6 text-center text-sm text-muted">No city-specific rules yet &mdash; default catalog pricing applies everywhere.</td></tr>
            )}
          </tbody>
        </table>

        {isSuperAdmin && (
          <form onSubmit={createRule} className="mt-5 grid grid-cols-2 gap-3 border-t border-hairline pt-4 lg:grid-cols-8">
            <select required value={newRule.serviceTypeId} onChange={(e) => onRuleServiceChange(e.target.value)} className="rounded-lg border border-hairline bg-panel-raised px-2.5 py-2 text-sm outline-none focus:border-live">
              <option value="">Service...</option>
              {serviceTypes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={newRule.cityId} onChange={(e) => setNewRule({ ...newRule, cityId: e.target.value })} className="rounded-lg border border-hairline bg-panel-raised px-2.5 py-2 text-sm outline-none focus:border-live">
              <option value="">All cities</option>
              {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input required type="number" min="0" value={newRule.basePrice} onChange={(e) => setNewRule({ ...newRule, basePrice: e.target.value })} placeholder="Base price" title="Pre-filled from the service's default base price" className="rounded-lg border border-hairline bg-panel-raised px-2.5 py-2 text-sm outline-none focus:border-live" />
            <input type="number" min="0" value={newRule.pricePerKm} onChange={(e) => setNewRule({ ...newRule, pricePerKm: e.target.value })} placeholder="Price / km" title="Pre-filled from the service's default per-km rate" className="rounded-lg border border-hairline bg-panel-raised px-2.5 py-2 text-sm outline-none focus:border-live" />
            <input type="number" min="0" step="0.05" value={newRule.surgeMultiplier} onChange={(e) => setNewRule({ ...newRule, surgeMultiplier: e.target.value })} placeholder="Surge x" title="Heavy-demand surge multiplier" className="rounded-lg border border-hairline bg-panel-raised px-2.5 py-2 text-sm outline-none focus:border-live" />
            <input type="number" min="0" step="0.05" value={newRule.nightMultiplier} onChange={(e) => setNewRule({ ...newRule, nightMultiplier: e.target.value })} placeholder="Night x" title="Night-hours multiplier" className="rounded-lg border border-hairline bg-panel-raised px-2.5 py-2 text-sm outline-none focus:border-live" />
            <input type="number" min="0" value={newRule.minFare} onChange={(e) => setNewRule({ ...newRule, minFare: e.target.value })} placeholder="Min fare" className="rounded-lg border border-hairline bg-panel-raised px-2.5 py-2 text-sm outline-none focus:border-live" />
            <button type="submit" disabled={savingRule} className="rounded-lg bg-beacon px-3 py-2 text-sm font-medium text-void disabled:opacity-50">
              {savingRule ? 'Adding...' : 'Add rule'}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
