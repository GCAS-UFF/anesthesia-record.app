export function hasLocalMonitoringStarted(surgeryId: string | number | null | undefined): boolean {
  if (surgeryId == null) return false;
  try {
    const raw = localStorage.getItem(`draft_monitoring_${surgeryId}`);
    if (!raw) return false;
    const draft = JSON.parse(raw);
    return !!draft?.anesthesiaStartTime;
  } catch {
    return false;
  }
}
