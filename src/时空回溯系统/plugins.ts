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
  callAI?: (
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options?: Record<string, unknown>,
  ) => Promise<string | null>;
}

export interface AutoCardUpdaterApi {
  exportTableAsJson?: () => Record<string, unknown>;
  restoreTableAsJson?: (json: string) => Promise<boolean>;
  refreshDataAndWorldbook?: () => Promise<boolean>;
  getStoryContext?: (maxTurns?: number) => string;
  getPresetNames?: () => string[];
  getPresets?: () => Array<string | { name?: string }>;
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
  try {
    return (window.parent ?? window) as ParentWindowWithPlugins;
  } catch {
    return window as ParentWindowWithPlugins;
  }
}

function getCandidateWindows(): ParentWindowWithPlugins[] {
  const list: ParentWindowWithPlugins[] = [];
  try {
    if (window.parent) list.push(window.parent as ParentWindowWithPlugins);
  } catch {
    // ignore
  }
  try {
    if (window.top && window.top !== window.parent) list.push(window.top as ParentWindowWithPlugins);
  } catch {
    // ignore
  }
  list.push(window as ParentWindowWithPlugins);
  list.push(globalThis as unknown as ParentWindowWithPlugins);
  return list;
}

export function getBaiBaiApi(): BaiBaiBookApi | undefined {
  for (const w of getCandidateWindows()) {
    if (w?.STBaiBaiBook) return w.STBaiBaiBook;
  }
  return undefined;
}

export function getDatabaseApi(): AutoCardUpdaterApi | undefined {
  for (const w of getCandidateWindows()) {
    if (w?.AutoCardUpdaterAPI) return w.AutoCardUpdaterAPI;
  }
  return undefined;
}

export function getHoraeApi(): HoraeApi | undefined {
  for (const w of getCandidateWindows()) {
    if (w?.Horae) return w.Horae;
  }
  return undefined;
}

export function getMvuApi() {
  for (const w of getCandidateWindows()) {
    if (w?.Mvu) return w.Mvu;
  }
  return undefined;
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

/**
 * 解析 SSE 流式响应 (text/event-stream) 并拼接完整回复
 */
async function readOpenAiStreamResponse(
  res: Response,
  onChunk?: (accumulatedText: string) => void,
): Promise<string> {
  if (!res.body) {
    const fallbackJson = await res.json();
    return String(
      fallbackJson?.choices?.[0]?.message?.content ??
        fallbackJson?.choices?.[0]?.text ??
        fallbackJson?.message?.content ??
        '',
    ).trim();
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let accumulated = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || !line.startsWith('data:')) continue;
      const dataStr = line.slice(5).trim();
      if (!dataStr || dataStr === '[DONE]') continue;

      try {
        const parsed = JSON.parse(dataStr);
        const delta =
          parsed?.choices?.[0]?.delta?.content ??
          parsed?.choices?.[0]?.message?.content ??
          parsed?.choices?.[0]?.text ??
          '';
        if (typeof delta === 'string' && delta.length > 0) {
          accumulated += delta;
          onChunk?.(accumulated);
        }
      } catch {
        // ignore partial json
      }
    }
  }

  return accumulated.trim();
}

export interface CallCustomApiOptions {
  apiUrl: string;
  apiKey: string;
  model: string;
  stream: boolean;
  systemPrompt: string;
  userPrompt: string;
  onStreamUpdate?: (partialText: string) => void;
}

/**
 * 调用自定义 OpenAI 兼容 API（支持流式 SSE 与非流式 JSON，跨域失败时自动回退至酒馆 generateRaw）
 */
export async function callCustomOpenAiApi(options: CallCustomApiOptions): Promise<string> {
  const url = normalizeOpenAiBaseUrl(options.apiUrl);
  const key = options.apiKey.trim();
  const model = options.model.trim();

  if (!url) {
    throw new Error('自定义 API 地址为空，请在设置面板填写 API 地址');
  }
  if (!model) {
    throw new Error('自定义 API 模型名称为空，请在设置面板选择或输入模型名称');
  }

  const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
  if (options.systemPrompt.trim()) {
    messages.push({ role: 'system', content: options.systemPrompt.trim() });
  }
  messages.push({ role: 'user', content: options.userPrompt });

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: options.stream ? 'text/event-stream, application/json' : 'application/json',
    };
    if (key) {
      headers.Authorization = `Bearer ${key}`;
    }

    const res = await fetch(`${url}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages,
        stream: Boolean(options.stream),
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      let detail = '';
      try {
        const errJson = await res.json();
        detail = errJson?.error?.message || errJson?.message || '';
      } catch {
        // ignore
      }
      throw new Error(`HTTP ${res.status}${detail ? `: ${detail}` : ''}`);
    }

    const contentType = res.headers.get('content-type') || '';
    if (options.stream && contentType.includes('text/event-stream')) {
      return await readOpenAiStreamResponse(res, options.onStreamUpdate);
    }

    const data = await res.json();
    const content =
      data?.choices?.[0]?.message?.content ??
      data?.choices?.[0]?.text ??
      data?.message?.content ??
      data?.response ??
      '';
    return String(content || '').trim();
  } catch (directErr) {
    // 浏览器 CORS 拦截时回退至酒馆后端转发
    try {
      const rawRes: unknown = await generateRaw({
        user_input: options.userPrompt,
        custom_api: {
          apiurl: url,
          key,
          model,
          source: 'openai',
        },
        ordered_prompts: messages,
      });
      return (typeof rawRes === 'string' ? rawRes : (rawRes as { content?: string })?.content || '').trim();
    } catch {
      throw directErr instanceof Error ? directErr : new Error('调用自定义 API 失败');
    }
  }
}

export async function fetchOpenAiModels(rawUrl: string, rawKey: string): Promise<string[]> {
  const url = normalizeOpenAiBaseUrl(rawUrl);
  const key = rawKey.trim();
  if (!url) {
    throw new Error('请先填写 API 地址');
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (key) {
    headers.Authorization = `Bearer ${key}`;
  }

  const res = await fetch(`${url}/models`, {
    method: 'GET',
    headers,
  });

  if (!res.ok) {
    let detail = '';
    try {
      const errJson = await res.json();
      detail = errJson?.error?.message || errJson?.message || '';
    } catch {
      // ignore
    }
    throw new Error(`HTTP ${res.status}${detail ? `: ${detail}` : ''}`);
  }

  const data = await res.json();
  const rawList = Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data?.models)
      ? data.models
      : Array.isArray(data)
        ? data
        : [];

  const models = rawList
    .map((item: unknown) => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object') {
        const obj = item as { id?: string; name?: string };
        return (obj.id || obj.name || '').trim();
      }
      return '';
    })
    .filter((id: string): id is string => Boolean(id));

  return Array.from(new Set(models));
}

export interface ApiTestResult {
  ok: boolean;
  latencyMs: number;
  reply: string;
  channelLabel: string;
  error?: string;
}

export async function testCustomApiConnection(options: {
  apiUrl: string;
  apiKey: string;
  model: string;
  stream?: boolean;
}): Promise<ApiTestResult> {
  const url = normalizeOpenAiBaseUrl(options.apiUrl);
  const key = options.apiKey.trim();
  const model = options.model.trim();
  const useStream = Boolean(options.stream);
  const startTime = Date.now();

  if (!url) {
    return {
      ok: false,
      latencyMs: 0,
      reply: '',
      channelLabel: '自定义 API',
      error: 'API 地址不能为空',
    };
  }
  if (!model) {
    return {
      ok: false,
      latencyMs: 0,
      reply: '',
      channelLabel: '自定义 API',
      error: '模型名称不能为空，请先拉取或手动输入模型名称',
    };
  }

  const testPrompt = '请仅回复“连接正常”四个字，不要输出其他内容。';

  try {
    const reply = await callCustomOpenAiApi({
      apiUrl: url,
      apiKey: key,
      model,
      stream: useStream,
      systemPrompt: '',
      userPrompt: testPrompt,
    });
    const latencyMs = Date.now() - startTime;
    const cleanReply = String(reply || '').trim() || '（收到 200 OK 响应）';
    return {
      ok: true,
      latencyMs,
      reply: cleanReply.slice(0, 80),
      channelLabel: `${useStream ? '流式' : '非流式'} (${model})`,
    };
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    const msg = err instanceof Error ? err.message : '连接失败，请检查 API 地址与网络';
    return {
      ok: false,
      latencyMs,
      reply: '',
      channelLabel: `自定义 API (${model})`,
      error: msg,
    };
  }
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
