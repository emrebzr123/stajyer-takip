'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Icon from '@/components/ui/Icon';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';

type Role = 'admin' | 'manager' | 'intern';

const ROLE_META: Record<Role, { label: string; icon: string; color: string; bg: string; placeholder: string }> = {
  admin:   { label: 'Yönetici', icon: '🏢', color: '#2563EB', bg: '#DBEAFE', placeholder: 'yonetici@sirket.com' },
  manager: { label: 'Personel', icon: '👤', color: '#059669', bg: '#D1FAE5', placeholder: 'personel@sirket.com' },
  intern:  { label: 'Stajyer',  icon: '🎓', color: '#D97706', bg: '#FEF3C7', placeholder: 'stajyer@sirket.com' },
};

export default function LoginPage() {
  const router  = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [activeRole, setActiveRole] = useState<Role>('admin');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // "Şifremi Unuttum?" modalı
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const handleForgotSubmit = async () => {
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    try {
      await authApi.forgotPassword(forgotEmail.trim());
      // NOT: Backend e-posta kayıtlı olsun ya da olmasın HER ZAMAN aynı
      // genel mesajı döner — hangi e-postaların sistemde kayıtlı olduğunu
      // sızdırmamak için. Frontend de bu mesajı olduğu gibi gösterir.
      setForgotSent(true);
    } catch {
      toast.error('Bir sorun oluştu, lütfen tekrar deneyin.');
    } finally {
      setForgotLoading(false);
    }
  };

  const meta = ROLE_META[activeRole];

  // "Beni Hatırla" — SADECE e-posta hatırlanır (localStorage'da), şifre
  // DEĞİL. Şifreyi kendi kodumuzda saklamak güvenlik riski taşır (sayfaya
  // erişen herhangi bir JS onu okuyabilir); şifre hatırlama işini formdaki
  // autoComplete="current-password" sayesinde zaten tarayıcının kendi
  // (işletim sistemi seviyesinde şifrelenmiş) şifre yöneticisine bırakıyoruz.
  useEffect(() => {
    const saved = localStorage.getItem('remembered_email');
    if (saved) { setEmail(saved); setRememberMe(true); }
  }, []);

  const selectRole = (r: Role) => {
    setActiveRole(r); setError('');
  };

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

      // Seçilen sekme ile hesabın GERÇEK rolü uyuşmuyorsa reddet — hangi
      // sekmeye tıklandığı sadece görsel bir tercih, yetkiyi HER ZAMAN
      // backend'den dönen gerçek rol belirler.
      // İSTİSNA: Yönetici (admin) hesapları, hem "Yönetici" hem "Personel"
      // sekmesinden giriş yapabilir — hangisini seçtiyse o panele düşer.
      // Stajyer ve Personel hesapları için istisna yok, tam eşleşme şart.
      const isAdminUsingManagerTab = user.role === 'admin' && activeRole === 'manager';
      if (user.role !== activeRole && !isAdminUsingManagerTab) {
        const gercekRol = ROLE_META[user.role as Role]?.label || user.role;
        setError(`Bu hesap bir ${gercekRol} hesabı. Lütfen "${gercekRol}" sekmesini seçip tekrar deneyin.`);
        setLoading(false);
        return;
      }

      setAuth(user, accessToken);
      toast.success(`Hoş geldiniz, ${user.name}!`);

      // "Beni Hatırla" işaretliyse e-postayı kaydet, değilse (ya da daha
      // önce kaydedilmiş bir e-posta varsa ve şimdi işaret kaldırıldıysa)
      // sil.
      if (rememberMe) {
        localStorage.setItem('remembered_email', email.trim());
      } else {
        localStorage.removeItem('remembered_email');
      }

      // Yönlendirme, gerçek role DEĞİL seçilen sekmeye göre yapılıyor —
      // böylece bir admin "Personel" sekmesinden girdiğinde gerçekten
      // Personel paneline (/dashboard) düşüyor, "Yönetici" sekmesinden
      // girdiğinde Yönetici paneline (/yonetici/dashboard).
      if (isAdminUsingManagerTab) {
        router.push('/dashboard');
      } else if (user.role === 'admin') {
        router.push('/yonetici/dashboard');
      } else if (user.role === 'intern') {
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

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '32px 16px',
      position: 'relative', overflow: 'hidden',
      // Gerçek bir ofis fotoğrafı yerine (elimizde dosya yok) kurumsal,
      // yumuşak bir mavi degrade + dekoratif devre-hattı deseni — mockup'taki
      // genel hissi (sade, teknoloji temalı, profesyonel) CSS ile yakalıyoruz.
      // İstersen gerçek bir arkaplan fotoğrafı verirsen buraya onu koyarım.
      background: 'linear-gradient(160deg, #EFF6FF 0%, #F8FAFC 45%, #ECFDF5 100%)',
    }}>
      {/* Dekoratif devre deseni — sağ üst köşe. Işık noktaları çizgiler
          boyunca akıyor (SVG <animateMotion>, ekstra dosya/JS gerekmez),
          düğümler yavaşça "nabız atıyor" (CSS keyframe, aşağıda). */}
      <svg width="360" height="360" viewBox="0 0 360 360" style={{ position: 'absolute', top: -40, right: -40, opacity: 0.4, pointerEvents: 'none' }}>
        <g stroke="#93C5FD" strokeWidth="1.5" fill="none">
          <path id="circuit-path-1" d="M360 60 L280 60 L280 120 L220 120" />
          <path id="circuit-path-2" d="M360 140 L300 140 L300 190" />
          <path id="circuit-path-3" d="M260 40 L260 90 L200 90 L200 160" />
          <path id="circuit-path-4" d="M360 220 L320 220 L320 260 L250 260" />
          <path id="circuit-path-5" d="M180 40 L180 110 L120 110 L120 60" />
          <path id="circuit-path-6" d="M340 10 L340 40 L290 40" />
          <path id="circuit-path-7" d="M150 170 L150 220 L90 220 L90 280" />
          <path id="circuit-path-8" d="M220 200 L280 200 L280 230" />
        </g>
        <g fill="#60A5FA">
          <circle className="circuit-node" cx="280" cy="60" r="4" style={{ animationDelay: '0s' }} />
          <circle className="circuit-node" cx="220" cy="120" r="4" style={{ animationDelay: '.4s' }} />
          <circle className="circuit-node" cx="300" cy="140" r="4" style={{ animationDelay: '.8s' }} />
          <circle className="circuit-node" cx="260" cy="90" r="4" style={{ animationDelay: '1.2s' }} />
          <circle className="circuit-node" cx="200" cy="160" r="4" style={{ animationDelay: '1.6s' }} />
          <circle className="circuit-node" cx="320" cy="220" r="4" style={{ animationDelay: '.2s' }} />
          <circle className="circuit-node" cx="250" cy="260" r="4" style={{ animationDelay: '1.0s' }} />
          <circle className="circuit-node" cx="180" cy="110" r="4" style={{ animationDelay: '.6s' }} />
          <circle className="circuit-node" cx="120" cy="60" r="4" style={{ animationDelay: '1.4s' }} />
          <circle className="circuit-node" cx="340" cy="40" r="4" style={{ animationDelay: '1.8s' }} />
          <circle className="circuit-node" cx="150" cy="220" r="4" style={{ animationDelay: '.5s' }} />
          <circle className="circuit-node" cx="90" cy="280" r="4" style={{ animationDelay: '2.0s' }} />
          <circle className="circuit-node" cx="280" cy="230" r="4" style={{ animationDelay: '.9s' }} />
        </g>
        {/* Çizgiler boyunca akan ışık noktaları */}
        <circle r="3" fill="#2563EB">
          <animateMotion dur="3.5s" repeatCount="indefinite" path="M360 60 L280 60 L280 120 L220 120" />
        </circle>
        <circle r="3" fill="#2563EB">
          <animateMotion dur="2.8s" repeatCount="indefinite" begin="0.6s" path="M360 140 L300 140 L300 190" />
        </circle>
        <circle r="3" fill="#2563EB">
          <animateMotion dur="4.2s" repeatCount="indefinite" begin="1.1s" path="M260 40 L260 90 L200 90 L200 160" />
        </circle>
        <circle r="3" fill="#2563EB">
          <animateMotion dur="3.9s" repeatCount="indefinite" begin="1.6s" path="M360 220 L320 220 L320 260 L250 260" />
        </circle>
        <circle r="3" fill="#2563EB">
          <animateMotion dur="3.2s" repeatCount="indefinite" begin="0.3s" path="M180 40 L180 110 L120 110 L120 60" />
        </circle>
        <circle r="3" fill="#2563EB">
          <animateMotion dur="2.4s" repeatCount="indefinite" begin="2.1s" path="M340 10 L340 40 L290 40" />
        </circle>
        <circle r="3" fill="#2563EB">
          <animateMotion dur="4.6s" repeatCount="indefinite" begin="0.9s" path="M150 170 L150 220 L90 220 L90 280" />
        </circle>
        <circle r="3" fill="#2563EB">
          <animateMotion dur="2.9s" repeatCount="indefinite" begin="1.4s" path="M220 200 L280 200 L280 230" />
        </circle>
      </svg>

      {/* Aynı desenin daha soluk bir eşi — sol alt köşe, sahneye derinlik
          katmak için */}
      <svg width="320" height="320" viewBox="0 0 320 320" style={{ position: 'absolute', bottom: -30, left: -30, opacity: 0.25, pointerEvents: 'none' }}>
        <g stroke="#6EE7B7" strokeWidth="1.5" fill="none">
          <path d="M0 220 L80 220 L80 160 L140 160" />
          <path d="M0 140 L60 140 L60 90" />
          <path d="M0 280 L120 280 L120 240 L170 240" />
          <path d="M100 40 L100 100 L160 100 L160 70" />
          <path d="M200 10 L200 60 L260 60" />
          <path d="M40 40 L40 90 L90 90" />
        </g>
        <g fill="#34D399">
          <circle className="circuit-node" cx="80" cy="220" r="4" style={{ animationDelay: '.3s' }} />
          <circle className="circuit-node" cx="140" cy="160" r="4" style={{ animationDelay: '.9s' }} />
          <circle className="circuit-node" cx="60" cy="90" r="4" style={{ animationDelay: '1.5s' }} />
          <circle className="circuit-node" cx="120" cy="280" r="4" style={{ animationDelay: '.2s' }} />
          <circle className="circuit-node" cx="170" cy="240" r="4" style={{ animationDelay: '1.1s' }} />
          <circle className="circuit-node" cx="160" cy="100" r="4" style={{ animationDelay: '.7s' }} />
          <circle className="circuit-node" cx="160" cy="70" r="4" style={{ animationDelay: '1.7s' }} />
          <circle className="circuit-node" cx="260" cy="60" r="4" style={{ animationDelay: '.4s' }} />
          <circle className="circuit-node" cx="90" cy="90" r="4" style={{ animationDelay: '1.3s' }} />
        </g>
        <circle r="3" fill="#10B981">
          <animateMotion dur="3.8s" repeatCount="indefinite" path="M0 220 L80 220 L80 160 L140 160" />
        </circle>
        <circle r="3" fill="#10B981">
          <animateMotion dur="3.1s" repeatCount="indefinite" begin="0.8s" path="M0 140 L60 140 L60 90" />
        </circle>
        <circle r="3" fill="#10B981">
          <animateMotion dur="4.4s" repeatCount="indefinite" begin="1.5s" path="M0 280 L120 280 L120 240 L170 240" />
        </circle>
        <circle r="3" fill="#10B981">
          <animateMotion dur="3.6s" repeatCount="indefinite" begin="0.4s" path="M100 40 L100 100 L160 100 L160 70" />
        </circle>
        <circle r="3" fill="#10B981">
          <animateMotion dur="2.7s" repeatCount="indefinite" begin="1.9s" path="M200 10 L200 60 L260 60" />
        </circle>
        <circle r="3" fill="#10B981">
          <animateMotion dur="3.3s" repeatCount="indefinite" begin="1.0s" path="M40 40 L40 90 L90 90" />
        </circle>
      </svg>

      {/* Sağ üstteki mavi desenin YATAY AYNALANMIŞ hâli — sol üst köşe.
          Koordinatları yeniden hesaplamaya gerek yok, sadece CSS
          transform:scaleX(-1) ile çeviriyoruz. */}
      <svg width="360" height="360" viewBox="0 0 360 360" style={{ position: 'absolute', top: -40, left: -40, opacity: 0.4, pointerEvents: 'none', transform: 'scaleX(-1)' }}>
        <g stroke="#93C5FD" strokeWidth="1.5" fill="none">
          <path d="M360 60 L280 60 L280 120 L220 120" />
          <path d="M360 140 L300 140 L300 190" />
          <path d="M260 40 L260 90 L200 90 L200 160" />
          <path d="M360 220 L320 220 L320 260 L250 260" />
          <path d="M180 40 L180 110 L120 110 L120 60" />
          <path d="M340 10 L340 40 L290 40" />
          <path d="M150 170 L150 220 L90 220 L90 280" />
          <path d="M220 200 L280 200 L280 230" />
        </g>
        <g fill="#60A5FA">
          <circle className="circuit-node" cx="280" cy="60" r="4" style={{ animationDelay: '0s' }} />
          <circle className="circuit-node" cx="220" cy="120" r="4" style={{ animationDelay: '.4s' }} />
          <circle className="circuit-node" cx="300" cy="140" r="4" style={{ animationDelay: '.8s' }} />
          <circle className="circuit-node" cx="260" cy="90" r="4" style={{ animationDelay: '1.2s' }} />
          <circle className="circuit-node" cx="200" cy="160" r="4" style={{ animationDelay: '1.6s' }} />
          <circle className="circuit-node" cx="320" cy="220" r="4" style={{ animationDelay: '.2s' }} />
          <circle className="circuit-node" cx="250" cy="260" r="4" style={{ animationDelay: '1.0s' }} />
          <circle className="circuit-node" cx="180" cy="110" r="4" style={{ animationDelay: '.6s' }} />
          <circle className="circuit-node" cx="120" cy="60" r="4" style={{ animationDelay: '1.4s' }} />
          <circle className="circuit-node" cx="340" cy="40" r="4" style={{ animationDelay: '1.8s' }} />
          <circle className="circuit-node" cx="150" cy="220" r="4" style={{ animationDelay: '.5s' }} />
          <circle className="circuit-node" cx="90" cy="280" r="4" style={{ animationDelay: '2.0s' }} />
          <circle className="circuit-node" cx="280" cy="230" r="4" style={{ animationDelay: '.9s' }} />
        </g>
        <circle r="3" fill="#2563EB">
          <animateMotion dur="3.5s" repeatCount="indefinite" path="M360 60 L280 60 L280 120 L220 120" />
        </circle>
        <circle r="3" fill="#2563EB">
          <animateMotion dur="2.8s" repeatCount="indefinite" begin="0.6s" path="M360 140 L300 140 L300 190" />
        </circle>
        <circle r="3" fill="#2563EB">
          <animateMotion dur="4.2s" repeatCount="indefinite" begin="1.1s" path="M260 40 L260 90 L200 90 L200 160" />
        </circle>
        <circle r="3" fill="#2563EB">
          <animateMotion dur="3.9s" repeatCount="indefinite" begin="1.6s" path="M360 220 L320 220 L320 260 L250 260" />
        </circle>
        <circle r="3" fill="#2563EB">
          <animateMotion dur="3.2s" repeatCount="indefinite" begin="0.3s" path="M180 40 L180 110 L120 110 L120 60" />
        </circle>
        <circle r="3" fill="#2563EB">
          <animateMotion dur="2.4s" repeatCount="indefinite" begin="2.1s" path="M340 10 L340 40 L290 40" />
        </circle>
        <circle r="3" fill="#2563EB">
          <animateMotion dur="4.6s" repeatCount="indefinite" begin="0.9s" path="M150 170 L150 220 L90 220 L90 280" />
        </circle>
        <circle r="3" fill="#2563EB">
          <animateMotion dur="2.9s" repeatCount="indefinite" begin="1.4s" path="M220 200 L280 200 L280 230" />
        </circle>
      </svg>

      {/* Sol alttaki yeşil desenin YATAY AYNALANMIŞ hâli — sağ alt köşe. */}
      <svg width="320" height="320" viewBox="0 0 320 320" style={{ position: 'absolute', bottom: -30, right: -30, opacity: 0.25, pointerEvents: 'none', transform: 'scaleX(-1)' }}>
        <g stroke="#6EE7B7" strokeWidth="1.5" fill="none">
          <path d="M0 220 L80 220 L80 160 L140 160" />
          <path d="M0 140 L60 140 L60 90" />
          <path d="M0 280 L120 280 L120 240 L170 240" />
          <path d="M100 40 L100 100 L160 100 L160 70" />
          <path d="M200 10 L200 60 L260 60" />
          <path d="M40 40 L40 90 L90 90" />
        </g>
        <g fill="#34D399">
          <circle className="circuit-node" cx="80" cy="220" r="4" style={{ animationDelay: '.3s' }} />
          <circle className="circuit-node" cx="140" cy="160" r="4" style={{ animationDelay: '.9s' }} />
          <circle className="circuit-node" cx="60" cy="90" r="4" style={{ animationDelay: '1.5s' }} />
          <circle className="circuit-node" cx="120" cy="280" r="4" style={{ animationDelay: '.2s' }} />
          <circle className="circuit-node" cx="170" cy="240" r="4" style={{ animationDelay: '1.1s' }} />
          <circle className="circuit-node" cx="160" cy="100" r="4" style={{ animationDelay: '.7s' }} />
          <circle className="circuit-node" cx="160" cy="70" r="4" style={{ animationDelay: '1.7s' }} />
          <circle className="circuit-node" cx="260" cy="60" r="4" style={{ animationDelay: '.4s' }} />
          <circle className="circuit-node" cx="90" cy="90" r="4" style={{ animationDelay: '1.3s' }} />
        </g>
        <circle r="3" fill="#10B981">
          <animateMotion dur="3.8s" repeatCount="indefinite" path="M0 220 L80 220 L80 160 L140 160" />
        </circle>
        <circle r="3" fill="#10B981">
          <animateMotion dur="3.1s" repeatCount="indefinite" begin="0.8s" path="M0 140 L60 140 L60 90" />
        </circle>
        <circle r="3" fill="#10B981">
          <animateMotion dur="4.4s" repeatCount="indefinite" begin="1.5s" path="M0 280 L120 280 L120 240 L170 240" />
        </circle>
        <circle r="3" fill="#10B981">
          <animateMotion dur="3.6s" repeatCount="indefinite" begin="0.4s" path="M100 40 L100 100 L160 100 L160 70" />
        </circle>
        <circle r="3" fill="#10B981">
          <animateMotion dur="2.7s" repeatCount="indefinite" begin="1.9s" path="M200 10 L200 60 L260 60" />
        </circle>
        <circle r="3" fill="#10B981">
          <animateMotion dur="3.3s" repeatCount="indefinite" begin="1.0s" path="M40 40 L40 90 L90 90" />
        </circle>
      </svg>

      {/* Yavaşça yukarı süzülen parçacıklar — tüm sayfa genelinde, sonsuz
          döngü. Konum/boyut/hız/gecikme her birinde farklı ki mekanik değil
          organik görünsün. */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {[
          { left: '8%',  size: 6, duration: 14, delay: 0,   color: '#93C5FD' },
          { left: '18%', size: 4, duration: 18, delay: 3,   color: '#6EE7B7' },
          { left: '30%', size: 5, duration: 12, delay: 1.5, color: '#93C5FD' },
          { left: '45%', size: 3, duration: 16, delay: 5,   color: '#FCD34D' },
          { left: '58%', size: 6, duration: 20, delay: 2,   color: '#6EE7B7' },
          { left: '70%', size: 4, duration: 13, delay: 4.5, color: '#93C5FD' },
          { left: '82%', size: 5, duration: 17, delay: 0.8, color: '#FCD34D' },
          { left: '92%', size: 3, duration: 15, delay: 6,   color: '#6EE7B7' },
        ].map((p, i) => (
          <span key={i} className="floating-particle" style={{
            left: p.left, width: p.size, height: p.size, background: p.color,
            animationDuration: `${p.duration}s`, animationDelay: `${p.delay}s`,
          }} />
        ))}
      </div>

      <style jsx>{`
        .circuit-node {
          animation: pulse-node 2.4s ease-in-out infinite;
          transform-origin: center;
          transform-box: fill-box;
        }
        @keyframes pulse-node {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50%      { opacity: 1;   transform: scale(1.4); }
        }
        .floating-particle {
          position: absolute;
          bottom: -20px;
          border-radius: 50%;
          opacity: 0;
          animation-name: float-up;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
        @keyframes float-up {
          0%   { transform: translateY(0) translateX(0); opacity: 0; }
          10%  { opacity: .6; }
          50%  { transform: translateY(-50vh) translateX(12px); opacity: .35; }
          90%  { opacity: .6; }
          100% { transform: translateY(-100vh) translateX(-8px); opacity: 0; }
        }
      `}</style>

      {/* Üst kısım — logo + başlık (kartın DIŞINDA, mockup'taki gibi) */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 28, position: 'relative' }}>
        <Image
          src="/logo.png"
          alt="Görev Takip Sistemi Logo"
          width={72}
          height={72}
          style={{ width: 72, height: 72, borderRadius: 16, objectFit: 'cover', marginBottom: 14, boxShadow: '0 8px 20px rgba(37,99,235,.15)' }}
        />
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', margin: '0 0 6px' }}>
          Görev Takip Sistemi
        </h1>
        <p style={{ fontSize: 14, color: '#64748B', margin: 0, maxWidth: 320 }}>
          Görevlerinizi planlayın, takip edin ve başarıya ulaşın.
        </p>
        <div style={{ width: 40, height: 3, borderRadius: 2, background: '#2563EB', marginTop: 14 }} />
      </div>

      {/* Kart */}
      <div style={{
        width: '100%', maxWidth: 440, background: '#fff', borderRadius: 20,
        padding: '32px 32px 28px', boxShadow: '0 20px 50px rgba(15,23,42,.12)',
        position: 'relative',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22, justifyContent: 'center' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>Giriş Yönteminizi Seçin</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        {/* 3 rol kartı */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
          {(Object.keys(ROLE_META) as Role[]).map((r) => {
            const m = ROLE_META[r];
            const active = activeRole === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => selectRole(r)}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  padding: '14px 4px', borderRadius: 12, cursor: 'pointer', position: 'relative',
                  border: active ? `1.5px solid ${m.color}` : '1.5px solid var(--border)',
                  background: active ? `${m.color}0A` : '#fff',
                  transition: 'all .15s',
                }}
              >
                {active && (
                  <span style={{
                    position: 'absolute', top: -7, right: -7, width: 18, height: 18, borderRadius: '50%',
                    background: m.color, color: '#fff', fontSize: 11, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,.15)',
                  }}>
                    ✓
                  </span>
                )}
                <span style={{
                  width: 34, height: 34, borderRadius: '50%', background: m.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                }}>
                  {m.icon}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: active ? m.color : '#475569' }}>
                  {m.label} Girişi
                </span>
              </button>
            );
          })}
        </div>

        {error && <div className="login-error" style={{ marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">E-posta</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}>
                <Icon name="mail" size={16} />
              </span>
              <input
                className="form-input"
                type="text"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={meta.placeholder}
                autoComplete="email"
                required
                style={{ paddingLeft: 38 }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Şifre</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}>
                <Icon name="lock" size={16} />
              </span>
              <input
                className="form-input"
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                style={{ paddingLeft: 38, paddingRight: 40 }}
              />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 0,
                }}>
                <Icon name={showPwd ? 'eyeOff' : 'eye'} size={16} />
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '2px 0 18px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: '#475569', cursor: 'pointer' }}>
              <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}
                style={{ width: 14, height: 14, cursor: 'pointer', accentColor: meta.color }} />
              Beni hatırla
            </label>
            <button type="button"
              onClick={() => { setForgotOpen(true); setForgotEmail(email); setForgotSent(false); }}
              style={{ fontSize: 12.5, color: meta.color, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
              Şifremi Unuttum?
            </button>
          </div>

          <button type="submit"
            style={{
              width: '100%', border: 'none', borderRadius: 12, padding: '13px 0',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontWeight: 700, fontSize: 14.5, color: '#fff', cursor: loading ? 'default' : 'pointer',
              background: `linear-gradient(135deg, ${meta.color}, ${meta.color}CC)`,
              boxShadow: `0 10px 20px ${meta.color}33`,
              opacity: loading ? 0.7 : 1,
            }}
            disabled={loading}>
            {loading ? 'Giriş yapılıyor…' : <>Giriş Yap <span style={{ fontSize: 16 }}>→</span></>}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <Icon name="shield" size={13} />
          <span style={{ fontSize: 11.5, color: '#94A3B8' }}>Güvenli ve şifrelenmiş bağlantı</span>
        </div>
      </div>

      {/* "Şifremi Unuttum?" modalı */}
      {forgotOpen && (
        <div
          onClick={(e) => e.target === e.currentTarget && setForgotOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}>
          <div style={{ width: '100%', maxWidth: 380, background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 20px 50px rgba(0,0,0,.2)' }}>
            {forgotSent ? (
              <>
                <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 12 }}>📬</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, textAlign: 'center', margin: '0 0 8px' }}>E-postanızı kontrol edin</h3>
                <p style={{ fontSize: 13, color: '#64748B', textAlign: 'center', margin: '0 0 20px', lineHeight: 1.6 }}>
                  Eğer <strong>{forgotEmail}</strong> sistemde kayıtlıysa, şifre sıfırlama bağlantısı gönderildi. Bağlantı 1 saat geçerlidir.
                </p>
                <button onClick={() => setForgotOpen(false)}
                  style={{ width: '100%', border: 'none', borderRadius: 10, padding: '11px 0', background: '#F1F5F9', color: '#334155', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>
                  Kapat
                </button>
              </>
            ) : (
              <>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>Şifremi Unuttum</h3>
                <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 16px' }}>
                  Hesabınıza kayıtlı e-posta adresinizi girin, size bir sıfırlama bağlantısı gönderelim.
                </p>
                <input
                  type="text" inputMode="email" value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleForgotSubmit()}
                  placeholder="e-posta@sirket.com" autoFocus
                  className="form-input" style={{ marginBottom: 16 }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setForgotOpen(false)}
                    style={{ flex: 1, border: 'none', borderRadius: 10, padding: '11px 0', background: '#F1F5F9', color: '#334155', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>
                    Vazgeç
                  </button>
                  <button onClick={handleForgotSubmit} disabled={forgotLoading || !forgotEmail.trim()}
                    style={{ flex: 1, border: 'none', borderRadius: 10, padding: '11px 0', background: meta.color, color: '#fff', fontWeight: 700, fontSize: 13.5, cursor: 'pointer', opacity: forgotLoading ? 0.7 : 1 }}>
                    {forgotLoading ? '…' : 'Gönder'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
