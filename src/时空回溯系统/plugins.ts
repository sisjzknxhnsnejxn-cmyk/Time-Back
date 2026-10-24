import type { ChatMessageSnapshotItem, SlotItem } from './types';

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
  exportTableAsJson?: () => Record<string, unknown> | string | null;
  restoreTableAsJson?: (json: string) => Promise<boolean>;
  importTableAsJson?: (json: string, options?: { persist?: boolean; mode?: string }) => Promise<boolean>;
  syncWorldbookEntries?: (options?: { createIfNeeded?: boolean }) => Promise<boolean>;
  refreshDataAndWorldbook?: () => Promise<boolean>;
  getCurrentPlotPreset?: () => string;
  switchPlotPreset?: (presetName: string) => boolean;
  injectPlotPresetToCurrentChat?: (presetName: string) => boolean;
  getTableLockState?: (sheetKey: string) => { rows?: number[]; cols?: number[]; cells?: string[] } | null;
  setTableLockState?: (
    sheetKey: string,
    lockState: { rows?: number[]; cols?: number[]; cells?: string[] },
    options?: { merge?: boolean },
  ) => boolean;
  getSpecialIndexLockEnabled?: (sheetKey: string) => boolean | null;
  setSpecialIndexLockEnabled?: (sheetKey: string, enabled: boolean) => boolean;
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
  refreshAllDisplays?: () => void;
  processChat?: () => void;
  getLatestState?: () => Record<string, unknown> | null;
}

export interface DetectedPluginInfo {
  id: 'baibai' | 'database' | 'horae' | 'st_memory' | 'mvu' | 'qqj' | 'engram';
  name: string;
  available: boolean;
}

export interface EngramEventNode {
  id: string;
  summary: string;
  structured_kv?: {
    time_anchor?: string;
    role?: string[];
    location?: string | string[];
    event?: string;
    logic?: string[];
    causality?: string;
    score?: number;
  };
  embedding?: number[];
  is_embedded?: boolean;
  is_archived?: boolean;
  significance_score?: number;
  level?: number;
  parent_id?: string | null;
  source_range?: {
    start_index: number;
    end_index: number;
  };
  is_locked?: boolean;
  timestamp?: number;
}

export interface EngramEntityNode {
  id: string;
  name: string;
  type: string;
  aliases?: string[];
  description?: string;
  profile?: Record<string, unknown>;
  is_archived?: boolean;
  last_updated_at?: number;
  embedding?: number[];
  is_embedded?: boolean;
  is_locked?: boolean;
  layout_x?: number;
  layout_y?: number;
}

export interface EngramSnapshotData {
  chatId: string;
  capturedAt: number;
  events: EngramEventNode[];
  entities: EngramEntityNode[];
  meta: Record<string, unknown>;
  extensionMeta?: Record<string, unknown> | null;
}

export interface QqjMemoryFloorItem {
  floorId?: string;
  messageIndex: number;
  assistantSeq?: number;
  summary?: string;
  updatedAt?: string;
  events?: Array<{ title?: string; summary?: string; importance?: string; participants?: string[] }>;
  actions?: Array<{ actor?: string; action?: string; target?: string; outcome?: string }>;
  commitments?: Array<{ actor?: string; content?: string; target?: string; timing?: string; status?: string }>;
  openLoops?: string[];
  relationshipShift?: Array<{ pair?: string[]; summary?: string }>;
  knowledgeBoundaries?: Array<{ subject?: string; knows?: string[]; doesNotKnow?: string[] }>;
  chronologyAnchor?: { explicitRef?: string; relativeOrder?: string };
}

export interface QqjPublicSnapshot {
  version?: string;
  status?: {
    ready?: boolean;
    blocked?: boolean;
    needsReview?: boolean;
    reason?: string;
    identity?: {
      stChatId?: string;
      qqjChatId?: string;
      characterName?: string;
    };
  };
  memory?: {
    coverage?: {
      complete?: boolean;
      missingAssistantSeqs?: number[];
      floorCount?: number;
      sealedFloorCount?: number;
    };
    floors?: QqjMemoryFloorItem[];
  };
  cse?: {
    currentSubjects?: Array<{
      entityId?: string;
      subjectName: string;
      coreState?: string[];
      adaptiveState?: string[];
      situationalState?: string[];
      sourceAssistantSeq?: number | null;
    }>;
    floors?: Array<{
      floorId?: string;
      messageIndex: number;
      assistantSeq?: number;
      changes?: Array<{
        entityId?: string;
        subjectName: string;
        layer?: string;
        op?: string;
        before?: string[];
        after?: string[];
      }>;
    }>;
  };
  people?: {
    updatedAt?: string;
    items?: Array<{
      id?: string;
      canonicalName: string;
      aliases?: string[];
      category?: string;
      importance?: string;
      profile?: string;
    }>;
  };
}

export interface QqjQianshiSnapshot {
  version?: string;
  ready?: boolean;
  qqjChatId?: string;
  anchor?: {
    rawText?: string;
    calendarKind?: string;
  } | null;
  currentStoryTime?: {
    displayText?: string;
  } | null;
  matters?: Array<{
    id?: string;
    title: string;
    category?: string;
    status?: string;
    targetTimeText?: string;
    location?: string;
    participantNames?: string[];
    summary?: string;
    outcome?: string;
    sourceFloor?: {
      floorId?: string;
      assistantSeq?: number | null;
      messageIndex?: number | null;
    };
  }>;
  events?: Array<{
    id?: string;
    title: string;
    category?: string;
    status?: string;
    storyTime?: {
      displayText?: string;
    };
    location?: string;
    participantNames?: string[];
    summary?: string;
    outcome?: string;
    sourceFloor?: {
      floorId?: string;
      assistantSeq?: number | null;
      messageIndex?: number | null;
    };
  }>;
  currentProgress?: {
    renderedText?: string;
  };
}

export interface QqjSnapshotData {
  qqjChatId: string;
  capturedAt: number;
  publicSnapshot: QqjPublicSnapshot | null;
  detailedFloors: QqjMemoryFloorItem[];
  qianshiSnapshot: QqjQianshiSnapshot | null;
  backendRecords?: {
    root?: Record<string, unknown> | null;
    peopleWorkspace?: Record<string, unknown> | null;
    timeHead?: Record<string, unknown> | null;
  } | null;
}

export interface PreloadedPluginMemoryContext {
  engram?: EngramSnapshotData | null;
  qqj?: QqjSnapshotData | null;
}

export interface QqjPublicBridgeApi {
  version?: string;
  getStatus?: () => QqjPublicSnapshot['status'];
  getSnapshot?: () => QqjPublicSnapshot | null;
  readMemory?: (options?: Record<string, unknown>) => Promise<{
    status?: QqjPublicSnapshot['status'];
    coverage?: QqjPublicSnapshot['memory'] extends { coverage?: infer C } ? C : unknown;
    floors?: QqjMemoryFloorItem[];
  } | null>;
}

export interface QqjQianshiBackendApi {
  version?: string;
  getSnapshot?: () => QqjQianshiSnapshot | null;
}

type ParentWindowWithPlugins = Window & {
  STBaiBaiBook?: BaiBaiBookApi;
  AutoCardUpdaterAPI?: AutoCardUpdaterApi;
  Horae?: HoraeApi;
  qqj_v3_public_bridge_v1?: QqjPublicBridgeApi;
  qqj_qianshi_backend_v1?: QqjQianshiBackendApi;
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

export function getQqjPublicBridge(): QqjPublicBridgeApi | undefined {
  for (const w of getCandidateWindows()) {
    if (w?.qqj_v3_public_bridge_v1) return w.qqj_v3_public_bridge_v1;
  }
  return undefined;
}

export function getQqjQianshiBackend(): QqjQianshiBackendApi | undefined {
  for (const w of getCandidateWindows()) {
    if (w?.qqj_qianshi_backend_v1) return w.qqj_qianshi_backend_v1;
  }
  return undefined;
}

function getNativeChatArray(): Array<Record<string, unknown>> | undefined {
  try {
    const ctxChat = (
      SillyTavern as unknown as { getContext?: () => { chat?: Array<Record<string, unknown>> } }
    )?.getContext?.()?.chat;
    if (Array.isArray(ctxChat)) return ctxChat;
  } catch {
    // ignore
  }
  try {
    const directChat = SillyTavern?.chat as Array<Record<string, unknown>> | undefined;
    if (Array.isArray(directChat)) return directChat;
  } catch {
    // ignore
  }
  return undefined;
}

const ACU_FLOOR_KEYS = [
  'TavernDB_ACU_IsolatedData',
  'TavernDB_ACU_Data',
  'TavernDB_ACU_Summary',
  'TavernDB_ACU_ModifiedKeys',
  'TavernDB_ACU_Identity',
  'acu_summary',
  'table_summary',
  'database_summary',
] as const;

const QQJ_FLOOR_KEYS = [
  'qianqianjie_floor',
  'qqj_v3_recall_receipt',
  'qianqianjieAutoHide',
  'qianqianjie_memory_excluded',
] as const;

export function hasQqjDataInChat(): boolean {
  if (getQqjPublicBridge() || getQqjQianshiBackend()) return true;
  try {
    const meta = (SillyTavern?.chatMetadata ??
      (SillyTavern as unknown as { getContext?: () => { chatMetadata?: Record<string, unknown> } })?.getContext?.()
        ?.chatMetadata) as Record<string, unknown> | undefined;
    if (meta?.qianqianjie && typeof meta.qianqianjie === 'object') return true;
    const chat = getNativeChatArray();
    if (Array.isArray(chat)) {
      if (
        chat.some(m => {
          const extra = m?.extra as Record<string, unknown> | undefined;
          return Boolean(extra?.qianqianjie_floor || extra?.qqj_v3_recall_receipt);
        })
      ) {
        return true;
      }
    }
    const parentDoc = window.parent?.document ?? document;
    if (parentDoc?.getElementById('qianqianjie_settings') || parentDoc?.querySelector('[data-qqj-v3-root]')) {
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

export function hasEngramDataInChat(): boolean {
  try {
    const parentDoc = window.parent?.document ?? document;
    if (
      parentDoc?.getElementById('engram-QuickPanel-btn') ||
      parentDoc?.getElementById('engram-top-bar-btn') ||
      parentDoc?.getElementById('engram-global-overlay') ||
      parentDoc?.getElementById('engram-floating-btn')
    ) {
      return true;
    }
    const ctx = (
      SillyTavern as unknown as {
        getContext?: () => { chatMetadata?: Record<string, unknown>; extensionSettings?: Record<string, unknown> };
      }
    )?.getContext?.();
    const meta = (SillyTavern?.chatMetadata ?? ctx?.chatMetadata) as Record<string, unknown> | undefined;
    const extensions = meta?.extensions as Record<string, unknown> | undefined;
    if (extensions?.engram && typeof extensions.engram === 'object') {
      return true;
    }
    const extSettings = (ctx?.extensionSettings ??
      (SillyTavern as unknown as Record<string, unknown>)?.extension_settings) as Record<string, unknown> | undefined;
    if (extSettings?.engram && typeof extSettings.engram === 'object') {
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

export function hasDatabaseDataInChat(): boolean {
  if (getDatabaseApi()) return true;
  try {
    const chat = getNativeChatArray();
    if (!Array.isArray(chat)) return false;
    return chat.some(m => {
      if (!m || typeof m !== 'object') return false;
      const extra = m.extra as Record<string, unknown> | undefined;
      return Boolean(
        m.TavernDB_ACU_IsolatedData ||
          m.TavernDB_ACU_Data ||
          m.TavernDB_ACU_Summary ||
          extra?.TavernDB_ACU_IsolatedData ||
          extra?.acu_summary,
      );
    });
  } catch {
    return false;
  }
}

export function hasHoraeDataInChat(): boolean {
  if (getHoraeApi()) return true;
  try {
    const chat = getNativeChatArray();
    if (!Array.isArray(chat)) return false;
    return chat.some(m => Boolean(m?.horae_meta || (m?.extra as Record<string, unknown> | undefined)?.horae_meta));
  } catch {
    return false;
  }
}

export function hasStSummarizeMemoryInChat(): boolean {
  try {
    const chat = getNativeChatArray();
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
    if (mvu?.getMvuData) {
      const latest = mvu.getMvuData({ type: 'message', message_id: 'latest' });
      if (latest && latest.stat_data && Object.keys(latest.stat_data).length > 0) {
        return true;
      }
      const chatData = mvu.getMvuData({ type: 'chat' });
      if (chatData && chatData.stat_data && Object.keys(chatData.stat_data).length > 0) {
        return true;
      }
    }
    const chat = getNativeChatArray();
    if (Array.isArray(chat)) {
      return chat.some(m => {
        const data = (m?.data ?? m?.variables) as Record<string, unknown> | undefined;
        return Boolean(
          data?.stat_data && typeof data.stat_data === 'object' && Object.keys(data.stat_data as object).length > 0,
        );
      });
    }
    return false;
  } catch {
    return false;
  }
}

export function detectInstalledMemoryPlugins(): DetectedPluginInfo[] {
  return [
    { id: 'baibai', name: '柏宝书', available: Boolean(getBaiBaiApi()?.getFloor || getBaiBaiApi()?.getSnapshot) },
    { id: 'database', name: '数据库', available: hasDatabaseDataInChat() },
    { id: 'horae', name: 'Horae', available: hasHoraeDataInChat() },
    { id: 'qqj', name: '千千结/千事', available: hasQqjDataInChat() },
    { id: 'engram', name: 'Engram记忆', available: hasEngramDataInChat() },
    { id: 'st_memory', name: '酒馆总结', available: hasStSummarizeMemoryInChat() },
    { id: 'mvu', name: 'MVU变量', available: hasMvuDataInChat() },
  ];
}

export function getActivePluginNames(): string[] {
  return detectInstalledMemoryPlugins()
    .filter(p => p.available)
    .map(p => p.name);
}

function safeClone<T>(val: T): T {
  if (val === null || val === undefined) return val;
  try {
    return JSON.parse(JSON.stringify(val)) as T;
  } catch {
    return val;
  }
}

export function captureMvuSnapshot(floor: number): Record<string, unknown> | null {
  try {
    const mvu = getMvuApi();
    if (mvu?.getMvuData) {
      const floorData = mvu.getMvuData({ type: 'message', message_id: floor });
      if (floorData && floorData.stat_data && Object.keys(floorData.stat_data).length > 0) {
        return safeClone(floorData);
      }
      const latestData = mvu.getMvuData({ type: 'message', message_id: 'latest' });
      if (latestData && latestData.stat_data && Object.keys(latestData.stat_data).length > 0) {
        return safeClone(latestData);
      }
    }
    const chat = getNativeChatArray();
    for (let i = floor; i >= 0; i--) {
      const rawMes = chat?.[i];
      const data = (rawMes?.data ?? rawMes?.variables) as Record<string, unknown> | undefined;
      if (data?.stat_data && typeof data.stat_data === 'object' && Object.keys(data.stat_data as object).length > 0) {
        return safeClone({ stat_data: data.stat_data });
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export function captureMvuChatSnapshot(): Record<string, unknown> | null {
  try {
    const mvu = getMvuApi();
    if (!mvu?.getMvuData) return null;
    const chatData = mvu.getMvuData({ type: 'chat' });
    if (chatData && chatData.stat_data && Object.keys(chatData.stat_data).length > 0) {
      return safeClone(chatData);
    }
  } catch {
    // ignore
  }
  return null;
}

export function captureDatabaseSnapshot(): {
  database_snapshot: string | null;
  database_plot_preset: string | null;
  database_locks_snapshot: Record<string, unknown> | null;
} {
  let database_snapshot: string | null = null;
  let database_plot_preset: string | null = null;
  let database_locks_snapshot: Record<string, unknown> | null = null;
  try {
    const dbApi = getDatabaseApi();
    const exported = dbApi?.exportTableAsJson?.();
    let parsedObj: Record<string, unknown> | null = null;
    if (typeof exported === 'string' && exported.trim()) {
      database_snapshot = exported.trim();
      try {
        parsedObj = JSON.parse(database_snapshot) as Record<string, unknown>;
      } catch {
        parsedObj = null;
      }
    } else if (exported && typeof exported === 'object' && Object.keys(exported).length > 0) {
      parsedObj = exported as Record<string, unknown>;
      database_snapshot = JSON.stringify(exported);
    }
    const preset = dbApi?.getCurrentPlotPreset?.();
    if (typeof preset === 'string' && preset.trim()) {
      database_plot_preset = preset.trim();
    }
    if (parsedObj && typeof dbApi?.getTableLockState === 'function') {
      const locksMap: Record<string, unknown> = {};
      for (const key of Object.keys(parsedObj)) {
        if (!key.startsWith('sheet_')) continue;
        const lockState = dbApi.getTableLockState(key);
        const specialIdx = dbApi.getSpecialIndexLockEnabled?.(key) ?? null;
        if (lockState || specialIdx !== null) {
          locksMap[key] = safeClone({ lockState, specialIdx });
        }
      }
      if (Object.keys(locksMap).length > 0) {
        database_locks_snapshot = locksMap;
      }
    }
  } catch {
    // ignore
  }
  return { database_snapshot, database_plot_preset, database_locks_snapshot };
}

export function captureTavernVariablesSnapshot(): {
  chat_variables_snapshot: Record<string, unknown> | null;
  character_variables_snapshot: Record<string, unknown> | null;
} {
  let chat_variables_snapshot: Record<string, unknown> | null = null;
  let character_variables_snapshot: Record<string, unknown> | null = null;
  try {
    const chatVars = getVariables({ type: 'chat' });
    if (chatVars && typeof chatVars === 'object') {
      const cloned = safeClone(chatVars);
      delete cloned.timeloop_archive_v2;
      chat_variables_snapshot = cloned;
    }
  } catch {
    // ignore
  }
  try {
    const charVars = getVariables({ type: 'character' });
    if (charVars && typeof charVars === 'object') {
      character_variables_snapshot = safeClone(charVars);
    }
  } catch {
    // ignore
  }
  return { chat_variables_snapshot, character_variables_snapshot };
}

export function captureChatMetadataSnapshot(): Record<string, unknown> | null {
  try {
    const meta = SillyTavern?.chatMetadata as Record<string, unknown> | undefined;
    if (!meta || typeof meta !== 'object') return null;
    const snap: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(meta)) {
      if (k === 'timeloop_archive_v2' || k === 'variables') continue;
      snap[k] = safeClone(v);
    }
    return Object.keys(snap).length > 0 ? snap : null;
  } catch {
    return null;
  }
}

export function captureBaiBaiSnapshot(floor: number): Record<string, unknown> | null {
  try {
    const api = getBaiBaiApi();
    if (!api?.getSnapshot) return null;
    const snap = api.getSnapshot({ floor, at: 'after' });
    if (snap && typeof snap === 'object') {
      return safeClone(snap as unknown as Record<string, unknown>);
    }
  } catch {
    // ignore
  }
  return null;
}

export function captureHoraeSnapshot(floor: number): Record<string, unknown> | null {
  try {
    const chat = getNativeChatArray();
    const floorsMeta: Record<string, unknown> = {};
    if (Array.isArray(chat)) {
      const upper = Math.min(floor, chat.length - 1);
      for (let i = 0; i <= upper; i++) {
        const rawMes = chat[i];
        if (!rawMes) continue;
        const meta = rawMes.horae_meta ?? (rawMes.extra as Record<string, unknown> | undefined)?.horae_meta;
        if (meta && typeof meta === 'object') {
          floorsMeta[String(i)] = safeClone(meta);
        }
      }
    }
    const latestState = safeClone(getHoraeApi()?.getLatestState?.() ?? null);
    if (Object.keys(floorsMeta).length === 0 && !latestState) {
      return null;
    }
    return {
      floors: floorsMeta,
      latestState,
    };
  } catch {
    return null;
  }
}

function resolveCurrentRawChatId(): string {
  try {
    const ctx = (
      SillyTavern as unknown as { getContext?: () => { chatId?: string } }
    )?.getContext?.();
    const raw = ctx?.chatId ?? (SillyTavern as unknown as { chatId?: string })?.chatId ?? '';
    return typeof raw === 'string' ? raw.trim() : '';
  } catch {
    return '';
  }
}

function getTargetIndexedDB(): IDBFactory | null {
  try {
    const pw = getParentWin();
    if (pw?.indexedDB) return pw.indexedDB;
  } catch {
    // ignore
  }
  return typeof indexedDB !== 'undefined' ? indexedDB : null;
}

async function openExistingIndexedDb(dbName: string): Promise<IDBDatabase | null> {
  const idb = getTargetIndexedDB();
  if (!idb) return null;

  try {
    const idbWithList = idb as IDBFactory & { databases?: () => Promise<Array<{ name?: string }>> };
    if (typeof idbWithList.databases === 'function') {
      const list = await idbWithList.databases();
      if (Array.isArray(list) && !list.some(item => item?.name === dbName)) {
        return null;
      }
    }
  } catch {
    // ignore
  }

  return await new Promise<IDBDatabase | null>(resolve => {
    let createdNew = false;
    try {
      const req = idb.open(dbName);
      req.onupgradeneeded = e => {
        if ((e as IDBVersionChangeEvent).oldVersion === 0) {
          createdNew = true;
          try {
            req.transaction?.abort();
          } catch {
            // ignore
          }
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        if (createdNew) {
          try {
            db.close();
            idb.deleteDatabase(dbName);
          } catch {
            // ignore
          }
          resolve(null);
          return;
        }
        resolve(db);
      };
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function readAllStoreItems<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
  if (!db.objectStoreNames.contains(storeName)) return [];
  return await new Promise<T[]>(resolve => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(Array.isArray(req.result) ? (req.result as T[]) : []);
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

async function readKeyValueStore(db: IDBDatabase, storeName: string): Promise<Record<string, unknown>> {
  if (!db.objectStoreNames.contains(storeName)) return {};
  return await new Promise<Record<string, unknown>>(resolve => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const keysReq = store.getAllKeys();
      const valsReq = store.getAll();
      tx.oncomplete = () => {
        const out: Record<string, unknown> = {};
        const keys = Array.isArray(keysReq.result) ? keysReq.result : [];
        const vals = Array.isArray(valsReq.result) ? valsReq.result : [];
        for (let i = 0; i < keys.length; i++) {
          out[String(keys[i])] = vals[i];
        }
        resolve(out);
      };
      tx.onerror = () => resolve({});
    } catch {
      resolve({});
    }
  });
}

export async function readCurrentEngramData(): Promise<EngramSnapshotData | null> {
  const chatId = resolveCurrentRawChatId();
  if (!chatId) return null;
  const db = await openExistingIndexedDb(`Engram_${chatId}`);
  if (!db) return null;

  try {
    const [rawEvents, rawEntities, rawMeta] = await Promise.all([
      readAllStoreItems<EngramEventNode>(db, 'events'),
      readAllStoreItems<EngramEntityNode>(db, 'entities'),
      readKeyValueStore(db, 'meta'),
    ]);
    db.close();

    if (rawEvents.length === 0 && rawEntities.length === 0 && Object.keys(rawMeta).length === 0) {
      return null;
    }

    const strippedEvents: EngramEventNode[] = rawEvents.map(ev => {
      const copy = safeClone(ev);
      delete copy.embedding;
      return copy;
    });
    const strippedEntities: EngramEntityNode[] = rawEntities.map(en => {
      const copy = safeClone(en);
      delete copy.embedding;
      return copy;
    });

    let extensionMeta: Record<string, unknown> | null = null;
    try {
      const meta = SillyTavern?.chatMetadata as Record<string, unknown> | undefined;
      const extensions = meta?.extensions as Record<string, unknown> | undefined;
      if (extensions?.engram && typeof extensions.engram === 'object') {
        extensionMeta = safeClone(extensions.engram as Record<string, unknown>);
      }
    } catch {
      // ignore
    }

    return {
      chatId,
      capturedAt: Date.now(),
      events: strippedEvents,
      entities: strippedEntities,
      meta: safeClone(rawMeta),
      extensionMeta,
    };
  } catch {
    try {
      db.close();
    } catch {
      // ignore
    }
    return null;
  }
}

export async function captureEngramSnapshot(): Promise<Record<string, unknown> | null> {
  const data = await readCurrentEngramData();
  return data ? (data as unknown as Record<string, unknown>) : null;
}

export async function restoreEngramSnapshot(slot: SlotItem, anchorFloor: number): Promise<boolean> {
  const chatId = resolveCurrentRawChatId();
  if (!chatId) return false;
  const db = await openExistingIndexedDb(`Engram_${chatId}`);
  if (!db) return false;

  try {
    const [existingEvents, existingEntities, existingMeta] = await Promise.all([
      readAllStoreItems<EngramEventNode>(db, 'events'),
      readAllStoreItems<EngramEntityNode>(db, 'entities'),
      readKeyValueStore(db, 'meta'),
    ]);

    const eventEmbeddingMap = new Map<string, { summary: string; embedding: number[] }>();
    for (const ev of existingEvents) {
      if (ev?.id && Array.isArray(ev.embedding) && ev.embedding.length > 0) {
        eventEmbeddingMap.set(ev.id, { summary: ev.summary ?? '', embedding: ev.embedding });
      }
    }
    const entityEmbeddingMap = new Map<string, { desc: string; embedding: number[] }>();
    for (const en of existingEntities) {
      if (en?.id && Array.isArray(en.embedding) && en.embedding.length > 0) {
        entityEmbeddingMap.set(en.id, { desc: en.description ?? '', embedding: en.embedding });
      }
    }

    const snap = slot.engram_snapshot as unknown as EngramSnapshotData | null;

    if (snap && (Array.isArray(snap.events) || Array.isArray(snap.entities))) {
      const nextEvents: EngramEventNode[] = (snap.events ?? []).map(ev => {
        const clone = safeClone(ev);
        const cached = eventEmbeddingMap.get(clone.id);
        if (cached && cached.summary === (clone.summary ?? '')) {
          clone.embedding = cached.embedding;
          clone.is_embedded = true;
        } else {
          delete clone.embedding;
          clone.is_embedded = false;
        }
        return clone;
      });

      const nextEntities: EngramEntityNode[] = (snap.entities ?? []).map(en => {
        const clone = safeClone(en);
        const cached = entityEmbeddingMap.get(clone.id);
        if (cached && cached.desc === (clone.description ?? '')) {
          clone.embedding = cached.embedding;
          clone.is_embedded = true;
        } else {
          delete clone.embedding;
          clone.is_embedded = false;
        }
        return clone;
      });

      const nextMeta: Record<string, unknown> = {
        ...safeClone(snap.meta ?? {}),
        lastModified: Date.now(),
      };

      const storeNames = ['events', 'entities', 'meta'].filter(n => db.objectStoreNames.contains(n));
      if (storeNames.length > 0) {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(storeNames, 'readwrite');
          if (db.objectStoreNames.contains('events')) {
            const evStore = tx.objectStore('events');
            evStore.clear();
            for (const ev of nextEvents) {
              evStore.put(ev);
            }
          }
          if (db.objectStoreNames.contains('entities')) {
            const enStore = tx.objectStore('entities');
            enStore.clear();
            for (const en of nextEntities) {
              enStore.put(en);
            }
          }
          if (db.objectStoreNames.contains('meta')) {
            const metaStore = tx.objectStore('meta');
            metaStore.clear();
            for (const [k, v] of Object.entries(nextMeta)) {
              metaStore.put(v, k);
            }
          }
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      }

      if (snap.extensionMeta) {
        try {
          const meta = SillyTavern?.chatMetadata as Record<string, unknown> | undefined;
          if (meta && typeof meta === 'object') {
            const extensions = ((meta.extensions as Record<string, unknown> | undefined) ?? {});
            extensions.engram = safeClone(snap.extensionMeta);
            meta.extensions = extensions;
          }
        } catch {
          // ignore
        }
      }

      db.close();
      return true;
    }

    // 兼容未包含 engram_snapshot 的旧存档：自动裁剪超过 anchorFloor 的 EventNode 与 scope_state
    const eventsToDelete = existingEvents.filter(
      ev => typeof ev?.source_range?.start_index === 'number' && ev.source_range.start_index > anchorFloor,
    );
    if (eventsToDelete.length > 0 || existingMeta.scope_state) {
      const storeNames = ['events', 'meta'].filter(n => db.objectStoreNames.contains(n));
      if (storeNames.length > 0) {
        await new Promise<void>(resolve => {
          const tx = db.transaction(storeNames, 'readwrite');
          if (db.objectStoreNames.contains('events')) {
            const evStore = tx.objectStore('events');
            for (const ev of eventsToDelete) {
              evStore.delete(ev.id);
            }
          }
          if (db.objectStoreNames.contains('meta')) {
            const metaStore = tx.objectStore('meta');
            const scopeState = safeClone(
              (existingMeta.scope_state as Record<string, unknown> | undefined) ?? {},
            );
            if (
              typeof scopeState.last_summarized_floor === 'number' &&
              scopeState.last_summarized_floor > anchorFloor
            ) {
              scopeState.last_summarized_floor = anchorFloor;
            }
            if (
              typeof scopeState.last_extracted_floor === 'number' &&
              scopeState.last_extracted_floor > anchorFloor
            ) {
              scopeState.last_extracted_floor = anchorFloor;
            }
            metaStore.put(scopeState, 'scope_state');
            metaStore.put(Date.now(), 'lastModified');
          }
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        });
      }
      db.close();
      return true;
    }

    db.close();
    return false;
  } catch {
    try {
      db.close();
    } catch {
      // ignore
    }
    return false;
  }
}

function resolveQqjChatId(publicSnap?: QqjPublicSnapshot | null, qianshiSnap?: QqjQianshiSnapshot | null): string {
  const fromPublic = publicSnap?.status?.identity?.qqjChatId;
  if (typeof fromPublic === 'string' && fromPublic.trim()) return fromPublic.trim();
  const fromQianshi = qianshiSnap?.qqjChatId;
  if (typeof fromQianshi === 'string' && fromQianshi.trim()) return fromQianshi.trim();
  try {
    const bridgeStatus = getQqjPublicBridge()?.getStatus?.();
    const idFromStatus = bridgeStatus?.identity?.qqjChatId;
    if (typeof idFromStatus === 'string' && idFromStatus.trim()) return idFromStatus.trim();
  } catch {
    // ignore
  }
  try {
    const meta = (SillyTavern?.chatMetadata ??
      (SillyTavern as unknown as { getContext?: () => { chatMetadata?: Record<string, unknown> } })?.getContext?.()
        ?.chatMetadata) as Record<string, unknown> | undefined;
    const qqjMeta = meta?.qianqianjie as Record<string, unknown> | undefined;
    if (typeof qqjMeta?.chatId === 'string' && qqjMeta.chatId.trim()) {
      return qqjMeta.chatId.trim();
    }
  } catch {
    // ignore
  }
  return '';
}

function getStBackendHeaders(): Record<string, string> {
  try {
    const ctx = (
      SillyTavern as unknown as { getContext?: () => { getRequestHeaders?: () => Record<string, string> } }
    )?.getContext?.();
    const h = ctx?.getRequestHeaders?.();
    if (h && typeof h === 'object') {
      return {
        ...h,
        'Content-Type': 'application/json',
      };
    }
  } catch {
    // ignore
  }
  return {
    'Content-Type': 'application/json',
  };
}

async function fetchQqjBackendRecord(
  qqjChatId: string,
  recordId: string,
): Promise<{ revision?: number; data?: Record<string, unknown> } | null> {
  if (!qqjChatId || !recordId) return null;
  try {
    const url = `/api/plugins/st-bainiaodata/v1/collections/qianqianjie/${encodeURIComponent(`chat-${qqjChatId}`)}/records/${encodeURIComponent(recordId)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: getStBackendHeaders(),
      credentials: 'same-origin',
    });
    if (!res.ok) return null;
    const json = await res.json();
    const rec = (json?.record ?? json) as { revision?: number; data?: Record<string, unknown> } | undefined;
    if (rec && rec.data && typeof rec.data === 'object') {
      return {
        revision: typeof rec.revision === 'number' ? rec.revision : undefined,
        data: safeClone(rec.data),
      };
    }
  } catch {
    // ignore
  }
  return null;
}

async function putQqjBackendRecord(
  qqjChatId: string,
  recordId: string,
  data: Record<string, unknown>,
): Promise<boolean> {
  if (!qqjChatId || !recordId || !data) return false;
  const url = `/api/plugins/st-bainiaodata/v1/collections/qianqianjie/${encodeURIComponent(`chat-${qqjChatId}`)}/records/${encodeURIComponent(recordId)}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const current = await fetchQqjBackendRecord(qqjChatId, recordId);
      const body: Record<string, unknown> = { data };
      if (typeof current?.revision === 'number') {
        body.expectedRevision = current.revision;
      }
      const res = await fetch(url, {
        method: 'PUT',
        headers: getStBackendHeaders(),
        credentials: 'same-origin',
        body: JSON.stringify(body),
      });
      if (res.ok) return true;
      if (res.status !== 409) return false;
    } catch {
      return false;
    }
  }
  return false;
}

async function clearQqjLocalCoreCache(): Promise<void> {
  const db = await openExistingIndexedDb('qqj-v3-core-cache');
  if (!db) return;
  try {
    if (db.objectStoreNames.contains('core_records')) {
      await new Promise<void>(resolve => {
        const tx = db.transaction('core_records', 'readwrite');
        tx.objectStore('core_records').clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    }
  } catch {
    // ignore
  } finally {
    try {
      db.close();
    } catch {
      // ignore
    }
  }
}

export async function readCurrentQqjData(includeBackendRecords = false): Promise<QqjSnapshotData | null> {
  const bridge = getQqjPublicBridge();
  const qianshi = getQqjQianshiBackend();
  if (!bridge && !qianshi && !hasQqjDataInChat()) return null;

  let publicSnapshot: QqjPublicSnapshot | null = null;
  let detailedFloors: QqjMemoryFloorItem[] = [];
  let qianshiSnapshot: QqjQianshiSnapshot | null = null;

  try {
    publicSnapshot = bridge?.getSnapshot?.() ?? null;
  } catch {
    // ignore
  }

  try {
    if (typeof bridge?.readMemory === 'function') {
      const memResult = await bridge.readMemory();
      if (Array.isArray(memResult?.floors)) {
        detailedFloors = safeClone(memResult.floors);
      }
    }
  } catch {
    // ignore
  }

  if (detailedFloors.length === 0 && Array.isArray(publicSnapshot?.memory?.floors)) {
    detailedFloors = safeClone(publicSnapshot.memory.floors);
  }

  try {
    qianshiSnapshot = qianshi?.getSnapshot?.() ?? null;
  } catch {
    // ignore
  }

  const qqjChatId = resolveQqjChatId(publicSnapshot, qianshiSnapshot);
  let backendRecords: QqjSnapshotData['backendRecords'] = null;

  if (includeBackendRecords && qqjChatId) {
    try {
      const [rootRec, peopleRec, timeHeadRec] = await Promise.all([
        fetchQqjBackendRecord(qqjChatId, 'v3-root'),
        fetchQqjBackendRecord(qqjChatId, 'v3-people-workspace'),
        fetchQqjBackendRecord(qqjChatId, 'v3-time-head'),
      ]);
      if (rootRec?.data || peopleRec?.data || timeHeadRec?.data) {
        backendRecords = {
          root: rootRec?.data ?? null,
          peopleWorkspace: peopleRec?.data ?? null,
          timeHead: timeHeadRec?.data ?? null,
        };
      }
    } catch {
      // ignore
    }
  }

  if (!publicSnapshot && detailedFloors.length === 0 && !qianshiSnapshot && !backendRecords) {
    return null;
  }

  return {
    qqjChatId,
    capturedAt: Date.now(),
    publicSnapshot: safeClone(publicSnapshot),
    detailedFloors,
    qianshiSnapshot: safeClone(qianshiSnapshot),
    backendRecords,
  };
}

export async function captureQqjSnapshot(): Promise<Record<string, unknown> | null> {
  const data = await readCurrentQqjData(true);
  return data ? (data as unknown as Record<string, unknown>) : null;
}

export async function restoreQqjSnapshot(slot: SlotItem): Promise<boolean> {
  const snap = slot.qqj_snapshot as unknown as QqjSnapshotData | null;
  if (!snap) return false;

  const qqjChatId = snap.qqjChatId || resolveQqjChatId(snap.publicSnapshot, snap.qianshiSnapshot);
  if (!qqjChatId || !snap.backendRecords) return false;

  const tasks: Promise<boolean>[] = [];
  if (snap.backendRecords.root) {
    tasks.push(putQqjBackendRecord(qqjChatId, 'v3-root', snap.backendRecords.root));
  }
  if (snap.backendRecords.peopleWorkspace) {
    tasks.push(putQqjBackendRecord(qqjChatId, 'v3-people-workspace', snap.backendRecords.peopleWorkspace));
  }
  if (snap.backendRecords.timeHead) {
    tasks.push(putQqjBackendRecord(qqjChatId, 'v3-time-head', snap.backendRecords.timeHead));
  }

  if (tasks.length === 0) return false;
  const results = await Promise.all(tasks);
  await clearQqjLocalCoreCache();
  return results.some(Boolean);
}

export async function preloadExternalPluginMemoriesForSummary(): Promise<PreloadedPluginMemoryContext> {
  const [engram, qqj] = await Promise.all([
    readCurrentEngramData().catch(() => null),
    readCurrentQqjData(false).catch(() => null),
  ]);
  return {
    engram,
    qqj,
  };
}

export function captureChatMessagesSnapshot(anchorFloor: number): ChatMessageSnapshotItem[] | null {
  try {
    const helperMsgs = getChatMessages(`0-${anchorFloor}`, { hide_state: 'all', include_swipes: false });
    const nativeChat = getNativeChatArray();
    if (!helperMsgs || helperMsgs.length === 0) return null;

    return helperMsgs.map(msg => {
      const fid = msg.message_id;
      const rawMes = nativeChat?.[fid] ?? {};
      const rawExtra = (rawMes.extra as Record<string, unknown> | undefined) ?? {};
      const rawData = (rawMes.data as Record<string, unknown> | undefined) ?? {};
      const horaeMeta = (rawMes.horae_meta ?? rawExtra.horae_meta ?? null) as Record<string, unknown> | null;

      const acuMeta: Record<string, unknown> = {};
      for (const key of ACU_FLOOR_KEYS) {
        if (rawMes[key] !== undefined) {
          acuMeta[key] = safeClone(rawMes[key]);
        } else if (rawExtra[key] !== undefined) {
          acuMeta[key] = safeClone(rawExtra[key]);
        }
      }

      const msgWithSwipe = msg as ChatMessage & { swipe_id?: number };
      const resolvedSwipeId =
        typeof msgWithSwipe.swipe_id === 'number'
          ? msgWithSwipe.swipe_id
          : typeof rawMes.swipe_id === 'number'
            ? rawMes.swipe_id
            : undefined;

      return {
        message_id: fid,
        name: msg.name,
        role: msg.role,
        is_hidden: Boolean(msg.is_hidden),
        message: msg.message,
        swipe_id: resolvedSwipeId,
        data: safeClone({ ...rawData, ...(msg.data ?? {}) }),
        extra: safeClone({ ...rawExtra, ...(msg.extra ?? {}) }),
        horae_meta: horaeMeta ? safeClone(horaeMeta) : null,
        acu_meta: Object.keys(acuMeta).length > 0 ? acuMeta : null,
      };
    });
  } catch {
    return null;
  }
}

async function syncFloorVisibilityAndCleanPluginMeta(
  slot: SlotItem,
  maxFloor: number,
  snapshotMap: Map<number, ChatMessageSnapshotItem>,
  horaeFloorsMap: Record<string, unknown>,
): Promise<number> {
  const anchorFloor = slot.floor;
  const nativeChat = getNativeChatArray();
  const anchorMvuStat =
    (slot.mvu_snapshot as { stat_data?: Record<string, unknown> } | null)?.stat_data ?? null;

  // 1. 恢复 0 .. anchorFloor 的原生元数据
  if (Array.isArray(nativeChat)) {
    const upperAnchor = Math.min(anchorFloor, nativeChat.length - 1);
    for (let i = 0; i <= upperAnchor; i++) {
      const rawMes = nativeChat[i];
      if (!rawMes || typeof rawMes !== 'object') continue;
      const snapItem = snapshotMap.get(i);
      const rawExtra = ((rawMes.extra as Record<string, unknown> | undefined) ?? {});
      const rawData = ((rawMes.data as Record<string, unknown> | undefined) ?? {});

      if (i === anchorFloor) {
        rawMes.is_system = false;
        rawMes.is_hidden = false;
      } else if (snapItem && typeof snapItem.is_hidden === 'boolean') {
        rawMes.is_system = snapItem.is_hidden;
        rawMes.is_hidden = snapItem.is_hidden;
      }

      const wasOmitted = Boolean(snapItem?.extra?.bbs_omit || snapItem?.data?.bbs_omit);
      if (!wasOmitted) {
        delete rawMes.bbs_omit;
        delete rawMes.timeloop_abandoned;
        delete rawExtra.bbs_omit;
        delete rawExtra.timeloop_abandoned;
        delete rawData.bbs_omit;
        delete rawData.timeloop_abandoned;
      }

      const savedHorae =
        snapItem?.horae_meta ??
        (horaeFloorsMap[String(i)] as Record<string, unknown> | undefined) ??
        (rawExtra._timeloop_backup_horae_meta as Record<string, unknown> | undefined);
      if (savedHorae && typeof savedHorae === 'object') {
        rawMes.horae_meta = safeClone(savedHorae);
        rawExtra.horae_meta = safeClone(savedHorae);
      }

      const savedAcu =
        snapItem?.acu_meta ??
        (rawExtra._timeloop_backup_acu as Record<string, unknown> | undefined);
      if (savedAcu && typeof savedAcu === 'object') {
        for (const [k, v] of Object.entries(savedAcu)) {
          rawMes[k] = safeClone(v);
        }
      }

      if (rawExtra._timeloop_backup_st_memory !== undefined && rawExtra.memory === undefined) {
        rawExtra.memory = safeClone(rawExtra._timeloop_backup_st_memory);
      }

      if (rawExtra.type === 'timeloop_abandoned') {
        const backupType = rawExtra._timeloop_backup_extra_type;
        if (typeof backupType === 'string' && backupType) {
          rawExtra.type = backupType;
        } else {
          delete rawExtra.type;
        }
        delete rawExtra._timeloop_backup_extra_type;
      }

      const qqjBackup = rawExtra._timeloop_backup_qqj as Record<string, unknown> | undefined;
      if (qqjBackup && typeof qqjBackup === 'object') {
        for (const key of QQJ_FLOOR_KEYS) {
          if (qqjBackup[key] !== undefined && rawExtra[key] === undefined) {
            rawExtra[key] = safeClone(qqjBackup[key]);
          }
        }
        if (Array.isArray(rawMes.swipe_info) && Array.isArray(qqjBackup._swipe_qqj)) {
          const swipeArr = rawMes.swipe_info as Array<Record<string, unknown>>;
          const savedSwipeQqj = qqjBackup._swipe_qqj as Array<Record<string, unknown> | null>;
          for (let s = 0; s < swipeArr.length; s++) {
            const sEntry = swipeArr[s];
            const sBackup = savedSwipeQqj[s];
            if (sEntry && typeof sEntry === 'object' && sBackup && typeof sBackup === 'object') {
              const sExtra = ((sEntry.extra as Record<string, unknown> | undefined) ?? {});
              for (const key of QQJ_FLOOR_KEYS) {
                if (sBackup[key] !== undefined && sExtra[key] === undefined) {
                  sExtra[key] = safeClone(sBackup[key]);
                }
              }
              sEntry.extra = sExtra;
            }
          }
        }
        delete rawExtra._timeloop_backup_qqj;
      }

      rawMes.extra = rawExtra;
      rawMes.data = rawData;
    }
  }

  // 2. 处理 anchorFloor + 1 .. maxFloor：仅隐藏楼层（绝不删除），并隔离插件状态
  let hiddenCount = 0;
  if (Array.isArray(nativeChat) && maxFloor > anchorFloor) {
    const upperMax = Math.min(maxFloor, nativeChat.length - 1);
    for (let i = anchorFloor + 1; i <= upperMax; i++) {
      const rawMes = nativeChat[i];
      if (!rawMes || typeof rawMes !== 'object') continue;
      hiddenCount++;

      rawMes.is_system = true;
      rawMes.is_hidden = true;
      rawMes.bbs_omit = true;
      rawMes.timeloop_abandoned = true;

      const rawExtra = ((rawMes.extra as Record<string, unknown> | undefined) ?? {});
      const rawData = ((rawMes.data as Record<string, unknown> | undefined) ?? {});
      rawExtra.bbs_omit = true;
      rawExtra.timeloop_abandoned = true;
      rawData.bbs_omit = true;
      rawData.timeloop_abandoned = true;

      // 让千千结/千事 (QQJ) 将被回溯隐藏的楼层识别为非剧情系统楼层并跳过（避免触发 needsReview 冲突）
      if (rawExtra.type !== 'timeloop_abandoned') {
        rawExtra._timeloop_backup_extra_type = rawExtra.type ?? null;
        rawExtra.type = 'timeloop_abandoned';
      }

      const qqjBackup: Record<string, unknown> =
        (rawExtra._timeloop_backup_qqj as Record<string, unknown> | undefined) ?? {};
      for (const key of QQJ_FLOOR_KEYS) {
        if (rawExtra[key] !== undefined) {
          if (qqjBackup[key] === undefined) qqjBackup[key] = safeClone(rawExtra[key]);
          delete rawExtra[key];
        }
      }
      if (Array.isArray(rawMes.swipe_info)) {
        const swipeArr = rawMes.swipe_info as Array<Record<string, unknown>>;
        const swipeBackups: Array<Record<string, unknown> | null> = Array.isArray(qqjBackup._swipe_qqj)
          ? (qqjBackup._swipe_qqj as Array<Record<string, unknown> | null>)
          : [];
        let hasSwipeQqj = false;
        for (let s = 0; s < swipeArr.length; s++) {
          const sExtra = swipeArr[s]?.extra as Record<string, unknown> | undefined;
          if (!sExtra || typeof sExtra !== 'object') continue;
          const sBackup: Record<string, unknown> = swipeBackups[s] ?? {};
          for (const key of QQJ_FLOOR_KEYS) {
            if (sExtra[key] !== undefined) {
              if (sBackup[key] === undefined) sBackup[key] = safeClone(sExtra[key]);
              delete sExtra[key];
              hasSwipeQqj = true;
            }
          }
          if (Object.keys(sBackup).length > 0) {
            swipeBackups[s] = sBackup;
          }
        }
        if (hasSwipeQqj || swipeBackups.length > 0) {
          qqjBackup._swipe_qqj = swipeBackups;
        }
      }
      if (Object.keys(qqjBackup).length > 0) {
        rawExtra._timeloop_backup_qqj = qqjBackup;
      }

      const currentHorae = rawMes.horae_meta ?? rawExtra.horae_meta;
      if (currentHorae && !rawExtra._timeloop_backup_horae_meta) {
        rawExtra._timeloop_backup_horae_meta = safeClone(currentHorae);
      }
      delete rawMes.horae_meta;
      delete rawExtra.horae_meta;

      if (rawExtra.memory !== undefined) {
        if (rawExtra._timeloop_backup_st_memory === undefined) {
          rawExtra._timeloop_backup_st_memory = safeClone(rawExtra.memory);
        }
        delete rawExtra.memory;
      }

      const acuBackup: Record<string, unknown> =
        (rawExtra._timeloop_backup_acu as Record<string, unknown> | undefined) ?? {};
      for (const key of ACU_FLOOR_KEYS) {
        if (rawMes[key] !== undefined) {
          if (acuBackup[key] === undefined) acuBackup[key] = safeClone(rawMes[key]);
          delete rawMes[key];
        }
        if (rawExtra[key] !== undefined) {
          if (acuBackup[key] === undefined) acuBackup[key] = safeClone(rawExtra[key]);
          delete rawExtra[key];
        }
        if (rawData[key] !== undefined) {
          if (acuBackup[key] === undefined) acuBackup[key] = safeClone(rawData[key]);
          delete rawData[key];
        }
      }
      if (Object.keys(acuBackup).length > 0) {
        rawExtra._timeloop_backup_acu = acuBackup;
      }

      if (rawData.stat_data && !rawExtra._timeloop_backup_stat_data) {
        rawExtra._timeloop_backup_stat_data = safeClone(rawData.stat_data);
      }
      if (anchorMvuStat) {
        rawData.stat_data = safeClone(anchorMvuStat);
      } else {
        delete rawData.stat_data;
      }

      rawMes.extra = rawExtra;
      rawMes.data = rawData;
    }
  }

  return hiddenCount;
}

async function restoreSlotExternalPlugins(slot: SlotItem): Promise<string[]> {
  const anchorFloor = slot.floor;
  const restoredPlugins: string[] = [];

  // (a) 恢复 龙血玄黄·数据库 (AutoCardUpdaterAPI)
  const dbApi = getDatabaseApi();
  if (dbApi) {
    try {
      let dbRestored = false;
      if (slot.database_snapshot) {
        if (typeof dbApi.restoreTableAsJson === 'function') {
          dbRestored = Boolean(await dbApi.restoreTableAsJson(slot.database_snapshot));
        }
        if (!dbRestored && typeof dbApi.importTableAsJson === 'function') {
          dbRestored = Boolean(await dbApi.importTableAsJson(slot.database_snapshot, { persist: false }));
        }
      }
      if (slot.database_plot_preset) {
        if (typeof dbApi.switchPlotPreset === 'function') {
          dbApi.switchPlotPreset(slot.database_plot_preset);
        } else if (typeof dbApi.injectPlotPresetToCurrentChat === 'function') {
          dbApi.injectPlotPresetToCurrentChat(slot.database_plot_preset);
        }
      }
      if (slot.database_locks_snapshot && typeof dbApi.setTableLockState === 'function') {
        for (const [sheetKey, rawEntry] of Object.entries(slot.database_locks_snapshot)) {
          const entry = rawEntry as {
            lockState?: { rows?: number[]; cols?: number[]; cells?: string[] } | null;
            specialIdx?: boolean | null;
          };
          if (entry?.lockState) {
            dbApi.setTableLockState(sheetKey, entry.lockState, { merge: false });
          }
          if (typeof entry?.specialIdx === 'boolean' && typeof dbApi.setSpecialIndexLockEnabled === 'function') {
            dbApi.setSpecialIndexLockEnabled(sheetKey, entry.specialIdx);
          }
        }
      }
      if (typeof dbApi.syncWorldbookEntries === 'function') {
        await dbApi.syncWorldbookEntries({ createIfNeeded: true });
        dbRestored = true;
      } else if (typeof dbApi.refreshDataAndWorldbook === 'function') {
        await dbApi.refreshDataAndWorldbook();
        dbRestored = true;
      }
      if (dbRestored) {
        restoredPlugins.push('数据库');
      }
    } catch {
      // ignore
    }
  }

  // (b) 恢复 MVU 变量与酒馆原生变量
  const mvu = getMvuApi();
  let varsRestored = false;
  if (mvu?.replaceMvuData && (slot.mvu_snapshot || slot.mvu_chat_snapshot)) {
    try {
      if (slot.mvu_snapshot) {
        await mvu.replaceMvuData(safeClone(slot.mvu_snapshot), { type: 'message', message_id: anchorFloor });
        await mvu.replaceMvuData(safeClone(slot.mvu_snapshot), { type: 'message', message_id: 'latest' });
      }
      if (slot.mvu_chat_snapshot) {
        await mvu.replaceMvuData(safeClone(slot.mvu_chat_snapshot), { type: 'chat' });
      }
      varsRestored = true;
    } catch {
      // ignore
    }
  }

  if (slot.chat_variables_snapshot) {
    try {
      const currentChatVars = getVariables({ type: 'chat' }) ?? {};
      const preservedArchive = currentChatVars.timeloop_archive_v2;
      const nextChatVars = safeClone(slot.chat_variables_snapshot);
      if (preservedArchive !== undefined) {
        nextChatVars.timeloop_archive_v2 = preservedArchive;
      }
      replaceVariables(nextChatVars, { type: 'chat' });
      varsRestored = true;
    } catch {
      // ignore
    }
  }

  if (slot.character_variables_snapshot) {
    try {
      replaceVariables(safeClone(slot.character_variables_snapshot), { type: 'character' });
      varsRestored = true;
    } catch {
      // ignore
    }
  }

  if (varsRestored) {
    restoredPlugins.push('MVU/变量');
  }

  // (c) 恢复 chatMetadata 中的酒馆总结等状态
  if (slot.chat_metadata_snapshot) {
    try {
      const meta = SillyTavern?.chatMetadata as Record<string, unknown> | undefined;
      if (meta && typeof meta === 'object') {
        for (const [k, v] of Object.entries(slot.chat_metadata_snapshot)) {
          if (k === 'timeloop_archive_v2' || k === 'variables') continue;
          meta[k] = safeClone(v);
        }
        if (slot.chat_metadata_snapshot.memory !== undefined || slot.chat_metadata_snapshot.summarize !== undefined) {
          restoredPlugins.push('酒馆总结');
        }
      }
    } catch {
      // ignore
    }
  }

  // (d) 恢复并刷新 Horae
  const horaeApi = getHoraeApi();
  if (horaeApi || hasHoraeDataInChat()) {
    try {
      horaeApi?.processChat?.();
      horaeApi?.refreshAllDisplays?.();
      horaeApi?.refreshPorts?.();
      restoredPlugins.push('Horae');
    } catch {
      // ignore
    }
  }

  // (e) 柏宝书通过 bbs_omit 标记已自动对齐到 anchorFloor，并派发消息变更事件通知重算
  if (getBaiBaiApi()) {
    try {
      const evSource = (SillyTavern as unknown as { eventSource?: { emit?: (evt: string, ...args: unknown[]) => void } })
        ?.eventSource;
      const evTypes = (SillyTavern as unknown as { event_types?: Record<string, string> })?.event_types;
      if (evSource?.emit && evTypes?.MESSAGE_EDITED) {
        evSource.emit(evTypes.MESSAGE_EDITED, anchorFloor);
      }
    } catch {
      // ignore
    }
    restoredPlugins.push('柏宝书');
  }

  // (f) 恢复 千千结 / 千事 (QQJ / Qianshi) 后端头指针与楼层绑定
  if (slot.qqj_snapshot || hasQqjDataInChat()) {
    try {
      const qqjRestored = await restoreQqjSnapshot(slot);
      if (qqjRestored || hasQqjDataInChat()) {
        restoredPlugins.push('千千结/千事');
      }
    } catch {
      // ignore
    }
  }

  // (g) 恢复 Engram IndexedDB 记忆与实体状态
  if (slot.engram_snapshot || hasEngramDataInChat()) {
    try {
      const engramRestored = await restoreEngramSnapshot(slot, anchorFloor);
      if (engramRestored) {
        restoredPlugins.push('Engram记忆');
        try {
          const evSource = (
            SillyTavern as unknown as { eventSource?: { emit?: (evt: string, ...args: unknown[]) => void } }
          )?.eventSource;
          const evTypes = (SillyTavern as unknown as { event_types?: Record<string, string> })?.event_types;
          const rawChatId = resolveCurrentRawChatId();
          if (evSource?.emit && evTypes?.CHAT_CHANGED && rawChatId) {
            evSource.emit(evTypes.CHAT_CHANGED, rawChatId);
          }
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }
  }

  try {
    const ctx = (
      SillyTavern as unknown as { getContext?: () => { saveChat?: () => Promise<void> | void } }
    )?.getContext?.();
    await ctx?.saveChat?.();
  } catch {
    // ignore
  }

  return restoredPlugins;
}

export async function hideRewoundFloorsAndRestoreAnchor(
  slot: SlotItem,
  maxFloor: number,
): Promise<{
  hiddenCount: number;
  restoredPlugins: string[];
}> {
  const anchorFloor = slot.floor;
  const nativeChat = getNativeChatArray();
  const snapshotMap = new Map<number, ChatMessageSnapshotItem>();
  if (Array.isArray(slot.chat_messages_snapshot)) {
    for (const item of slot.chat_messages_snapshot) {
      snapshotMap.set(item.message_id, item);
    }
  }

  const horaeFloorsMap =
    (slot.horae_snapshot as { floors?: Record<string, unknown> } | null)?.floors ?? {};

  let hiddenCount = await syncFloorVisibilityAndCleanPluginMeta(
    slot,
    maxFloor,
    snapshotMap,
    horaeFloorsMap,
  );

  const anchorMvuStat =
    (slot.mvu_snapshot as { stat_data?: Record<string, unknown> } | null)?.stat_data ?? null;

  const allUpToAnchor = getChatMessages(`0-${anchorFloor}`, { hide_state: 'all', include_swipes: false });
  const allAfterAnchor =
    maxFloor > anchorFloor
      ? getChatMessages(`${anchorFloor + 1}-${maxFloor}`, { hide_state: 'all', include_swipes: false })
      : [];

  const updatesToApply: Array<{
    message_id: number;
    is_hidden: boolean;
    swipe_id?: number;
    data?: Record<string, unknown>;
    extra?: Record<string, unknown>;
  }> = [];

  for (const msg of allUpToAnchor) {
    const fid = msg.message_id;
    const snap = snapshotMap.get(fid);
    const isAnchor = fid === anchorFloor;
    const targetHidden = isAnchor ? false : snap && typeof snap.is_hidden === 'boolean' ? snap.is_hidden : Boolean(msg.is_hidden);

    const nextData = safeClone({
      ...(msg.data ?? {}),
      ...(snap?.data ?? {}),
    });
    const wasOmitted = Boolean(snap?.extra?.bbs_omit || snap?.data?.bbs_omit);
    if (!wasOmitted) {
      delete nextData.bbs_omit;
      delete nextData.timeloop_abandoned;
    }
    if (isAnchor && anchorMvuStat) {
      nextData.stat_data = safeClone(anchorMvuStat);
    }

    const nextExtra = safeClone({
      ...(msg.extra ?? {}),
      ...(snap?.extra ?? {}),
    });
    if (!wasOmitted) {
      delete nextExtra.bbs_omit;
      delete nextExtra.timeloop_abandoned;
    }
    if (nextExtra.type === 'timeloop_abandoned') {
      const backupType = nextExtra._timeloop_backup_extra_type;
      if (typeof backupType === 'string' && backupType) {
        nextExtra.type = backupType;
      } else {
        delete nextExtra.type;
      }
      delete nextExtra._timeloop_backup_extra_type;
    }
    const qqjBackup = nextExtra._timeloop_backup_qqj as Record<string, unknown> | undefined;
    if (qqjBackup && typeof qqjBackup === 'object') {
      for (const key of QQJ_FLOOR_KEYS) {
        if (qqjBackup[key] !== undefined && nextExtra[key] === undefined) {
          nextExtra[key] = safeClone(qqjBackup[key]);
        }
      }
      delete nextExtra._timeloop_backup_qqj;
    }
    const savedHorae =
      snap?.horae_meta ??
      (horaeFloorsMap[String(fid)] as Record<string, unknown> | undefined);
    if (savedHorae && typeof savedHorae === 'object') {
      nextExtra.horae_meta = safeClone(savedHorae);
    }

    const updateEntry: {
      message_id: number;
      is_hidden: boolean;
      swipe_id?: number;
      data?: Record<string, unknown>;
      extra?: Record<string, unknown>;
    } = {
      message_id: fid,
      is_hidden: targetHidden,
      data: nextData,
      extra: nextExtra,
    };
    if (typeof snap?.swipe_id === 'number') {
      updateEntry.swipe_id = snap.swipe_id;
    }
    updatesToApply.push(updateEntry);
  }

  for (const m of allAfterAnchor) {
    const fid = m.message_id;
    const rawMes = nativeChat?.[fid];
    const nextData = safeClone<Record<string, unknown>>({
      ...(m.data ?? {}),
      ...((rawMes?.data as Record<string, unknown> | undefined) ?? {}),
      timeloop_abandoned: true,
      bbs_omit: true,
    });
    if (anchorMvuStat) {
      nextData.stat_data = safeClone(anchorMvuStat);
    } else {
      delete nextData.stat_data;
    }

    const nextExtra = safeClone<Record<string, unknown>>({
      ...(m.extra ?? {}),
      ...((rawMes?.extra as Record<string, unknown> | undefined) ?? {}),
      timeloop_abandoned: true,
      bbs_omit: true,
      type: 'timeloop_abandoned',
    });
    delete nextExtra.horae_meta;
    delete nextExtra.memory;
    for (const key of ACU_FLOOR_KEYS) {
      delete nextExtra[key];
      delete nextData[key];
    }
    for (const key of QQJ_FLOOR_KEYS) {
      delete nextExtra[key];
    }

    updatesToApply.push({
      message_id: fid,
      is_hidden: true,
      data: nextData,
      extra: nextExtra,
    });
  }

  if (updatesToApply.length > 0) {
    await setChatMessages(updatesToApply, { refresh: 'affected' });
    hiddenCount = Math.max(hiddenCount, allAfterAnchor.length);
  }

  try {
    const parentDoc = window.parent?.document ?? document;
    if (Array.isArray(nativeChat)) {
      const upperAnchor = Math.min(anchorFloor, nativeChat.length - 1);
      for (let i = 0; i <= upperAnchor; i++) {
        const rawMes = nativeChat[i];
        const snap = snapshotMap.get(i);
        const isAnchor = i === anchorFloor;
        const targetHidden = isAnchor ? false : snap && typeof snap.is_hidden === 'boolean' ? snap.is_hidden : Boolean(rawMes?.is_hidden ?? rawMes?.is_system);
        if (rawMes) {
          rawMes.is_system = targetHidden;
          rawMes.is_hidden = targetHidden;
          const savedHorae =
            snap?.horae_meta ??
            (horaeFloorsMap[String(i)] as Record<string, unknown> | undefined) ??
            ((rawMes.extra as Record<string, unknown> | undefined)?._timeloop_backup_horae_meta as Record<string, unknown> | undefined);
          if (savedHorae) {
            rawMes.horae_meta = safeClone(savedHorae);
          }
          const savedAcu =
            snap?.acu_meta ??
            ((rawMes.extra as Record<string, unknown> | undefined)?._timeloop_backup_acu as Record<string, unknown> | undefined);
          if (savedAcu) {
            for (const [k, v] of Object.entries(savedAcu)) {
              rawMes[k] = safeClone(v);
            }
          }
        }
        const mesEl = parentDoc.querySelector(`#chat .mes[mesid="${i}"]`);
        if (mesEl) {
          mesEl.setAttribute('is_system', targetHidden ? 'true' : 'false');
        }
      }
      for (let i = anchorFloor + 1; i <= maxFloor; i++) {
        const rawMes = nativeChat[i];
        if (rawMes) {
          rawMes.is_system = true;
          rawMes.is_hidden = true;
          rawMes.bbs_omit = true;
          delete rawMes.horae_meta;
          for (const key of ACU_FLOOR_KEYS) {
            delete rawMes[key];
          }
        }
        const mesEl = parentDoc.querySelector(`#chat .mes[mesid="${i}"]`);
        if (mesEl) {
          mesEl.setAttribute('is_system', 'true');
        }
      }
    }
  } catch {
    // ignore DOM sync errors
  }

  const restoredPlugins = await restoreSlotExternalPlugins(slot);

  return {
    hiddenCount,
    restoredPlugins,
  };
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
    const rawCurrent = api.exportTableAsJson();
    const currentData =
      typeof rawCurrent === 'string' && rawCurrent.trim()
        ? (JSON.parse(rawCurrent) as Record<string, unknown>)
        : (rawCurrent as Record<string, unknown> | null);
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

export function extractEngramFloorMeta(
  floorId: number,
  preloaded?: PreloadedPluginMemoryContext | null,
): string | null {
  try {
    const events = preloaded?.engram?.events;
    if (!Array.isArray(events) || events.length === 0) return null;

    const matched = events.filter(ev => {
      if (!ev || ev.is_archived) return false;
      const start = ev.source_range?.start_index;
      const end = ev.source_range?.end_index;
      if (typeof end === 'number' && end === floorId) return true;
      if (typeof start === 'number' && typeof end !== 'number' && start === floorId) return true;
      return false;
    });

    if (matched.length === 0) return null;

    const lines: string[] = [];
    for (const ev of matched) {
      const kv = ev.structured_kv;
      const rangeStr =
        typeof ev.source_range?.start_index === 'number' && typeof ev.source_range?.end_index === 'number'
          ? `[#${ev.source_range.start_index}~#${ev.source_range.end_index}]`
          : '';
      const parts: string[] = [];
      if (kv?.time_anchor) parts.push(`时间:${kv.time_anchor}`);
      if (kv?.location) {
        const loc = Array.isArray(kv.location) ? kv.location.join('/') : kv.location;
        if (loc) parts.push(`地点:${loc}`);
      }
      if (Array.isArray(kv?.role) && kv.role.length > 0) {
        parts.push(`人物:${kv.role.join('、')}`);
      }
      if (kv?.event) parts.push(`事件:${kv.event}`);
      if (Array.isArray(kv?.logic) && kv.logic.length > 0) {
        parts.push(`逻辑:${kv.logic.join(';')}`);
      }
      if (kv?.causality) parts.push(`因果:${kv.causality}`);
      const summaryText = (ev.summary || '').trim();
      if (summaryText && !parts.some(p => summaryText.includes(p))) {
        parts.push(`摘要:${summaryText}`);
      }
      if (parts.length > 0) {
        lines.push(`${rangeStr}${parts.join(' | ')}`);
      }
    }

    return lines.length > 0 ? `Engram记忆节点 -> ${lines.join(' ； ')}` : null;
  } catch {
    return null;
  }
}

export function extractQqjFloorMeta(
  floorId: number,
  preloaded?: PreloadedPluginMemoryContext | null,
): string | null {
  try {
    const qqjData = preloaded?.qqj;
    const publicSnap = qqjData?.publicSnapshot ?? getQqjPublicBridge()?.getSnapshot?.() ?? null;
    const qianshiSnap = qqjData?.qianshiSnapshot ?? getQqjQianshiBackend()?.getSnapshot?.() ?? null;
    const detailedFloors =
      qqjData?.detailedFloors && qqjData.detailedFloors.length > 0
        ? qqjData.detailedFloors
        : (publicSnap?.memory?.floors ?? []);

    const parts: string[] = [];

    const memFloor = detailedFloors.find(f => f?.messageIndex === floorId);
    if (memFloor) {
      if (memFloor.chronologyAnchor?.explicitRef) {
        parts.push(`时间锚点:${memFloor.chronologyAnchor.explicitRef}`);
      }
      if (memFloor.summary && memFloor.summary.trim()) {
        parts.push(`本层总结:${memFloor.summary.trim()}`);
      }
      if (Array.isArray(memFloor.events) && memFloor.events.length > 0) {
        const evStrs = memFloor.events
          .map(e => [e.title, e.summary].filter(Boolean).join(':'))
          .filter(Boolean);
        if (evStrs.length > 0) parts.push(`关键事件:${evStrs.join('；')}`);
      }
      if (Array.isArray(memFloor.actions) && memFloor.actions.length > 0) {
        const actStrs = memFloor.actions
          .map(a => `${a.actor || ''}${a.action || ''}${a.target ? `→${a.target}` : ''}${a.outcome ? `(${a.outcome})` : ''}`)
          .filter(Boolean);
        if (actStrs.length > 0) parts.push(`行动结果:${actStrs.join('；')}`);
      }
      if (Array.isArray(memFloor.commitments) && memFloor.commitments.length > 0) {
        const comStrs = memFloor.commitments
          .map(c => `${c.actor || ''}承诺${c.target ? `对${c.target}` : ''}:${c.content || ''}${c.status ? `[${c.status}]` : ''}`)
          .filter(Boolean);
        if (comStrs.length > 0) parts.push(`约定承诺:${comStrs.join('；')}`);
      }
      if (Array.isArray(memFloor.openLoops) && memFloor.openLoops.length > 0) {
        parts.push(`未决伏笔:${memFloor.openLoops.filter(Boolean).join('；')}`);
      }
      if (Array.isArray(memFloor.relationshipShift) && memFloor.relationshipShift.length > 0) {
        const relStrs = memFloor.relationshipShift
          .map(r => `${Array.isArray(r.pair) ? r.pair.join('↔') : ''}:${r.summary || ''}`)
          .filter(Boolean);
        if (relStrs.length > 0) parts.push(`关系变化:${relStrs.join('；')}`);
      }
    }

    const cseFloor = publicSnap?.cse?.floors?.find(f => f?.messageIndex === floorId);
    if (cseFloor && Array.isArray(cseFloor.changes) && cseFloor.changes.length > 0) {
      const cseStrs = cseFloor.changes
        .map(ch => {
          const afterText = Array.isArray(ch.after) ? ch.after.join('、') : '';
          return afterText ? `${ch.subjectName}(${ch.layer || '状态'}):${afterText}` : '';
        })
        .filter(Boolean);
      if (cseStrs.length > 0) {
        parts.push(`双丝网状态演进:${cseStrs.join('；')}`);
      }
    }

    if (qianshiSnap) {
      const qsEvents = (qianshiSnap.events ?? []).filter(e => e?.sourceFloor?.messageIndex === floorId);
      if (qsEvents.length > 0) {
        const qsEvStrs = qsEvents
          .map(
            e =>
              `${e.storyTime?.displayText ? `[${e.storyTime.displayText}]` : ''}${e.title}${e.summary ? `:${e.summary}` : ''}${e.outcome ? `(结果:${e.outcome})` : ''}`,
          )
          .filter(Boolean);
        if (qsEvStrs.length > 0) parts.push(`千事事件:${qsEvStrs.join('；')}`);
      }
      const qsMatters = (qianshiSnap.matters ?? []).filter(m => m?.sourceFloor?.messageIndex === floorId);
      if (qsMatters.length > 0) {
        const qsMatStrs = qsMatters
          .map(
            m =>
              `${m.title}${m.status ? `[${m.status}]` : ''}${m.targetTimeText ? `(时限:${m.targetTimeText})` : ''}${m.summary ? `:${m.summary}` : ''}`,
          )
          .filter(Boolean);
        if (qsMatStrs.length > 0) parts.push(`千事待办:${qsMatStrs.join('；')}`);
      }
    }

    return parts.length > 0 ? `千千结/千事记录 -> ${parts.join(' | ')}` : null;
  } catch {
    return null;
  }
}

export function buildEngramSnapshotDiff(
  anchorSlot: SlotItem,
  anchorFloor: number,
  currentFloor: number,
  preloaded?: PreloadedPluginMemoryContext | null,
): string {
  try {
    const currentEngram = preloaded?.engram;
    if (!currentEngram) return '';

    const beforeEngram = anchorSlot.engram_snapshot as unknown as EngramSnapshotData | null;
    const lines: string[] = [];

    const rangeEvents = (currentEngram.events ?? []).filter(ev => {
      if (!ev || ev.is_archived) return false;
      const start = ev.source_range?.start_index;
      const end = ev.source_range?.end_index;
      if (typeof end === 'number' && end > anchorFloor && end <= currentFloor) return true;
      if (typeof start === 'number' && start > anchorFloor && start <= currentFloor) return true;
      return false;
    });

    if (rangeEvents.length > 0) {
      lines.push('【Engram·本段事件节点归纳】：');
      for (const ev of rangeEvents) {
        const kv = ev.structured_kv;
        const rangeTag =
          typeof ev.source_range?.start_index === 'number' && typeof ev.source_range?.end_index === 'number'
            ? `#${ev.source_range.start_index}~#${ev.source_range.end_index}`
            : '区间节点';
        const metaParts = [
          kv?.time_anchor ? `时间:${kv.time_anchor}` : '',
          kv?.location ? `地点:${Array.isArray(kv.location) ? kv.location.join('/') : kv.location}` : '',
          kv?.event ? `核心:${kv.event}` : '',
          kv?.causality ? `因果:${kv.causality}` : '',
        ].filter(Boolean);
        lines.push(`- [${rangeTag}] ${metaParts.join(' | ')}${ev.summary ? `\n  ${ev.summary.trim()}` : ''}`);
      }
    }

    const beforeEntityMap = new Map<string, EngramEntityNode>();
    for (const en of beforeEngram?.entities ?? []) {
      if (en?.id) beforeEntityMap.set(en.id, en);
    }

    const entityDiffs: string[] = [];
    for (const en of currentEngram.entities ?? []) {
      if (!en?.id || en.is_archived) continue;
      const prev = beforeEntityMap.get(en.id);
      if (!prev) {
        entityDiffs.push(
          `- [新增实体] ${en.name}(${en.type}): ${(en.description || JSON.stringify(en.profile ?? {})).slice(0, 180)}`,
        );
      } else if (
        (prev.description ?? '') !== (en.description ?? '') ||
        JSON.stringify(prev.profile ?? {}) !== JSON.stringify(en.profile ?? {})
      ) {
        entityDiffs.push(
          `- [状态更新] ${en.name}(${en.type}): ${(en.description || JSON.stringify(en.profile ?? {})).slice(0, 180)}`,
        );
      }
    }

    if (entityDiffs.length > 0) {
      lines.push(`【Engram·实体图谱与人物/世界状态变化】：\n${entityDiffs.join('\n')}`);
    }

    return lines.join('\n\n');
  } catch {
    return '';
  }
}

export function buildQqjSnapshotDiff(
  anchorSlot: SlotItem,
  anchorFloor: number,
  currentFloor: number,
  preloaded?: PreloadedPluginMemoryContext | null,
): string {
  try {
    const qqjData = preloaded?.qqj;
    const afterPub = qqjData?.publicSnapshot ?? getQqjPublicBridge()?.getSnapshot?.() ?? null;
    const afterQs = qqjData?.qianshiSnapshot ?? getQqjQianshiBackend()?.getSnapshot?.() ?? null;
    if (!afterPub && !afterQs) return '';

    const beforeSnap = anchorSlot.qqj_snapshot as unknown as QqjSnapshotData | null;
    const beforePub = beforeSnap?.publicSnapshot ?? null;
    const beforeQs = beforeSnap?.qianshiSnapshot ?? null;

    const sections: string[] = [];

    // 1. 千事 (Qianshi) 故事时间、区间新增事件与事项推进
    if (afterQs) {
      const bTime = beforeQs?.currentStoryTime?.displayText || beforeQs?.anchor?.rawText || '';
      const aTime = afterQs.currentStoryTime?.displayText || afterQs.anchor?.rawText || '';
      if (aTime) {
        sections.push(`【千事·故事时间推进】：${bTime ? `${bTime} → ${aTime}` : aTime}`);
      }

      const rangeQsEvents = (afterQs.events ?? []).filter(ev => {
        const msgIdx = ev?.sourceFloor?.messageIndex;
        return typeof msgIdx === 'number' && msgIdx > anchorFloor && msgIdx <= currentFloor;
      });
      if (rangeQsEvents.length > 0) {
        const evLines = rangeQsEvents.map(
          ev =>
            `- ${ev.storyTime?.displayText ? `[${ev.storyTime.displayText}] ` : ''}${ev.title}${ev.location ? ` @${ev.location}` : ''}: ${ev.summary || ''}${ev.outcome ? ` (结局:${ev.outcome})` : ''}`,
        );
        sections.push(`【千事·本段大事记】：\n${evLines.join('\n')}`);
      }

      const beforeMatterMap = new Map<string, string>();
      for (const m of beforeQs?.matters ?? []) {
        if (m?.title) beforeMatterMap.set(m.id || m.title, `${m.status || ''}|${m.summary || ''}|${m.outcome || ''}`);
      }
      const matterLines: string[] = [];
      for (const m of afterQs.matters ?? []) {
        if (!m?.title) continue;
        const key = m.id || m.title;
        const sig = `${m.status || ''}|${m.summary || ''}|${m.outcome || ''}`;
        const msgIdx = m.sourceFloor?.messageIndex;
        const isInRange = typeof msgIdx === 'number' && msgIdx > anchorFloor && msgIdx <= currentFloor;
        if (isInRange || beforeMatterMap.get(key) !== sig) {
          matterLines.push(
            `- ${m.title}${m.status ? `[${m.status}]` : ''}${m.targetTimeText ? `(时限:${m.targetTimeText})` : ''}: ${m.summary || ''}${m.outcome ? ` → ${m.outcome}` : ''}`,
          );
        }
      }
      if (matterLines.length > 0) {
        sections.push(`【千事·事项与待办推进】：\n${matterLines.join('\n')}`);
      }
    }

    // 2. 千千结 双丝网 (CSE) 角色核心/适应/情境状态变化
    if (Array.isArray(afterPub?.cse?.currentSubjects) && afterPub.cse.currentSubjects.length > 0) {
      const beforeSubjMap = new Map<string, string>();
      for (const s of beforePub?.cse?.currentSubjects ?? []) {
        if (s?.subjectName) {
          beforeSubjMap.set(
            s.subjectName,
            JSON.stringify([s.coreState ?? [], s.adaptiveState ?? [], s.situationalState ?? []]),
          );
        }
      }
      const cseLines: string[] = [];
      for (const s of afterPub.cse.currentSubjects) {
        if (!s?.subjectName) continue;
        const curSig = JSON.stringify([s.coreState ?? [], s.adaptiveState ?? [], s.situationalState ?? []]);
        if (beforeSubjMap.get(s.subjectName) !== curSig) {
          const states = [
            Array.isArray(s.coreState) && s.coreState.length > 0 ? `核心[${s.coreState.join('、')}]` : '',
            Array.isArray(s.adaptiveState) && s.adaptiveState.length > 0 ? `适应[${s.adaptiveState.join('、')}]` : '',
            Array.isArray(s.situationalState) && s.situationalState.length > 0
              ? `当前情境[${s.situationalState.join('、')}]`
              : '',
          ].filter(Boolean);
          if (states.length > 0) {
            cseLines.push(`- ${s.subjectName}: ${states.join(' | ')}`);
          }
        }
      }
      if (cseLines.length > 0) {
        sections.push(`【千千结·双丝网角色心理与状态演进】：\n${cseLines.join('\n')}`);
      }
    }

    // 3. 千千结 区间未决伏笔与承诺汇总
    const detailedFloors =
      qqjData?.detailedFloors && qqjData.detailedFloors.length > 0
        ? qqjData.detailedFloors
        : (afterPub?.memory?.floors ?? []);
    const rangeFloors = detailedFloors.filter(
      f => typeof f?.messageIndex === 'number' && f.messageIndex > anchorFloor && f.messageIndex <= currentFloor,
    );
    if (rangeFloors.length > 0) {
      const openLoops = new Set<string>();
      const commitments: string[] = [];
      for (const f of rangeFloors) {
        for (const ol of f.openLoops ?? []) {
          if (ol && ol.trim()) openLoops.add(ol.trim());
        }
        for (const c of f.commitments ?? []) {
          if (c?.content) {
            commitments.push(
              `${c.actor || ''}对${c.target || '对方'}承诺:${c.content}${c.status ? `[${c.status}]` : ''}`,
            );
          }
        }
      }
      if (commitments.length > 0) {
        sections.push(`【千千结·区间关键约定与承诺】：\n- ${commitments.join('\n- ')}`);
      }
      if (openLoops.size > 0) {
        sections.push(`【千千结·区间暴露的伏笔与未决危机】：\n- ${Array.from(openLoops).join('\n- ')}`);
      }
    }

    return sections.join('\n\n');
  } catch {
    return '';
  }
}
