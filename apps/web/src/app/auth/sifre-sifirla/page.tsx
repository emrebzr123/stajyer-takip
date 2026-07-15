'use client';
import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Icon from '@/components/ui/Icon';
import { authApi } from '@/lib/api';
import toast from 'react-hot-toast';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Şifre en az 8 karakter olmalıdır.');
      return;
    }
    if (password !== confirm) {
      setError('Şifreler eşleşmiyor.');
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
      toast.success('Şifreniz güncellendi!');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Bağlantının süresi dolmuş olabilir. Lütfen yeni bir sıfırlama talebi oluşturun.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 20, padding: 32, textAlign: 'center', boxShadow: '0 20px 50px rgba(15,23,42,.12)' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
        <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 8px' }}>Geçersiz Bağlantı</h2>
        <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 20px' }}>
          Bu bağlantı eksik ya da hatalı görünüyor. Giriş ekranından "Şifremi Unuttum?" ile yeni bir talep oluşturabilirsiniz.
        </p>
        <button onClick={() => router.push('/auth/login')}
          style={{ border: 'none', borderRadius: 10, padding: '11px 20px', background: '#2563EB', color: '#fff', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>
          Giriş Ekranına Dön
        </button>
      </div>
    );
  }

  if (done) {
    return (
      <div style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 20, padding: 32, textAlign: 'center', boxShadow: '0 20px 50px rgba(15,23,42,.12)' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
        <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 8px' }}>Şifreniz Güncellendi</h2>
        <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 20px' }}>
          Artık yeni şifrenizle giriş yapabilirsiniz.
        </p>
        <button onClick={() => router.push('/auth/login')}
          style={{ border: 'none', borderRadius: 10, padding: '11px 20px', background: '#2563EB', color: '#fff', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>
          Giriş Yap
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 20, padding: '32px 32px 28px', boxShadow: '0 20px 50px rgba(15,23,42,.12)' }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 6px', textAlign: 'center' }}>Yeni Şifre Belirle</h2>
      <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 22px', textAlign: 'center' }}>
        Hesabınız için yeni bir şifre girin.
      </p>

      {error && <div className="login-error" style={{ marginBottom: 16 }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Yeni Şifre</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}>
              <Icon name="lock" size={16} />
            </span>
            <input
              className="form-input" type={showPwd ? 'text' : 'password'}
              value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="En az 8 karakter" autoComplete="new-password" required
              style={{ paddingLeft: 38, paddingRight: 40 }}
            />
            <button type="button" onClick={() => setShowPwd((v) => !v)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 0 }}>
              <Icon name={showPwd ? 'eyeOff' : 'eye'} size={16} />
            </button>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Yeni Şifre (Tekrar)</label>
          <input
            className="form-input" type={showPwd ? 'text' : 'password'}
            value={confirm} onChange={(e) => setConfirm(e.target.value)}
            placeholder="Şifrenizi tekrar girin" autoComplete="new-password" required
          />
        </div>

        <button type="submit" disabled={loading}
          style={{
            width: '100%', border: 'none', borderRadius: 12, padding: '13px 0', marginTop: 8,
            fontWeight: 700, fontSize: 14.5, color: '#fff', cursor: loading ? 'default' : 'pointer',
            background: 'linear-gradient(135deg, #2563EB, #2563EBCC)',
            boxShadow: '0 10px 20px #2563EB33', opacity: loading ? 0.7 : 1,
          }}>
          {loading ? 'Güncelleniyor…' : 'Şifreyi Güncelle'}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '32px 16px',
      background: 'linear-gradient(160deg, #EFF6FF 0%, #F8FAFC 45%, #ECFDF5 100%)',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
        <Image src="/logo.png" alt="Görev Takip Sistemi Logo" width={64} height={64}
          style={{ width: 64, height: 64, borderRadius: 14, objectFit: 'cover', marginBottom: 10 }} />
        <span style={{ fontSize: 20, fontWeight: 800, color: '#0F172A' }}>Görev Takip Sistemi</span>
      </div>
      {/* useSearchParams() Suspense sınırı gerektiriyor — olmadan Next.js
          build sırasında hata veriyor. */}
      <Suspense fallback={<div style={{ color: '#94A3B8', fontSize: 14 }}>Yükleniyor…</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
