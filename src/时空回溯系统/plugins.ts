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

      return {
        message_id: fid,
        name: msg.name,
        role: msg.role,
        is_hidden: Boolean(msg.is_hidden),
        message: msg.message,
        swipe_id: msg.swipe_id,
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
    const nextData = safeClone({
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

    const nextExtra = safeClone({
      ...(m.extra ?? {}),
      ...((rawMes?.extra as Record<string, unknown> | undefined) ?? {}),
      timeloop_abandoned: true,
      bbs_omit: true,
    });
    delete nextExtra.horae_meta;
    delete nextExtra.memory;
    for (const key of ACU_FLOOR_KEYS) {
      delete nextExtra[key];
      delete nextData[key];
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
