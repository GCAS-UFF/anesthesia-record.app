import { Injectable } from '@angular/core';

export type TimelineGroupId =
  | 'resources' | 'agents' | 'chart' | 'pressure' | 'monitor' | 'fluids' | 'position' | 'events';

export interface TimelineGroupDef {
  id: TimelineGroupId;
  labelKey: string;
  /** Fixo: não pode ser ocultado nem arrastado (gráfico e valores de PA/FC). */
  locked: boolean;
}

export interface MonitoringLayout {
  order: TimelineGroupId[];
  hidden: TimelineGroupId[];
}

export const TIMELINE_GROUPS: TimelineGroupDef[] = [
  { id: 'resources', labelKey: 'monitorizacao.shell.customize.groups.resources', locked: false },
  { id: 'agents', labelKey: 'monitorizacao.shell.customize.groups.agents', locked: false },
  { id: 'chart', labelKey: 'monitorizacao.shell.customize.groups.chart', locked: true },
  { id: 'pressure', labelKey: 'monitorizacao.shell.customize.groups.pressure', locked: true },
  { id: 'monitor', labelKey: 'monitorizacao.shell.customize.groups.monitor', locked: false },
  { id: 'fluids', labelKey: 'monitorizacao.shell.customize.groups.fluids', locked: false },
  { id: 'position', labelKey: 'monitorizacao.shell.customize.groups.position', locked: false },
  { id: 'events', labelKey: 'monitorizacao.shell.customize.groups.events', locked: false },
];

const STORAGE_VERSION = 1;
const storageKey = (userId: string | number) => `monitoring_layout_v${STORAGE_VERSION}_${userId}`;

/**
 * Preferência de apresentação da linha do tempo, por usuário e por aparelho
 * (localStorage). Não entra no rascunho do paciente nem no payload da API:
 * ocultar um grupo só esconde a linha da tela, os dados continuam gravados.
 */
@Injectable({ providedIn: 'root' })
export class MonitoringLayoutService {
  defaultLayout(): MonitoringLayout {
    return { order: TIMELINE_GROUPS.map((g) => g.id), hidden: [] };
  }

  load(userId: string | number | null | undefined): MonitoringLayout {
    if (userId == null) return this.defaultLayout();
    try {
      const raw = localStorage.getItem(storageKey(userId));
      return raw ? this.sanitize(JSON.parse(raw)) : this.defaultLayout();
    } catch {
      return this.defaultLayout();
    }
  }

  save(userId: string | number | null | undefined, layout: MonitoringLayout): void {
    if (userId == null) return;
    try {
      localStorage.setItem(storageKey(userId), JSON.stringify(this.sanitize(layout)));
    } catch (err) {
      console.warn('[MonitoringLayout] falha ao salvar preferência de layout', err);
    }
  }

  /** Ordem visível final: grupos conhecidos, sem ocultos, fixos sempre presentes. */
  visibleGroups(layout: MonitoringLayout): TimelineGroupId[] {
    return this.sanitize(layout).order.filter((id) => !layout.hidden.includes(id));
  }

  /** Versão antiga/corrompida ou grupo novo no app: descarta desconhecidos e acrescenta os que faltarem. */
  private sanitize(input: Partial<MonitoringLayout> | null | undefined): MonitoringLayout {
    const known = TIMELINE_GROUPS.map((g) => g.id);
    const lockedIds = TIMELINE_GROUPS.filter((g) => g.locked).map((g) => g.id);
    const order = (Array.isArray(input?.order) ? input!.order : []).filter((id): id is TimelineGroupId => known.includes(id as TimelineGroupId));
    const unique = [...new Set(order)];
    for (const id of known) if (!unique.includes(id)) unique.push(id);
    const hidden = (Array.isArray(input?.hidden) ? input!.hidden : [])
      .filter((id): id is TimelineGroupId => known.includes(id as TimelineGroupId) && !lockedIds.includes(id as TimelineGroupId));
    return { order: unique, hidden: [...new Set(hidden)] };
  }
}
