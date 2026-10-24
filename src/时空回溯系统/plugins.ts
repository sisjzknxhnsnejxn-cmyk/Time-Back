import type { SlotItem } from './types';

export interface BaiBaiSnapshot {
  apiVersion?: number;
  coverage?: {
    complete?: boolean;
    missingAiFloors?: number[];
  };
  state?: {
    time?: string;
    location?: string;
    locationPath?: string[];
  };
  protagonist?: {
    gender?: string;
    identity?: string;
    appearance?: string;
    outfit?: string;
    condition?: string;
  };
  vars?: Record<string, unknown>;
  items?: Array<Record<string, unknown> | string>;
  plans?: Array<Record<string, unknown> | string>;
  scenes?: Array<Record<string, unknown> | string>;
  npcs?: Array<{
    name?: string;
    affinityInner?: number | null;
    affinityOuter?: number | null;
    affinityNote?: string;
    [key: string]: unknown;
  }>;
  itemLog?: Array<Record<string, unknown> | string>;
  lifeDetails?: Array<{
    subject?: string;
    text?: string;
    topics?: string[];
  }>;
}

export interface BaiBaiFloorDto {
  body?: string;
  omitted?: boolean;
  memory?: {
    stored?: boolean;
    valid?: boolean;
    summary?: string;
    delta?: unknown;
  };
}

export interface BaiBaiBookApi {
  apiVersion?: number;
  pluginVersion?: string;
  getFloor: (floor: number) => BaiBaiFloorDto | null | undefined;
  getSnapshot?: (options?: { floor?: number; at?: 'before' | 'after' }) => BaiBaiSnapshot | null | undefined;
  getHistory?: (options?: { before?: number }) => {
    text?: string;
    relativeText?: string;
    coverage?: { complete?: boolean; missingAiFloors?: number[] };
  };
}

export interface AutoCardUpdaterApi {
  exportTableAsJson?: () => Record<string, unknown>;
  restoreTableAsJson?: (json: string) => Promise<boolean>;
  refreshDataAndWorldbook?: () => Promise<boolean>;
  getStoryContext?: (maxTurns?: number) => string;
  callAI?: (
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options?: { presetName?: string; max_tokens?: number | string; maxTokens?: number | string },
  ) => Promise<string | null>;
}

export interface HoraeApi {
  portApiVersion?: number;
  registerDataProvider?: (id: string, provider: () => unknown) => () => void;
  registerPort?: (definition: Record<string, unknown>) => () => void;
  refreshPorts?: (scope?: unknown) => void;
  getLatestState?: () => Record<string, unknown> | null;
}

export interface DetectedPluginInfo {
  id: 'baibai' | 'database' | 'horae' | 'st_memory' | 'mvu';
  name: string;
  available: boolean;
}

type ParentWindowWithPlugins = Window & {
  STBaiBaiBook?: BaiBaiBookApi;
  AutoCardUpdaterAPI?: AutoCardUpdaterApi;
  Horae?: HoraeApi;
  Mvu?: {
    getMvuData?: (options: { type?: 'message' | 'chat'; message_id?: number | 'latest' }) => {
      stat_data?: Record<string, unknown>;
      [key: string]: unknown;
    };
    replaceMvuData?: (
      data: Record<string, unknown>,
      options: { type?: 'message' | 'chat'; message_id?: number | 'latest' },
    ) => Promise<void>;
  };
};

export function getParentWin(): ParentWindowWithPlugins {
  return (window.parent ?? window) as ParentWindowWithPlugins;
}

export function getBaiBaiApi(): BaiBaiBookApi | undefined {
  return getParentWin().STBaiBaiBook ?? (globalThis as unknown as ParentWindowWithPlugins).STBaiBaiBook;
}

export function getDatabaseApi(): AutoCardUpdaterApi | undefined {
  return getParentWin().AutoCardUpdaterAPI ?? (globalThis as unknown as ParentWindowWithPlugins).AutoCardUpdaterAPI;
}

export function getHoraeApi(): HoraeApi | undefined {
  return getParentWin().Horae ?? (globalThis as unknown as ParentWindowWithPlugins).Horae;
}

export function getMvuApi() {
  return getParentWin().Mvu ?? (globalThis as unknown as ParentWindowWithPlugins).Mvu;
}

export function hasHoraeDataInChat(): boolean {
  if (getHoraeApi()) return true;
  try {
    const chat = SillyTavern?.chat as Array<Record<string, unknown>> | undefined;
    if (!Array.isArray(chat)) return false;
    return chat.some(m => Boolean(m?.horae_meta || (m?.extra as Record<string, unknown> | undefined)?.horae_meta));
  } catch {
    return false;
  }
}

export function hasStSummarizeMemoryInChat(): boolean {
  try {
    const chat = SillyTavern?.chat as Array<Record<string, unknown>> | undefined;
    if (!Array.isArray(chat)) return false;
    return chat.some(m => {
      const extra = m?.extra as Record<string, unknown> | undefined;
      return typeof extra?.memory === 'string' && extra.memory.trim().length > 0;
    });
  } catch {
    return false;
  }
}

export function hasMvuDataInChat(): boolean {
  try {
    const mvu = getMvuApi();
    if (!mvu?.getMvuData) return false;
    const latest = mvu.getMvuData({ type: 'message', message_id: 'latest' });
    return Boolean(latest && latest.stat_data && Object.keys(latest.stat_data).length > 0);
  } catch {
    return false;
  }
}

export function detectInstalledMemoryPlugins(): DetectedPluginInfo[] {
  return [
    { id: 'baibai', name: '柏宝书', available: Boolean(getBaiBaiApi()?.getFloor) },
    { id: 'database', name: '记忆表格', available: Boolean(getDatabaseApi()) },
    { id: 'horae', name: 'Horae', available: hasHoraeDataInChat() },
    { id: 'st_memory', name: '酒馆总结', available: hasStSummarizeMemoryInChat() },
    { id: 'mvu', name: 'MVU变量', available: hasMvuDataInChat() },
  ];
}

export function getActivePluginNames(): string[] {
  return detectInstalledMemoryPlugins()
    .filter(p => p.available)
    .map(p => p.name);
}

export function captureMvuSnapshot(floor: number): Record<string, unknown> | null {
  try {
    const mvu = getMvuApi();
    if (!mvu?.getMvuData) return null;
    const data = mvu.getMvuData({ type: 'message', message_id: floor });
    if (data && data.stat_data && Object.keys(data.stat_data).length > 0) {
      return JSON.parse(JSON.stringify(data));
    }
  } catch {
    // ignore
  }
  return null;
}

export function formatStructuredDelta(delta: unknown): string {
  if (!delta) return '';
  if (typeof delta === 'string') return delta.trim();
  if (typeof delta !== 'object') return String(delta);

  try {
    const obj = delta as Record<string, unknown>;
    const parts: string[] = [];

    for (const [key, val] of Object.entries(obj)) {
      if (val === null || val === undefined) continue;
      if (Array.isArray(val) && val.length === 0) continue;
      if (typeof val === 'object' && Object.keys(val as object).length === 0) continue;

      const textVal = typeof val === 'string' ? val : JSON.stringify(val);
      if (textVal && textVal !== '{}' && textVal !== '[]') {
        parts.push(`${key}: ${textVal}`);
      }
    }
    return parts.join('；');
  } catch {
    return '';
  }
}

export function extractHoraeFloorMeta(floorId: number): string | null {
  try {
    const rawChat = SillyTavern?.chat as Array<Record<string, unknown>> | undefined;
    const rawMes = rawChat?.[floorId];
    if (!rawMes) return null;

    const meta = (rawMes.horae_meta ?? (rawMes.extra as Record<string, unknown> | undefined)?.horae_meta) as
      | Record<string, unknown>
      | undefined;
    if (!meta || typeof meta !== 'object') return null;

    const lines: string[] = [];
    const ts = meta.timestamp as Record<string, unknown> | undefined;
    if (ts) {
      const dateStr = [ts.story_date, ts.story_time].filter(Boolean).join(' ');
      if (dateStr) lines.push(`时间: ${dateStr}`);
    }
    if (typeof meta.location === 'string' && meta.location.trim()) {
      lines.push(`地点: ${meta.location.trim()}`);
    }
    if (typeof meta.atmosphere === 'string' && meta.atmosphere.trim()) {
      lines.push(`氛围: ${meta.atmosphere.trim()}`);
    }

    if (meta.costumes && typeof meta.costumes === 'object') {
      const costumes = Object.entries(meta.costumes as Record<string, unknown>)
        .filter(([, v]) => Boolean(v))
        .map(([k, v]) => `${k}(${String(v)})`);
      if (costumes.length) lines.push(`服装: ${costumes.join('、')}`);
    }

    if (Array.isArray(meta.events) && meta.events.length > 0) {
      const evTexts = meta.events
        .map((ev: unknown) => {
          if (typeof ev === 'string') return ev;
          if (ev && typeof ev === 'object') {
            const e = ev as Record<string, unknown>;
            const mark = e.is_important ? '★' : '';
            return `${mark}${e.summary || e.description || e.title || JSON.stringify(e)}`;
          }
          return '';
        })
        .filter(Boolean);
      if (evTexts.length) lines.push(`事件: ${evTexts.join('；')}`);
    }

    if (meta.affection && typeof meta.affection === 'object') {
      const affs = Object.entries(meta.affection as Record<string, unknown>)
        .filter(([, v]) => v !== null && v !== undefined && v !== '')
        .map(([k, v]) => `${k}:${String(v)}`);
      if (affs.length) lines.push(`好感变化: ${affs.join('、')}`);
    }

    if (Array.isArray(meta.items) && meta.items.length > 0) {
      const itemTexts = meta.items
        .map((it: unknown) => {
          if (typeof it === 'string') return it;
          if (it && typeof it === 'object') {
            const itemObj = it as Record<string, unknown>;
            return `${itemObj.name || ''}${itemObj.holder ? `(持有:${itemObj.holder})` : ''}${itemObj.status ? `[${itemObj.status}]` : ''}`;
          }
          return '';
        })
        .filter(Boolean);
      if (itemTexts.length) lines.push(`物品变更: ${itemTexts.join('、')}`);
    }

    return lines.length > 0 ? `Horae记录 -> ${lines.join(' | ')}` : null;
  } catch {
    return null;
  }
}


export function extractDatabaseFloorMeta(floorId: number, message: ChatMessage): string | null {
  try {
    const rawChat = SillyTavern?.chat as Array<Record<string, unknown>> | undefined;
    const rawMes = rawChat?.[floorId] ?? {};
    const extra = { ...(rawMes.extra as Record<string, unknown> | undefined), ...(message.extra ?? {}) };
    const data = { ...(rawMes.data as Record<string, unknown> | undefined), ...(message.data ?? {}) };

    const candidates = [
      extra.acu_summary,
      extra.table_summary,
      extra.database_summary,
      data.acu_summary,
      data.table_summary,
      rawMes.TavernDB_ACU_Summary,
    ];
    for (const c of candidates) {
      if (typeof c === 'string' && c.trim()) {
        return `记忆表格摘要 -> ${c.trim()}`;
      }
    }

    const isolated = (rawMes.TavernDB_ACU_IsolatedData ?? extra.TavernDB_ACU_IsolatedData) as
      | Record<string, unknown>
      | undefined;
    if (isolated && typeof isolated === 'object') {
      const sheetNotes: string[] = [];
      for (const tagData of Object.values(isolated)) {
        if (!tagData || typeof tagData !== 'object') continue;
        const indep = (tagData as Record<string, unknown>).independentData as Record<string, unknown> | undefined;
        if (!indep) continue;
        for (const sheet of Object.values(indep)) {
          if (!sheet || typeof sheet !== 'object') continue;
          const s = sheet as { name?: string; content?: unknown[][] };
          if (s.name && Array.isArray(s.content) && s.content.length > 1) {
            const lastRow = s.content[s.content.length - 1];
            if (Array.isArray(lastRow)) {
              sheetNotes.push(`${s.name}: ${lastRow.filter(Boolean).join('/')}`);
            }
          }
        }
      }
      if (sheetNotes.length > 0) {
        return `记忆表格本层快照 -> ${sheetNotes.slice(0, 4).join('；')}`;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function extractStSummarizeFloorMeta(floorId: number, message: ChatMessage): string | null {
  try {
    const rawChat = SillyTavern?.chat as Array<Record<string, unknown>> | undefined;
    const rawMes = rawChat?.[floorId] ?? {};
    const extra = { ...(rawMes.extra as Record<string, unknown> | undefined), ...(message.extra ?? {}) };
    if (typeof extra.memory === 'string' && extra.memory.trim()) {
      return `酒馆总结记忆 -> ${extra.memory.trim()}`;
    }
    return null;
  } catch {
    return null;
  }
}

export function buildBaiBaiSnapshotDiff(anchorFloor: number, currentFloor: number): string {
  const api = getBaiBaiApi();
  if (!api?.getSnapshot) return '';

  try {
    const beforeSnap = api.getSnapshot({ floor: anchorFloor, at: 'after' });
    const afterSnap = api.getSnapshot({ floor: currentFloor, at: 'after' });
    if (!beforeSnap && !afterSnap) return '';

    const lines: string[] = [];

    const bTime = beforeSnap?.state?.time || '未知';
    const aTime = afterSnap?.state?.time || '未知';
    const bLoc = beforeSnap?.state?.locationPath?.join('/') || beforeSnap?.state?.location || '未知';
    const aLoc = afterSnap?.state?.locationPath?.join('/') || afterSnap?.state?.location || '未知';

    if (bTime !== aTime || bLoc !== aLoc) {
      lines.push(`- 时空状态变化：从「${bTime} @ ${bLoc}」推进至「${aTime} @ ${aLoc}」`);
    }

    const bCond = [beforeSnap?.protagonist?.outfit, beforeSnap?.protagonist?.condition].filter(Boolean).join(' / ');
    const aCond = [afterSnap?.protagonist?.outfit, afterSnap?.protagonist?.condition].filter(Boolean).join(' / ');
    if (bCond !== aCond && aCond) {
      lines.push(`- 主角装扮/状态：由「${bCond || '初始'}」变为「${aCond}」`);
    }

    if (Array.isArray(afterSnap?.npcs) && afterSnap.npcs.length > 0) {
      const beforeNpcMap = new Map<string, { inner?: number | null; outer?: number | null; note?: string }>();
      for (const npc of beforeSnap?.npcs ?? []) {
        if (npc?.name) {
          beforeNpcMap.set(npc.name, {
            inner: npc.affinityInner,
            outer: npc.affinityOuter,
            note: npc.affinityNote,
          });
        }
      }

      const npcChanges: string[] = [];
      for (const npc of afterSnap.npcs) {
        if (!npc?.name) continue;
        const prev = beforeNpcMap.get(npc.name);
        if (!prev) {
          npcChanges.push(
            `${npc.name}(新登场, 表面好感:${npc.affinityOuter ?? '-'}, 内心好感:${npc.affinityInner ?? '-'}${npc.affinityNote ? `, 备注:${npc.affinityNote}` : ''})`,
          );
        } else if (
          prev.inner !== npc.affinityInner ||
          prev.outer !== npc.affinityOuter ||
          prev.note !== npc.affinityNote
        ) {
          npcChanges.push(
            `${npc.name}(好感:${prev.outer ?? '-'}→${npc.affinityOuter ?? '-'} / 内心:${prev.inner ?? '-'}→${npc.affinityInner ?? '-'}${npc.affinityNote ? `, 态度:${npc.affinityNote}` : ''})`,
          );
        }
      }
      if (npcChanges.length > 0) {
        lines.push(`- 角色关系与好感变化：${npcChanges.join('；')}`);
      }
    }

    if (afterSnap?.vars && typeof afterSnap.vars === 'object') {
      const beforeVars = beforeSnap?.vars ?? {};
      const varDiffs: string[] = [];
      for (const [k, v] of Object.entries(afterSnap.vars)) {
        const bv = beforeVars[k];
        if (JSON.stringify(bv) !== JSON.stringify(v)) {
          varDiffs.push(`${k}: ${JSON.stringify(bv ?? '无')} → ${JSON.stringify(v)}`);
        }
      }
      if (varDiffs.length > 0) {
        lines.push(`- 关键变量变化：${varDiffs.join('；')}`);
      }
    }

    if (Array.isArray(afterSnap?.items) && afterSnap.items.length > 0) {
      const itemNames = afterSnap.items
        .map(it =>
          typeof it === 'string'
            ? it
            : String((it as Record<string, unknown>).name || (it as Record<string, unknown>).title || ''),
        )
        .filter(Boolean);
      if (itemNames.length > 0) {
        lines.push(`- 回溯前持有物品：${itemNames.slice(0, 12).join('、')}`);
      }
    }

    return lines.length > 0 ? `【柏宝书·区间状态对比（第 ${anchorFloor} 层 → 第 ${currentFloor} 层）】：\n${lines.join('\n')}` : '';
  } catch {
    return '';
  }
}

function formatDatabaseTableCompact(tableObj: Record<string, unknown>): string {
  const lines: string[] = [];
  for (const [key, val] of Object.entries(tableObj)) {
    if (!val || typeof val !== 'object') continue;
    const sheet = val as { name?: string; content?: unknown[][] };
    const tableName = sheet.name || key;
    if (Array.isArray(sheet.content) && sheet.content.length > 1) {
      const headers = Array.isArray(sheet.content[0]) ? sheet.content[0].map(h => String(h ?? '')).filter(Boolean) : [];
      const rows = sheet.content.slice(1).map(row => {
        if (!Array.isArray(row)) return '';
        return row
          .map((cell, idx) => {
            if (cell === null || cell === undefined || cell === '') return '';
            const colName = headers[idx] || `列${idx}`;
            return `${colName}:${String(cell)}`;
          })
          .filter(Boolean)
          .join(', ');
      });
      const validRows = rows.filter(Boolean);
      if (validRows.length > 0) {
        lines.push(`  [${tableName}] ${validRows.slice(-5).join(' | ')}`);
      }
    }
  }
  return lines.join('\n');
}

export function buildDatabaseTableDiff(anchorSnapshotJson: string | null | undefined): string {
  const api = getDatabaseApi();
  if (!api?.exportTableAsJson) return '';

  try {
    const currentData = api.exportTableAsJson();
    if (!currentData || typeof currentData !== 'object') return '';

    const currentCompact = formatDatabaseTableCompact(currentData);
    if (!currentCompact) return '';

    if (!anchorSnapshotJson) {
      return `【记忆表格·回溯前最新表数据】：\n${currentCompact}`;
    }

    const beforeData = JSON.parse(anchorSnapshotJson) as Record<string, unknown>;
    const beforeCompact = formatDatabaseTableCompact(beforeData);

    if (beforeCompact === currentCompact) {
      return `【记忆表格·当前状态】：\n${currentCompact}`;
    }

    return `【记忆表格·区间状态对比】：\n- 存档锚点表状态：\n${beforeCompact || '  (空)'}\n- 回溯前最新表状态：\n${currentCompact}`;
  } catch {
    return '';
  }
}

export function normalizeOpenAiBaseUrl(rawUrl: string): string {
  return rawUrl
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/chat\/completions$/i, '')
    .replace(/\/models$/i, '')
    .replace(/\/+$/, '');
}

export function buildMvuSnapshotDiff(anchorSlot: SlotItem, currentFloor: number): string {
  try {
    const mvu = getMvuApi();
    if (!mvu?.getMvuData) return '';
    const currentMvu =
      mvu.getMvuData({ type: 'message', message_id: currentFloor }) ??
      mvu.getMvuData({ type: 'message', message_id: 'latest' });
    const afterStat = currentMvu?.stat_data;
    if (!afterStat || typeof afterStat !== 'object' || Object.keys(afterStat).length === 0) return '';

    const beforeMvu =
      anchorSlot.mvu_snapshot ?? mvu.getMvuData({ type: 'message', message_id: anchorSlot.floor }) ?? null;
    const beforeStat =
      (beforeMvu as { stat_data?: Record<string, unknown> } | null)?.stat_data ??
      (beforeMvu && typeof beforeMvu === 'object' && !('stat_data' in beforeMvu)
        ? (beforeMvu as Record<string, unknown>)
        : undefined);

    if (!beforeStat || typeof beforeStat !== 'object') {
      return `【MVU·回溯前状态变量】：\n${JSON.stringify(afterStat)}`;
    }

    const diffs: string[] = [];
    const allKeys = new Set([...Object.keys(beforeStat), ...Object.keys(afterStat)]);
    for (const k of allKeys) {
      const bv = beforeStat[k];
      const av = afterStat[k];
      if (JSON.stringify(bv) !== JSON.stringify(av)) {
        diffs.push(`- ${k}: ${JSON.stringify(bv ?? '无')} → ${JSON.stringify(av ?? '已移除')}`);
      }
    }
    return diffs.length > 0 ? `【MVU·区间变量变化】：\n${diffs.join('\n')}` : '';
  } catch {
    return '';
  }
}
