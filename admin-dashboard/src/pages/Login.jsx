import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { requestOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState('phone'); // 'phone' | 'code'
  const [phone, setPhone] = useState('+91');
  const [code, setCode] = useState('');
  const [debugOtp, setDebugOtp] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleRequestOtp(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const result = await requestOtp(phone.trim());
    setBusy(false);
    if (!result.ok) return setError(result.error);
    setDebugOtp(result.debugOtp || null);
    setStep('code');
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const result = await verifyOtp(phone.trim(), code.trim());
    setBusy(false);
    if (!result.ok) return setError(result.error);
    navigate('/', { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-void px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <img src="/logo-dark.png" alt="SoS - Services On Site" className="h-16 w-auto" />
          <p className="mt-3 text-sm text-muted">Dispatch console &middot; Admin sign-in</p>
        </div>

        <div className="panel p-6">
          {step === 'phone' ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label htmlFor="phone" className="mb-1.5 block text-sm text-muted">
                  Admin phone number
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+911234500000"
                  className="w-full rounded-lg border border-hairline bg-panel-raised px-3 py-2.5 font-mono text-sm text-ink outline-none focus:border-live"
                  required
                />
              </div>
              {error && <p className="text-sm text-danger">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg bg-beacon px-3 py-2.5 text-sm font-medium text-void transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {busy ? 'Sending code...' : 'Send OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label htmlFor="code" className="mb-1.5 block text-sm text-muted">
                  Enter the 6-digit code sent to {phone}
                </label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="••••••"
                  className="w-full rounded-lg border border-hairline bg-panel-raised px-3 py-2.5 font-mono text-lg tracking-widest text-ink outline-none focus:border-live"
                  autoFocus
                  required
                />
                {debugOtp && (
                  <p className="mt-2 rounded-md bg-beacon/10 px-2.5 py-1.5 text-xs text-beacon">
                    Demo mode &mdash; your code is <span className="font-mono">{debugOtp}</span>
                  </p>
                )}
              </div>
              {error && <p className="text-sm text-danger">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg bg-beacon px-3 py-2.5 text-sm font-medium text-void transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {busy ? 'Verifying...' : 'Verify & sign in'}
              </button>
              <button
                type="button"
                onClick={() => { setStep('phone'); setCode(''); setError(''); }}
                className="w-full text-center text-xs text-muted hover:text-ink"
              >
                Use a different number
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
