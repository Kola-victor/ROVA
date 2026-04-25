import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function SignupPage() {
  const { signUp } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    const { error } = await signUp(email, password, fullName);
    setLoading(false);
    if (error) {
      setError(error.message || 'Failed to create account. Please try again.');
    } else {
      navigate('/dashboard');
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-base)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        background: 'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(147,51,234,0.15) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 400, animation: 'fadeIn 0.4s ease' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 100, height: 'auto',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <img src={theme === 'light' ? "/rova-light.png" : "/rova.png"} alt="ROVA Logo" style={{ width: '100%', height: 'auto', objectFit: 'contain' }} />
          </div>
          <h1 style={{ fontSize: 24, marginBottom: 6 }}>Create your account</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Start managing your finances with ROVA</p>
        </div>

        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--bg-border)',
          borderRadius: 'var(--radius-xl)',
          padding: 24,
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Input
              label="Full Name"
              type="text"
              placeholder="John Doe"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              prefix={<User size={14} />}
              required
            />
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              prefix={<Mail size={14} />}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="Minimum 6 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              prefix={<Lock size={14} />}
              required
            />

            {error && (
              <div style={{
                padding: '10px 12px', background: 'var(--error-dim)',
                border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-md)',
                color: 'var(--error)', fontSize: 13,
              }}>
                {error}
              </div>
            )}

            <Button variant="primary" size="lg" loading={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
              Create Account
            </Button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, color: 'var(--text-muted)', fontSize: 13 }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent-light)', fontWeight: 500 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
