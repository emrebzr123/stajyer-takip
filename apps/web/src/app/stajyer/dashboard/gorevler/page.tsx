'use client';
import React, { useEffect, useState } from 'react';
import api, { stajyerTasksApi } from '@/lib/api';
import toast from 'react-hot-toast';
import Icon from '@/components/ui/Icon';

const STATUS_COLOR: Record<string, string> = {
  'Planlandı':   '#9CA3AF',
  'Devam Ediyor':'#F97316',
  'Beklemede':   '#9333EA',
  'Tamamlandı':  '#22C55E',
  'Gecikmiş':    '#EF4444',
};

function TaskCard({ task, onUpdate, onDeleted }: { task: any; onUpdate: () => void; onDeleted: (id: string) => void }) {
  const [subtasks, setSubtasks] = useState<any[]>(task.subtasks || []);
  const [status, setStatus] = useState<string>(task.status);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Alt görevi (checklist) OLMAYAN görevler için manuel tamamlama —
  // önceden checklist yoksa görevi tamamlamanın HİÇBİR yolu yoktu, çünkü
  // ilerleme sadece subtask'lardan hesaplanıyordu (subtasks.length===0 iken
  // progress hep task.progress'te sabit kalıyor, checkbox da hiç yoktu).
  const [manualBusy, setManualBusy] = useState(false);
  // Yorumlar — mentörle görev üzerinden yazışma
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<any[] | null>(null);
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  useEffect(() => { setSubtasks(task.subtasks || []); setStatus(task.status); }, [task]);

  const openComments = async () => {
    const next = !commentsOpen;
    setCommentsOpen(next);
    if (next && comments === null) {
      try {
        const r = await api.get(`/tasks/${task.id}/comments`);
        setComments(r.data || []);
      } catch { setComments([]); }
    }
  };

  const sendComment = async () => {
    const content = newComment.trim();
    if (!content) return;
    setSendingComment(true);
    try {
      const r = await api.post(`/tasks/${task.id}/comments`, { content });
      setComments(prev => [...(prev || []), r.data]);
      setNewComment('');
      toast.success('💬 Yorumunuz mentörünüze iletildi.');
    } catch {
      toast.error('Yorum gönderilemedi.');
    } finally { setSendingComment(false); }
  };

  // Alt görevi olmayan görevlerde ilerleme, manuel işaretlemeyle değişebildiği
  // için ayrı bir state'te tutulur (prop'tan gelen task.progress, üst
  // bileşen sessizce yenilenene kadar bayat kalabilirdi).
  const [manualProgress, setManualProgress] = useState<number>(task.progress || 0);
  useEffect(() => { setManualProgress(task.progress || 0); }, [task.progress]);

  // Dinamik ilerleme hesapla — checkbox'a her basışta anlık güncellenir
  const progress = subtasks.length
    ? Math.round((subtasks.filter(s => s.isCompleted).length / subtasks.length) * 100)
    : manualProgress;

  // NOT: Durum gösterimi artık doğrudan `status === 'Tamamlandı'` ile
  // yapılıyor (aşağıdaki aksiyon alanında) — checklist olsun olmasın
  // tutarlı çalışır.

  // Checkbox işaretle/kaldır — backend hem alt görevi hem de bağlı olduğu
  // görevin ilerleme yüzdesini/durumunu TEK istekte, atomik olarak günceller
  // ve güncel görevi geri döner; ayrıca bir ikinci PATCH isteğine gerek yok.
  //
  // NOT: onUpdate() SESSİZ bir arka plan yenilemesidir (üst bileşende sayfa
  // "loading" durumuna geçmez) — önceden tam sayfa yeniden yükleniyordu,
  // bu da listenin anlık olarak boşalıp yeniden çizilmesine ve tarayıcının
  // kaydırma konumunu kaybederek EKRANIN YUKARI SIÇRAMASINA neden oluyordu.
  const toggleSubtask = async (subtaskId: string, current: boolean) => {
    setToggling(subtaskId);
    // İyimser (optimistic) güncelleme — anında hissedilsin
    setSubtasks(prev => prev.map(s => s.id === subtaskId ? { ...s, isCompleted: !current } : s));
    try {
      const res = await api.patch(`/subtasks/${subtaskId}/toggle`, { isCompleted: !current });
      if (res.data?.status) setStatus(res.data.status);
      onUpdate();
    } catch {
      // Başarısızsa geri al
      setSubtasks(prev => prev.map(s => s.id === subtaskId ? { ...s, isCompleted: current } : s));
      toast.error('Güncellenemedi.');
    } finally { setToggling(null); }
  };

  // "Çöp Kutusu" — GERÇEK bir silme DEĞİLDİR. Görev veritabanında kalır;
  // Haftalık Plan'da (hem sizde hem yönetici tarafında) ve İş Takip
  // Listesi'nde görünmeye devam eder. Sadece bu tamamlanmış görev, kalabalık
  // yapmasın diye SİZİN "Görevlerim" ekranınızdan kaldırılır.
  const deleteTask = async () => {
    setDeleting(true);
    try {
      await stajyerTasksApi.hideMine(task.id);
      toast.success('Görev listenizden kaldırıldı. (Haftalık planınızda ve yöneticinizde görünmeye devam eder.)');
      onDeleted(task.id);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Kaldırılamadı.');
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  // Alt görevi olmayan görevlerde manuel tamamlama/geri alma. Checklist'i
  // olan görevlerde ilerleme yalnızca checkbox'larla sürülür; bu yüzden bu
  // buton SADECE subtasks.length === 0 iken gösterilir.
  const markManually = async (done: boolean) => {
    setManualBusy(true);
    try {
      const res = await stajyerTasksApi.updateStatus(task.id, done ? 'Tamamlandı' : 'Devam Ediyor', done ? 100 : 0);
      setStatus(res.data?.status || (done ? 'Tamamlandı' : 'Devam Ediyor'));
      setManualProgress(res.data?.progress ?? (done ? 100 : 0));
      onUpdate();
      toast.success(done ? '✅ Görev tamamlandı!' : 'Görev geri alındı.');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Güncellenemedi.');
    } finally { setManualBusy(false); }
  };

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      {/* Başlık ve durum */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:12 }}>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
            <span style={{
              padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:700,
              background: STATUS_COLOR[status]+'20', color: STATUS_COLOR[status],
            }}>{status}</span>
            {task.priority === 'Yüksek' && <span style={{ fontSize:11, color:'#EF4444', fontWeight:700 }}>⚠️ Yüksek</span>}
          </div>
          <div style={{ fontWeight:700, fontSize:17 }}>{task.title}</div>
          {task.description && <div style={{ color:'var(--text-secondary)', fontSize:13, marginTop:4 }}>{task.description}</div>}
          <div style={{ fontSize:12, color:'var(--text-secondary)', marginTop:6 }}>
            📅 Son Teslim: <strong>{new Date(task.dueDate).toLocaleDateString('tr-TR')}</strong>
          </div>
        </div>

        {/* Aksiyon alanı — iki senaryo:
            1) Checklist YOK: manuel "Tamamla" butonu (önceden bu görevler
               HİÇBİR ŞEKİLDE tamamlanamıyordu, çünkü ilerleme sadece
               checklist'ten hesaplanıyordu ve checklist'siz görevde bu
               değer hep sabit kalıyordu).
            2) Görev tamamlandıysa (checklist'li ya da değil): "Tamamlandı"
               rozeti + görevi kalıcı silme ikonu. "Güncelleme" (kalem)
               ikonu kaldırıldı — çöp kutusu artık doğrudan SİLER. */}
        <div style={{ flexShrink:0, display:'flex', alignItems:'center', gap:6 }}>
          {status === 'Tamamlandı' ? (
            <>
              <span style={{ fontSize:13, fontWeight:700, color:'#22C55E', display:'flex', alignItems:'center', gap:4 }}>
                <Icon name="checkCircle" size={18} /> Tamamlandı
              </span>
              {!subtasks.length && (
                <button onClick={() => markManually(false)} disabled={manualBusy} title="Geri al"
                  style={{ border:'none', background:'#F1F5F9', borderRadius:6, padding:'6px 10px', cursor:'pointer', color:'var(--text-secondary)', fontSize:11, fontWeight:600 }}>
                  {manualBusy ? '…' : '↺ Geri Al'}
                </button>
              )}
              {confirmDelete ? (
                <span style={{ display:'flex', gap:4 }}>
                  <button onClick={deleteTask} disabled={deleting} title="Evet, listemden kaldır (haftalık planımda ve yöneticimde görünmeye devam eder)"
                    style={{ border:'none', background:'#EF4444', color:'#fff', borderRadius:6, padding:'6px 8px', cursor:'pointer', fontSize:11, fontWeight:700 }}>
                    {deleting ? '…' : 'Emin misin?'}
                  </button>
                  <button onClick={() => setConfirmDelete(false)}
                    style={{ border:'none', background:'#F1F5F9', borderRadius:6, padding:'6px 8px', cursor:'pointer', fontSize:11 }}>
                    Vazgeç
                  </button>
                </span>
              ) : (
                <button onClick={() => setConfirmDelete(true)} title="Listemden kaldır (haftalık plan ve yönetici ekranında kalır)"
                  style={{ border:'none', background:'#FEF2F2', borderRadius:6, padding:6, cursor:'pointer', color:'#EF4444', display:'flex' }}>
                  <Icon name="trash" size={15} />
                </button>
              )}
            </>
          ) : !subtasks.length ? (
            // Checklist yok ve henüz tamamlanmadı — tek manuel tamamlama yolu budur.
            <button onClick={() => markManually(true)} disabled={manualBusy}
              style={{ border:'none', background:'#22C55E', color:'#fff', borderRadius:8, padding:'8px 14px', cursor:'pointer', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', gap:6 }}>
              <Icon name="checkCircle" size={15} /> {manualBusy ? 'İşleniyor…' : 'Tamamlandı Olarak İşaretle'}
            </button>
          ) : null}
        </div>
      </div>

      {/* İlerleme barı */}
      <div style={{ marginBottom: subtasks.length ? 14 : 0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
          <span style={{ color:'var(--text-secondary)' }}>İlerleme</span>
          <span style={{ fontWeight:800, color: progress === 100 ? '#22C55E' : 'var(--text-primary)' }}>{progress}%</span>
        </div>
        <div style={{ background:'#F1F5F9', borderRadius:8, height:10, overflow:'hidden' }}>
          <div style={{
            height:'100%', width:`${progress}%`,
            background: progress === 100 ? '#22C55E' : progress > 50 ? '#3B82F6' : '#F97316',
            borderRadius:8, transition:'width .4s ease',
          }} />
        </div>
      </div>

      {/* Checklist — checkbox her zaman tıklanabilir; işaretleme kaldırıldığında
          (geri alındığında) yüzde otomatik düşer ve durum "Tamamlandı"dan çıkar. */}
      {subtasks.length > 0 && (
        <div style={{ borderTop:'1px solid var(--border)', paddingTop:12 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text-secondary)', marginBottom:8, textTransform:'uppercase', letterSpacing:0.5 }}>
            Alt Görevler ({subtasks.filter(s=>s.isCompleted).length}/{subtasks.length})
          </div>
          {subtasks.map((s: any) => (
            <label key={s.id} style={{
              display:'flex', alignItems:'center', gap:10, padding:'8px 0',
              borderBottom:'1px solid #F1F5F9', cursor:'pointer',
              opacity: toggling === s.id ? 0.6 : 1, transition:'opacity .2s',
            }}>
              <input
                type="checkbox"
                checked={s.isCompleted}
                disabled={toggling === s.id}
                onChange={() => toggleSubtask(s.id, s.isCompleted)}
                style={{ width:18, height:18, cursor:'pointer', accentColor:'#22C55E' }}
              />
              <span style={{
                fontSize:14, fontWeight:500,
                textDecoration: s.isCompleted ? 'line-through' : 'none',
                color: s.isCompleted ? 'var(--text-secondary)' : 'var(--text-primary)',
                transition:'all .2s',
              }}>
                {s.title}
              </span>
              {s.isCompleted && <span style={{ marginLeft:'auto', fontSize:16 }}>✅</span>}
            </label>
          ))}
        </div>
      )}

      {/* Yorumlar — mentörle bu görev üzerinden yazışın */}
      <div style={{ borderTop:'1px solid var(--border)', marginTop:12, paddingTop:10 }}>
        <button onClick={openComments}
          style={{ border:'none', background:'none', cursor:'pointer', fontSize:12, fontWeight:700, color:'var(--text-secondary)', padding:0 }}>
          💬 Yorumlar {comments !== null ? `(${comments.length})` : ''} {commentsOpen ? '▲' : '▼'}
        </button>
        {commentsOpen && (
          <div style={{ marginTop:10 }}>
            {comments === null ? (
              <div style={{ fontSize:13, color:'var(--text-secondary)' }}>Yükleniyor…</div>
            ) : comments.length === 0 ? (
              <div style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:8 }}>Henüz yorum yok — mentörünüze soru sorabilirsiniz.</div>
            ) : comments.map((c: any) => (
              <div key={c.id} style={{ marginBottom:8, padding:'8px 10px', background:'#F8FAFC', borderRadius:8 }}>
                <div style={{ fontSize:11, fontWeight:700, marginBottom:2 }}>
                  {c.author?.name || 'Bilinmiyor'}
                  <span style={{ fontWeight:400, color:'var(--text-secondary)', marginLeft:6 }}>
                    {new Date(c.createdAt).toLocaleString('tr-TR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                  </span>
                </div>
                <div style={{ fontSize:13, whiteSpace:'pre-wrap' }}>{c.content}</div>
              </div>
            ))}
            <div style={{ display:'flex', gap:6, marginTop:6 }}>
              <input
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendComment()}
                placeholder="Mentörünüze not yazın…"
                style={{ flex:1, padding:'8px 10px', borderRadius:8, border:'1px solid var(--border)', fontSize:13 }}
              />
              <button onClick={sendComment} disabled={sendingComment || !newComment.trim()}
                style={{ padding:'0 14px', borderRadius:8, border:'none', background:'var(--primary)', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }}>
                {sendingComment ? '…' : 'Gönder'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GorevlerimPage() {
  const [tasks, setTasks]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('');

  const load = () => {
    setLoading(true);
    // excludeHidden=true: bu stajyerin kendi listesinden kaldırdığı
    // (tamamlanmış) görevler burada gösterilmez — ama Haftalık Plan bu
    // parametreyi göndermediği için orada görünmeye devam ederler.
    api.get('/tasks/my?limit=100&excludeHidden=true').then(r => setTasks(r.data.data || [])).finally(() => setLoading(false));
  };

  // Checkbox işaretlemesi sonrası kullanılan SESSİZ yenileme — `loading`
  // bayrağını değiştirmez, bu yüzden liste anlık olarak boşalıp yeniden
  // çizilmez. Önceki `load()` çağrısı tam sayfa "Yükleniyor…" durumuna
  // geçiyordu; bu da yüksekliği değiştirip tarayıcının kaydırma konumunu
  // sıfırlamasına (ekranın yukarı sıçramasına) neden oluyordu. İstatistik
  // kartları ve diğer görevlerin durumu yine güncel kalsın diye veri
  // arka planda yenilenir, sadece görünür "Yükleniyor…" ekranı atlanır.
  const silentRefresh = () => {
    api.get('/tasks/my?limit=100&excludeHidden=true').then(r => setTasks(r.data.data || [])).catch(() => undefined);
  };

  // Görev silindiğinde listeden anında çıkar — ekstra bir istek/scroll
  // sıçraması olmadan.
  const handleDeleted = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  useEffect(() => { load(); }, []);

  const filtered = filter ? tasks.filter(t => t.status === filter) : tasks;

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:26, fontWeight:800, margin:0 }}>📋 Görevlerim</h1>
        <p style={{ color:'var(--text-secondary)', margin:'4px 0 0' }}>Size atanmış tüm görevler</p>
      </div>

      {/* İstatistik */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {[
          { label:'Toplam',     value: tasks.length,                                     color:'#3B82F6' },
          { label:'Tamamlandı', value: tasks.filter(t=>t.status==='Tamamlandı').length,  color:'#22C55E' },
          { label:'Devam Eden', value: tasks.filter(t=>t.status==='Devam Ediyor').length, color:'#F97316' },
          { label:'Gecikmiş',   value: tasks.filter(t=>t.status==='Gecikmiş').length,    color:'#EF4444' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign:'center', padding:'12px 8px' }}>
            <div style={{ fontSize:24, fontWeight:800, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:12, color:'var(--text-secondary)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filtreler */}
      <div style={{ marginBottom:16, display:'flex', gap:8, flexWrap:'wrap' }}>
        {['','Planlandı','Devam Ediyor','Beklemede','Tamamlandı','Gecikmiş'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            style={{
              padding:'6px 14px', borderRadius:20, border:'none', cursor:'pointer',
              fontWeight:600, fontSize:12,
              background: filter===s ? 'var(--primary)' : '#F1F5F9',
              color: filter===s ? '#fff' : 'var(--text-secondary)',
            }}>
            {s || 'Tümü'}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:40, color:'var(--text-secondary)' }}>Yükleniyor…</div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign:'center', padding:40, color:'var(--text-secondary)' }}>Görev bulunamadı.</div>
      ) : (
        filtered.map(task => <TaskCard key={task.id} task={task} onUpdate={silentRefresh} onDeleted={handleDeleted} />)
      )}
    </div>
  );
}
