
export interface OfficialProcedure {
  procedureId: string;
  name: string;
  isPrimary: boolean;
}

export function officialProceduresFromRecord(data: any, surgeryId: number | string | null | undefined): OfficialProcedure[] {
  const surgeries: any[] = Array.isArray(data?.surgeries) ? data.surgeries : [];
  const surgery = surgeries.find((s) => String(s?.id) === String(surgeryId)) ?? surgeries[0];

  const procedures: OfficialProcedure[] = (surgery?.procedures ?? [])
    .filter((p: any) => p?.id !== null && p?.id !== undefined && String(p.id) !== '')
    .map((p: any) => ({ procedureId: String(p.id), name: p.description ?? p.name ?? '', isPrimary: !!p.isPrimary }))
    .sort((a: OfficialProcedure, b: OfficialProcedure) => Number(b.isPrimary) - Number(a.isPrimary));

  if (procedures.length && !procedures.some((p) => p.isPrimary)) procedures[0].isPrimary = true;

  return procedures;
}

export function sameProcedureSelection(
  a: Array<{ procedureId?: string | null; isPrimary?: boolean }> | null | undefined,
  b: Array<{ procedureId?: string | null; isPrimary?: boolean }> | null | undefined,
): boolean {
  return selectionKey(a) === selectionKey(b);
}

function selectionKey(items: Array<{ procedureId?: string | null; isPrimary?: boolean }> | null | undefined): string {
  const valid = (items ?? [])
    .filter((x) => !!x?.procedureId && String(x.procedureId).trim() !== '')
    .map((x) => ({ id: String(x.procedureId).trim(), isPrimary: !!x.isPrimary }));

  const ids = Array.from(new Set(valid.map((x) => x.id))).sort();
  const primary = valid.find((x) => x.isPrimary)?.id ?? valid[0]?.id ?? '';

  return `${ids.join(',')}|${primary}`;
}
