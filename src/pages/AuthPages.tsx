import { AlertCircle, CheckCircle2, Mail } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { BrandMark } from '../components/BrandMark';
import { useAuth } from '../context/AuthContext';

function mapAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code || '';
  if (code.includes('operation-not-allowed')) {
    return 'Email/Password sign-in is not yet enabled in Firebase Console (Authentication -> Sign-in method). Please use Google Sign-In below or ask the owner to enable Email/Password.';
  }
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
    return 'Invalid email or password.';
  }
  if (code.includes('email-already-in-use')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (code.includes('weak-password')) {
    return 'Password should be at least 6 characters.';
  }
  if (code.includes('popup-closed-by-user')) {
    return 'Sign-in popup was closed before completing.';
  }
  return err instanceof Error ? err.message : 'Authentication failed. Please try again.';
}

export function LoginPage() {
  const {
    user,
    isVerified,
    publicConfig,
    signInWithGoogle,
    signInWithEmail,
    resendVerificationEmail,
    refreshUserVerification,
    signOut,
  } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const nextUrl = searchParams.get('next') || '/app/dashboard';

  if (user && isVerified) {
    return <Navigate to={nextUrl} replace />;
  }

  const handleGoogle = async () => {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
      navigate(nextUrl, { replace: true });
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signInWithEmail(email.trim(), password);
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1220] text-[#F8FAFC] flex flex-col justify-center px-4 py-12">
      <div className="max-w-md w-full mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EE4A4] rounded">
            <BrandMark nameOverride={publicConfig.brandName} />
          </Link>
          <Link to="/demo" className="text-xs font-medium text-[#9CAFC6] hover:text-[#F8FAFC]">
            Free Demo
          </Link>
        </div>

        <div className="rounded-xl border border-[#263449] bg-[#111C2E] p-6 sm:p-8 space-y-6">
          {user && !isVerified ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[#FBBF24] font-semibold">
                <Mail className="w-5 h-5" aria-hidden="true" />
                <span>Verify your email address</span>
              </div>
              <p className="text-sm text-[#9CAFC6] leading-relaxed">
                A verification link was sent to <strong className="text-[#F8FAFC]">{user.email}</strong>.
                Workspace data is protected until email verification is completed.
              </p>
              {info && <p className="text-xs text-[#34D399]">{info}</p>}
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={async () => {
                    const verified = await refreshUserVerification();
                    if (verified) navigate(nextUrl, { replace: true });
                    else setInfo('Not verified yet—please click the link in your inbox.');
                  }}
                  className="w-full py-2.5 px-4 text-sm font-semibold rounded-lg bg-[#5EE4A4] text-[#0B1220] hover:bg-[#4AD493]"
                >
                  I verified my email — continue
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await resendVerificationEmail();
                    setInfo('Verification email resent.');
                  }}
                  className="w-full py-2.5 px-4 text-sm font-medium rounded-lg border border-[#263449] text-[#F8FAFC] hover:bg-[#0B1220]"
                >
                  Resend verification email
                </button>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="text-xs text-[#9CAFC6] hover:text-[#F8FAFC] pt-1"
                >
                  Sign out
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-[#F8FAFC]">Sign in to {publicConfig.brandName}</h1>
                <p className="text-sm text-[#9CAFC6]">
                  Access your saved store cost profiles, scenarios, and Decision Briefs.
                </p>
              </div>

              {error && (
                <div role="alert" className="p-3 rounded-lg bg-[#FB7185]/10 border border-[#FB7185]/40 text-xs text-[#FB7185] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="button"
                disabled={busy}
                onClick={handleGoogle}
                className="w-full py-3 px-4 rounded-lg bg-[#F8FAFC] text-[#0B1220] text-sm font-semibold hover:bg-[#E2E8F0] transition-colors disabled:opacity-60 cursor-pointer"
              >
                Continue with Google
              </button>

              <div className="relative flex items-center">
                <div className="flex-grow border-t border-[#263449]" />
                <span className="px-3 text-xs text-[#9CAFC6]">or email</span>
                <div className="flex-grow border-t border-[#263449]" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block">
                  <span className="text-xs font-medium text-[#9CAFC6]">Email address</span>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2.5 text-sm text-[#F8FAFC] focus:outline-none focus:border-[#5EE4A4]"
                  />
                </label>

                <label className="block">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#9CAFC6]">Password</span>
                    <Link to="/forgot-password" className="text-xs text-[#5EE4A4] hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2.5 text-sm text-[#F8FAFC] focus:outline-none focus:border-[#5EE4A4]"
                  />
                </label>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-3 px-4 rounded-lg bg-[#5EE4A4] text-[#0B1220] text-sm font-semibold hover:bg-[#4AD493] transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {busy ? 'Signing in...' : 'Sign in'}
                </button>
              </form>

              <p className="text-xs text-center text-[#9CAFC6]">
                Don&rsquo;t have an account?{' '}
                <Link to={`/signup?next=${encodeURIComponent(nextUrl)}`} className="text-[#5EE4A4] font-semibold hover:underline">
                  Create account
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function SignupPage() {
  const { user, isVerified, publicConfig, signInWithGoogle, signUpWithEmail } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const nextUrl = searchParams.get('next') || '/app/onboarding';

  if (user && isVerified) {
    return <Navigate to={nextUrl} replace />;
  }
  if (user && !isVerified) {
    return <Navigate to={`/login?next=${encodeURIComponent(nextUrl)}`} replace />;
  }

  const handleGoogle = async () => {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
      navigate(nextUrl, { replace: true });
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signUpWithEmail(email.trim(), password, displayName);
      navigate(`/login?next=${encodeURIComponent(nextUrl)}`, { replace: true });
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1220] text-[#F8FAFC] flex flex-col justify-center px-4 py-12">
      <div className="max-w-md w-full mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EE4A4] rounded">
            <BrandMark nameOverride={publicConfig.brandName} />
          </Link>
          <Link to="/demo" className="text-xs font-medium text-[#9CAFC6] hover:text-[#F8FAFC]">
            Free Demo
          </Link>
        </div>

        <div className="rounded-xl border border-[#263449] bg-[#111C2E] p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-[#F8FAFC]">Create your account</h1>
            <p className="text-sm text-[#9CAFC6]">
              Set up your workspace for {publicConfig.brandName}.
            </p>
          </div>

          {error && (
            <div role="alert" className="p-3 rounded-lg bg-[#FB7185]/10 border border-[#FB7185]/40 text-xs text-[#FB7185] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={handleGoogle}
            className="w-full py-3 px-4 rounded-lg bg-[#F8FAFC] text-[#0B1220] text-sm font-semibold hover:bg-[#E2E8F0] transition-colors disabled:opacity-60 cursor-pointer"
          >
            Continue with Google
          </button>

          <div className="relative flex items-center">
            <div className="flex-grow border-t border-[#263449]" />
            <span className="px-3 text-xs text-[#9CAFC6]">or email</span>
            <div className="flex-grow border-t border-[#263449]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="text-xs font-medium text-[#9CAFC6]">Your name</span>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2.5 text-sm text-[#F8FAFC] focus:outline-none focus:border-[#5EE4A4]"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-[#9CAFC6]">Email address</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2.5 text-sm text-[#F8FAFC] focus:outline-none focus:border-[#5EE4A4]"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-[#9CAFC6]">Password (min 6 characters)</span>
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2.5 text-sm text-[#F8FAFC] focus:outline-none focus:border-[#5EE4A4]"
              />
            </label>

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 px-4 rounded-lg bg-[#5EE4A4] text-[#0B1220] text-sm font-semibold hover:bg-[#4AD493] transition-colors disabled:opacity-60 cursor-pointer"
            >
              {busy ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="text-xs text-center text-[#9CAFC6]">
            Already have an account?{' '}
            <Link to={`/login?next=${encodeURIComponent(nextUrl)}`} className="text-[#5EE4A4] font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export function ForgotPasswordPage() {
  const { publicConfig, sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await sendPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1220] text-[#F8FAFC] flex flex-col justify-center px-4 py-12">
      <div className="max-w-md w-full mx-auto space-y-6">
        <Link to="/" className="inline-block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EE4A4] rounded">
          <BrandMark nameOverride={publicConfig.brandName} />
        </Link>

        <div className="rounded-xl border border-[#263449] bg-[#111C2E] p-6 sm:p-8 space-y-5">
          <h1 className="text-2xl font-bold text-[#F8FAFC]">Reset password</h1>

          {sent ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-[#34D399]/10 border border-[#34D399]/40 text-sm text-[#34D399] flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  If an email/password account exists for <strong>{email}</strong>, a password
                  reset link has been sent.
                </span>
              </div>
              <Link
                to="/login"
                className="block w-full text-center py-2.5 px-4 rounded-lg bg-[#5EE4A4] text-[#0B1220] text-sm font-semibold hover:bg-[#4AD493]"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-[#9CAFC6]">
                Enter the email address associated with your account and we&rsquo;ll send a reset link.
              </p>
              {error && (
                <div role="alert" className="p-3 rounded-lg bg-[#FB7185]/10 border border-[#FB7185]/40 text-xs text-[#FB7185]">
                  {error}
                </div>
              )}
              <label className="block">
                <span className="text-xs font-medium text-[#9CAFC6]">Email address</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5 w-full rounded-lg bg-[#0B1220] border border-[#263449] px-3 py-2.5 text-sm text-[#F8FAFC] focus:outline-none focus:border-[#5EE4A4]"
                />
              </label>
              <button
                type="submit"
                disabled={busy}
                className="w-full py-3 px-4 rounded-lg bg-[#5EE4A4] text-[#0B1220] text-sm font-semibold hover:bg-[#4AD493] disabled:opacity-60 cursor-pointer"
              >
                {busy ? 'Sending...' : 'Send reset link'}
              </button>
              <Link to="/login" className="block text-center text-xs text-[#9CAFC6] hover:text-[#F8FAFC]">
                Back to sign in
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
