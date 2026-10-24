import { klona } from 'klona';
import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import {
  ApiSettingsSchema,
  ChatArchiveDataSchema,
  DEFAULT_SUMMARY_SYSTEM_PROMPT,
  DEFAULT_SUMMARY_USER_PROMPT,
  SLOT_KEYS,
  type ApiMode,
  type ApiSettings,
  type ChatArchiveData,
  type ColorMode,
  type CustomApiPreset,
  type LoopMemoryItem,
  type SlotItem,
  type SlotKey,
  type SummarySourceMode,
  type TagFilterMode,
  type ThemeColor,
} from './types';

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export {
  DEFAULT_SUMMARY_SYSTEM_PROMPT,
  DEFAULT_SUMMARY_USER_PROMPT,
  SLOT_KEYS,
  type ApiMode,
  type ApiSettings,
  type ChatArchiveData,
  type ColorMode,
  type CustomApiPreset,
  type LoopMemoryItem,
  type SlotItem,
  type SlotKey,
  type SummarySourceMode,
  type TagFilterMode,
  type ThemeColor,
};

const PERSISTENT_INJECT_ID = 'timeloop_persistent_memories';
const LOCAL_SETTINGS_KEY = 'timeloop_global_settings_v2';
const LOCAL_ARCHIVES_PREFIX = 'timeloop_chat_archive_v2::';

function resolveCurrentChatId(): string {
  try {
    const id = SillyTavern?.getCurrentChatId?.();
    if (id && typeof id === 'string' && id.trim().length > 0) {
      return id.trim();
    }
  } catch {
    // ignore
  }
  return 'default_unbound_chat';
}

function getArchiveStorageKey(chatId: string): string {
  return `${LOCAL_ARCHIVES_PREFIX}${chatId}`;
}

function readLocalSettings(): Partial<ApiSettings> {
  try {
    const raw = window.parent.localStorage.getItem(LOCAL_SETTINGS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return {};
}

function writeLocalSettings(data: ApiSettings) {
  try {
    window.parent.localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

function readLocalArchive(chatId: string): ChatArchiveData | null {
  try {
    const raw = window.parent.localStorage.getItem(getArchiveStorageKey(chatId));
    if (raw) {
      const parsed = ChatArchiveDataSchema.safeParse(JSON.parse(raw));
      if (parsed.success) {
        return parsed.data;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function writeLocalArchive(chatId: string, archive: ChatArchiveData) {
  try {
    window.parent.localStorage.setItem(getArchiveStorageKey(chatId), JSON.stringify(archive));
  } catch {
    // ignore
  }
}

export const useTimeLoopStore = defineStore('timeloop_store', () => {
  const scriptScope = { type: 'script' as const, script_id: getScriptId() };

  function loadInitialSettings(): ApiSettings {
    const local = readLocalSettings();
    let scriptVars: Record<string, unknown>;
    try {
      scriptVars = getVariables(scriptScope) ?? {};
    } catch {
      scriptVars = {};
    }
    const mergedRaw = { ...local, ...scriptVars } as Record<string, unknown>;
    if (mergedRaw.api_mode === 'memory_plugin_api') {
      mergedRaw.api_mode = 'main_api';
    }
    const parsed = ApiSettingsSchema.parse(mergedRaw);

    // 1. 兼容迁移旧版 api_mode
    if (!mergedRaw.api_mode) {
      if (parsed.use_main_api === false) {
        parsed.api_mode = 'custom_api';
      } else {
        parsed.api_mode = 'main_api';
      }
    } else {
      parsed.use_main_api = parsed.api_mode === 'main_api';
    }

    // 2. 兼容迁移多套自定义 API 设置
    if (!Array.isArray(parsed.custom_api_presets) || parsed.custom_api_presets.length === 0) {
      const defaultPreset: CustomApiPreset = {
        id: generateUuid(),
        name: '自定义配置 1',
        api_url: parsed.api_url || 'https://api.openai.com/v1',
        api_key: parsed.api_key || '',
        model: parsed.model || 'gpt-4o-mini',
        model_list:
          Array.isArray(parsed.model_list) && parsed.model_list.length > 0
            ? parsed.model_list
            : [parsed.model || 'gpt-4o-mini'],
        stream: Boolean(parsed.stream),
      };
      parsed.custom_api_presets = [defaultPreset];
      parsed.active_custom_api_id = defaultPreset.id;
    } else if (
      !parsed.active_custom_api_id ||
      !parsed.custom_api_presets.some(p => p.id === parsed.active_custom_api_id)
    ) {
      parsed.active_custom_api_id = parsed.custom_api_presets[0].id;
    }

    // 同步当前激活的自定义 API 到顶层字段
    const activePreset =
      parsed.custom_api_presets.find(p => p.id === parsed.active_custom_api_id) ?? parsed.custom_api_presets[0];
    if (activePreset) {
      parsed.api_url = activePreset.api_url;
      parsed.api_key = activePreset.api_key;
      parsed.model = activePreset.model;
      parsed.model_list = activePreset.model_list;
    }

    // 3. 将旧版过小的默认字数范围 180-320 自动升级为 300-800
    if (!parsed.summary_word_limit || parsed.summary_word_limit.trim() === '180-320') {
      parsed.summary_word_limit = '300-800';
    }

    if (!parsed.max_chunk_chars || parsed.max_chunk_chars < 1000) {
      parsed.max_chunk_chars = 32000;
    }

    return parsed;
  }

  function loadChatArchiveFor(chatId: string): ChatArchiveData {
    let chatVars: Record<string, unknown>;
    try {
      chatVars = getVariables({ type: 'chat' }) ?? {};
    } catch {
      chatVars = {};
    }

    const varBindChatId = typeof chatVars.timeloop_archive_chat_id === 'string' ? chatVars.timeloop_archive_chat_id : '';
    const hasChatArchivePayload =
      (chatVars.timeloop_slots && typeof chatVars.timeloop_slots === 'object') ||
      Array.isArray(chatVars.timeloop_memories);
    const isChatIdMatched = varBindChatId === chatId || (!varBindChatId && chatId !== 'default_unbound_chat');

    if (hasChatArchivePayload && isChatIdMatched) {
      const parsedFromChat = ChatArchiveDataSchema.safeParse({
        chat_id: chatId,
        updated_at: typeof chatVars.timeloop_updated_at === 'string' ? chatVars.timeloop_updated_at : '',
        timeloop_slots: chatVars.timeloop_slots ?? {},
        timeloop_memories: Array.isArray(chatVars.timeloop_memories) ? chatVars.timeloop_memories : [],
      });
      if (parsedFromChat.success) {
        writeLocalArchive(chatId, parsedFromChat.data);
        return parsedFromChat.data;
      }
    }

    const localArchive = readLocalArchive(chatId);
    if (localArchive) {
      return localArchive;
    }

    return ChatArchiveDataSchema.parse({
      chat_id: chatId,
      updated_at: new Date().toLocaleString(),
    });
  }

  const currentChatId = ref<string>(resolveCurrentChatId());
  const settings = ref<ApiSettings>(loadInitialSettings());
  const chatData = ref<ChatArchiveData>(loadChatArchiveFor(currentChatId.value));
  const isModalOpen = ref(false);
  const isHelpOpen = ref(false);
  const latestMemoryId = ref<string | null>(null);

  const occupiedSlotCount = computed(() => {
    const s = chatData.value.timeloop_slots;
    return SLOT_KEYS.filter(k => Boolean(s[k])).length;
  });

  function syncMemoryInjection() {
    try {
      const memories = chatData.value.timeloop_memories;
      uninjectPrompts([PERSISTENT_INJECT_ID]);

      if (!memories || memories.length === 0) {
        return;
      }

      const charName = SillyTavern?.name2 || '角色';
      const userName = SillyTavern?.name1 || '主角';

      const memoryBlocks = memories
        .map((memory, idx) => `【回溯记忆 #${idx + 1}（${memory.range_label}）】\n${memory.content}`)
        .join('\n\n');

      injectPrompts([
        {
          id: PERSISTENT_INJECT_ID,
          position: 'in_chat',
          depth: 2,
          role: 'system',
          should_scan: false,
          content: `<Cross_Timeline_Memory>
${charName} 与 ${userName} 保留以下已被时间回溯抹除的客观事件记录。当前物理世界与其他 NPC 已回到各存档点状态，且不保留这些记录中的经历。

${memoryBlocks}
</Cross_Timeline_Memory>`,
        },
      ]);
    } catch (e) {
      console.warn('[TimeLoop] 同步记忆提示词注入失败', e);
    }
  }

  function persistSettings() {
    const rawSettings = klona(settings.value);
    writeLocalSettings(rawSettings);
    try {
      insertOrAssignVariables(rawSettings, scriptScope);
    } catch (e) {
      console.warn('[TimeLoop] 保存脚本设置变量失败', e);
    }
  }

  function persistChatArchive() {
    const activeId = resolveCurrentChatId();
    currentChatId.value = activeId;
    chatData.value.chat_id = activeId;
    chatData.value.updated_at = new Date().toLocaleString();

    const slotsClone = klona(chatData.value.timeloop_slots);
    const memoriesClone = klona(chatData.value.timeloop_memories);

    try {
      insertOrAssignVariables(
        {
          timeloop_archive_chat_id: activeId,
          timeloop_updated_at: chatData.value.updated_at,
          timeloop_slots: slotsClone,
          timeloop_memories: memoriesClone,
        },
        { type: 'chat' },
      );
    } catch (e) {
      console.warn('[TimeLoop] 保存聊天变量失败', e);
    }

    writeLocalArchive(activeId, chatData.value);
    syncMemoryInjection();
  }

  watch(
    settings,
    () => {
      persistSettings();
    },
    { deep: true },
  );

  function refreshChatSlots() {
    const newChatId = resolveCurrentChatId();
    const isChanged = currentChatId.value !== newChatId;
    currentChatId.value = newChatId;
    chatData.value = loadChatArchiveFor(newChatId);
    if (isChanged) {
      latestMemoryId.value = null;
      try {
        uninjectPrompts(['timeloop_rewind_notice']);
      } catch {
        // ignore
      }
    }
    syncMemoryInjection();
  }

  function setColorMode(mode: ColorMode) {
    settings.value.color_mode = mode;
  }

  function toggleColorMode() {
    settings.value.color_mode = settings.value.color_mode === 'dark' ? 'light' : 'dark';
  }

  function setThemeColor(color: ThemeColor) {
    settings.value.theme_color = color;
  }

  const activeCustomPreset = computed<CustomApiPreset>(() => {
    const list = settings.value.custom_api_presets;
    const found = list.find(p => p.id === settings.value.active_custom_api_id);
    if (found) return found;
    if (list.length > 0) return list[0];
    const fallback: CustomApiPreset = {
      id: 'default_preset',
      name: '自定义配置 1',
      api_url: settings.value.api_url || 'https://api.openai.com/v1',
      api_key: settings.value.api_key || '',
      model: settings.value.model || 'gpt-4o-mini',
      model_list: settings.value.model_list?.length ? settings.value.model_list : ['gpt-4o-mini'],
      stream: Boolean(settings.value.stream),
    };
    return fallback;
  });

  function syncActivePresetToLegacyFields() {
    const cur = activeCustomPreset.value;
    settings.value.api_url = cur.api_url;
    settings.value.api_key = cur.api_key;
    settings.value.model = cur.model;
    settings.value.model_list = [...cur.model_list];
  }

  function setApiMode(mode: ApiMode) {
    settings.value.api_mode = mode;
    settings.value.use_main_api = mode === 'main_api';
  }

  function selectCustomApiPreset(id: string) {
    if (!settings.value.custom_api_presets.some(p => p.id === id)) return;
    settings.value.active_custom_api_id = id;
    syncActivePresetToLegacyFields();
  }

  function addCustomApiPreset(partial?: Partial<CustomApiPreset>): CustomApiPreset {
    const index = settings.value.custom_api_presets.length + 1;
    const newPreset: CustomApiPreset = {
      id: generateUuid(),
      name: partial?.name?.trim() || `自定义配置 ${index}`,
      api_url: partial?.api_url ?? 'https://api.openai.com/v1',
      api_key: partial?.api_key ?? '',
      model: partial?.model ?? 'gpt-4o-mini',
      model_list: partial?.model_list?.length ? [...partial.model_list] : [partial?.model || 'gpt-4o-mini'],
      stream: partial?.stream ?? Boolean(settings.value.stream),
    };
    settings.value.custom_api_presets.push(newPreset);
    settings.value.active_custom_api_id = newPreset.id;
    syncActivePresetToLegacyFields();
    return newPreset;
  }

  function duplicateCustomApiPreset(id: string): CustomApiPreset | null {
    const source = settings.value.custom_api_presets.find(p => p.id === id);
    if (!source) return null;
    return addCustomApiPreset({
      name: `${source.name} (副本)`,
      api_url: source.api_url,
      api_key: source.api_key,
      model: source.model,
      model_list: [...source.model_list],
      stream: source.stream,
    });
  }

  function removeCustomApiPreset(id: string) {
    const list = settings.value.custom_api_presets;
    const idx = list.findIndex(p => p.id === id);
    if (idx === -1) return;
    list.splice(idx, 1);

    if (list.length === 0) {
      const resetPreset: CustomApiPreset = {
        id: generateUuid(),
        name: '自定义配置 1',
        api_url: 'https://api.openai.com/v1',
        api_key: '',
        model: 'gpt-4o-mini',
        model_list: ['gpt-4o-mini'],
        stream: false,
      };
      list.push(resetPreset);
      settings.value.active_custom_api_id = resetPreset.id;
    } else if (settings.value.active_custom_api_id === id) {
      const nextIdx = Math.min(idx, list.length - 1);
      settings.value.active_custom_api_id = list[nextIdx].id;
    }
    syncActivePresetToLegacyFields();
  }

  function compactSlots() {
    const nonNullSlots = SLOT_KEYS.map(k => chatData.value.timeloop_slots[k]).filter((s): s is SlotItem => Boolean(s));

    chatData.value.timeloop_slots = {
      slot_1: nonNullSlots[0] ?? null,
      slot_2: nonNullSlots[1] ?? null,
      slot_3: nonNullSlots[2] ?? null,
      slot_4: nonNullSlots[3] ?? null,
      slot_5: nonNullSlots[4] ?? null,
    };
  }

  function clearSlot(key: SlotKey) {
    chatData.value.timeloop_slots[key] = null;
    compactSlots();
    persistChatArchive();
  }

  function updateMemory(id: string, payload: { range_label?: string; content: string }) {
    const target = chatData.value.timeloop_memories.find(item => item.id === id);
    if (!target) return false;
    if (typeof payload.range_label === 'string' && payload.range_label.trim()) {
      target.range_label = payload.range_label.trim();
    }
    target.content = payload.content.trim();
    target.timestamp = `${new Date().toLocaleTimeString()} (已修改)`;
    persistChatArchive();
    return true;
  }

  function addMemory(rangeLabel: string, content: string): LoopMemoryItem {
    const newItem: LoopMemoryItem = {
      id: generateUuid(),
      range_label: rangeLabel.trim() || '手动补充记录',
      content: content.trim(),
      timestamp: new Date().toLocaleTimeString(),
    };
    chatData.value.timeloop_memories.push(newItem);
    latestMemoryId.value = newItem.id;
    persistChatArchive();
    return newItem;
  }

  function deleteMemory(id: string) {
    chatData.value.timeloop_memories = chatData.value.timeloop_memories.filter(m => m.id !== id);
    if (latestMemoryId.value === id) {
      latestMemoryId.value = null;
    }
    persistChatArchive();
  }

  function resetSummaryPrompts() {
    settings.value.summary_word_limit = '300-800';
    settings.value.summary_system_prompt = DEFAULT_SUMMARY_SYSTEM_PROMPT;
    settings.value.summary_user_prompt = DEFAULT_SUMMARY_USER_PROMPT;
  }

  function resetCurrentChatArchive() {
    chatData.value.timeloop_slots = {
      slot_1: null,
      slot_2: null,
      slot_3: null,
      slot_4: null,
      slot_5: null,
    };
    chatData.value.timeloop_memories = [];
    latestMemoryId.value = null;
    persistChatArchive();
  }

  syncMemoryInjection();

  return {
    settings,
    activeCustomPreset,
    chatData,
    currentChatId,
    occupiedSlotCount,
    isModalOpen,
    isHelpOpen,
    latestMemoryId,
    refreshChatSlots,
    syncMemoryInjection,
    persistSettings,
    persistChatArchive,
    setColorMode,
    toggleColorMode,
    setThemeColor,
    setApiMode,
    selectCustomApiPreset,
    addCustomApiPreset,
    duplicateCustomApiPreset,
    removeCustomApiPreset,
    syncActivePresetToLegacyFields,
    compactSlots,
    clearSlot,
    updateMemory,
    addMemory,
    deleteMemory,
    resetSummaryPrompts,
    resetCurrentChatArchive,
  };
});
