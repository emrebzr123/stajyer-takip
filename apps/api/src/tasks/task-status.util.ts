// İlerleme yüzdesine göre görev durumunu hesaplar — GECİKMİŞ FARKINDALIKLI.
// Önceki mantık %100 altındaki her şeyi Planlandı/Devam Ediyor yapıyordu;
// bu da teslim tarihi geçmiş bir görevin "Gecikmiş" durumunu, stajyer bir
// checkbox'a dokunur dokunmaz siliyordu. Artık tarih geçmişse ve görev
// bitmemişse durum Gecikmiş olarak hesaplanır/korunur.
//
// Ayrı dosyada olma nedeni: hem TasksService hem SubTasksService kullanıyor;
// birbirlerinden import etselerdi döngüsel bağımlılık oluşurdu.
export function computeTaskStatus(
  progress: number,
  dueDate: string | null | undefined,
  keepOnHold?: string,
): string {
  if (progress >= 100) return 'Tamamlandı';
  if (dueDate) {
    const due = new Date(dueDate);
    due.setHours(23, 59, 59, 999);
    if (due.getTime() < Date.now()) return 'Gecikmiş';
  }
  if (keepOnHold === 'Beklemede') return 'Beklemede';
  return progress > 0 ? 'Devam Ediyor' : 'Planlandı';
}
