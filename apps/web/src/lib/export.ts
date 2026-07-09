// Ortak dışa aktarma yardımcıları. Önceden yalnızca Raporlar sayfasında yerel
// bir CSV fonksiyonu vardı; İş Takip, Stajyerler ve Haftalık Plan'daki
// "Dışa Aktar" butonlarının onClick'i bile yoktu (tamamen ölüydüler).
// Artık her sayfa buradaki exportToExcel'i kullanır — gerçek .xlsx üretir,
// Türkçe karakterler Excel'de bozulmaz (CSV'deki kodlama sorunları yaşanmaz).
import * as XLSX from 'xlsx';

export function exportToExcel(
  rows: Record<string, any>[],
  filename: string,
  sheetName = 'Sayfa1',
): void {
  if (!rows.length) return;

  const ws = XLSX.utils.json_to_sheet(rows);

  // Sütun genişliklerini içeriğe göre kabaca ayarla (max 60 karakter)
  const headers = Object.keys(rows[0]);
  ws['!cols'] = headers.map((h) => {
    const maxLen = Math.max(h.length, ...rows.map((r) => String(r[h] ?? '').length));
    return { wch: Math.min(60, Math.max(10, maxLen + 2)) };
  });

  const wb = XLSX.utils.book_new();
  // Excel sayfa adı 31 karakteri geçemez
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${filename}_${date}.xlsx`);
}
