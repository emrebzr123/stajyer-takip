'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Icon from '@/components/ui/Icon';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const router  = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [activeTab, setActiveTab] = useState<'manager' | 'intern'>('manager');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [showPwd,  setShowPwd]  = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('E-posta ve şifre zorunludur.');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.login(email.trim(), password);
      const { user, accessToken } = res.data;

      // Rol kontrolü
      if (activeTab === 'manager' && user.role === 'intern') {
        setError('Bu hesap stajyer hesabıdır. Stajyer Girişi sekmesini kullanın.');
        setLoading(false);
        return;
      }
      if (activeTab === 'intern' && user.role !== 'intern') {
        setError('Bu hesap yönetici hesabıdır. Yönetici Girişi sekmesini kullanın.');
        setLoading(false);
        return;
      }

      setAuth(user, accessToken);
      toast.success(`Hoş geldiniz, ${user.name}!`);

      // Role göre yönlendir
      if (user.role === 'intern') {
        router.push('/stajyer/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'E-posta veya şifre hatalı.');
    } finally {
      setLoading(false);
    }
  };

  const TAB = (t: 'manager' | 'intern', label: string, icon: string) => (
    <button
      type="button"
      onClick={() => { setActiveTab(t); setError(''); setEmail(''); setPassword(''); }}
      style={{
        flex: 1, padding: '10px 0', fontWeight: 600, fontSize: 14,
        cursor: 'pointer', border: 'none',
        borderBottom: activeTab === t ? '2px solid var(--primary)' : '2px solid transparent',
        color: activeTab === t ? 'var(--primary)' : 'var(--text-secondary)',
        background: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        transition: 'all .2s',
      }}
    >
      <span>{icon}</span> {label}
    </button>
  );

  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: 420 }}>
        {/* Logo — sidebar'da kullanılan gerçek şirket logosu (public/logo.png),
            önceden burada jenerik bir clipboard ikonu vardı ve marka adı
            (ELECTROMTECH) hiç görünmüyordu. Şimdi ortalanmış şekilde. */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', marginBottom:8 }}>
          <Image
            src="/logo.png"
            alt="ELECTROMTECH Logo"
            width={64}
            height={64}
            style={{ width:64, height:64, borderRadius:10, objectFit:'cover', mixBlendMode:'multiply', marginBottom:10 }}
          />
          <span style={{ fontWeight:800, fontSize:16, letterSpacing:0.5, color:'var(--text-primary)' }}>
            ELECTROMTECH
          </span>
          <span style={{ fontWeight:700, fontSize:14, color:'var(--text-primary)' }}>
            Stajyer Takip Sistemi
          </span>
        </div>

        <h1 className="login-title">Giriş Yap</h1>
        <p className="login-sub">Hesap türünüzü seçerek giriş yapın.</p>

        {/* Sekmeler */}
        <div style={{
          display: 'flex', borderBottom: '1px solid var(--border)',
          marginBottom: 20, marginTop: 4,
        }}>
          {TAB('manager', 'Yönetici Girişi', '🏢')}
          {TAB('intern',  'Stajyer Girişi',  '🎓')}
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">E-posta</label>
            <input
              className="form-input"
              // NOT: type="email" tarayıcının kendi yerleşik HTML5 doğrulamasını
              // devreye sokar; bu doğrulama @ öncesinde Türkçe karakterlere
              // (ğ, ü, ş, ö, ç, ı) izin vermez ve formu göndermeden engeller —
              // backend bu karakterleri desteklese bile kullanıcı asla giriş
              // yapamazdı. type="text" + inputMode="email" ile tarayıcı
              // doğrulamasını devre dışı bırakıp e-posta klavyesini koruyoruz.
              type="text"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={activeTab === 'manager' ? 'yonetici@sirket.com' : 'stajyer@sirket.com'}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Şifre</label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-input"
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                style={{ paddingRight: 40 }}
              />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                style={{
                  position: 'absolute', right: 12, top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-secondary)', padding: 0,
                }}>
                <Icon name={showPwd ? 'eyeOff' : 'eye'} size={16} />
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
            disabled={loading}>
            {loading ? 'Giriş yapılıyor…' : activeTab === 'manager' ? '🏢 Yönetici Olarak Giriş Yap' : '🎓 Stajyer Olarak Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  );
}
