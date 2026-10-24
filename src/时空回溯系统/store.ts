import { klona } from 'klona';
import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import {
  ApiSettingsSchema,
  ChatArchiveDataSchema,
  DEFAULT_SUMMARY_SYSTEM_PROMPT,
  DEFAULT_SUMMARY_USER_PROMPT,
  type ApiSettings,
  type ChatArchiveData,
  type ColorMode,
  type LoopMemoryItem,
  type SlotItem,
  type SlotKey,
  type SummarySourceMode,
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
  type ApiSettings,
  type ChatArchiveData,
  type ColorMode,
  type LoopMemoryItem,
  type SlotItem,
  type SlotKey,
  type SummarySourceMode,
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
    return ApiSettingsSchema.parse({ ...local, ...scriptVars });
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
    return [s.slot_1, s.slot_2, s.slot_3].filter(Boolean).length;
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

  function compactSlots() {
    const orderedKeys: SlotKey[] = ['slot_1', 'slot_2', 'slot_3'];
    const nonNullSlots = orderedKeys
      .map(k => chatData.value.timeloop_slots[k])
      .filter((s): s is SlotItem => Boolean(s));

    chatData.value.timeloop_slots = {
      slot_1: nonNullSlots[0] ?? null,
      slot_2: nonNullSlots[1] ?? null,
      slot_3: nonNullSlots[2] ?? null,
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
    settings.value.summary_word_limit = '180-320';
    settings.value.summary_system_prompt = DEFAULT_SUMMARY_SYSTEM_PROMPT;
    settings.value.summary_user_prompt = DEFAULT_SUMMARY_USER_PROMPT;
  }

  function resetCurrentChatArchive() {
    chatData.value.timeloop_slots = {
      slot_1: null,
      slot_2: null,
      slot_3: null,
    };
    chatData.value.timeloop_memories = [];
    latestMemoryId.value = null;
    persistChatArchive();
  }

  syncMemoryInjection();

  return {
    settings,
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
    clearSlot,
    updateMemory,
    addMemory,
    deleteMemory,
    resetSummaryPrompts,
    resetCurrentChatArchive,
  };
});
