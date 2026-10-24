<template>
  <div
    class="timeloop-theme-scope"
    :data-mode="store.settings.color_mode"
    :data-theme="store.settings.theme_color"
    @touchstart.passive="noopTouch"
  >
    <!-- 备用快捷栏按钮：通过 Teleport 放到 #qr--bar 内，不影响弹窗在 body 的顶层定位 -->
    <Teleport v-if="qrBarEl && showFallbackQrBtn" :to="qrBarEl">
      <button
        type="button"
        class="qr--button menu_button interactable timeloop-qr-btn"
        title="打开时空回溯系统"
        @click="toggleModal"
      >
        <span class="timeloop-qr-symbol">↺</span>
        <span>时空回溯</span>
      </button>
    </Teleport>

    <!-- 主模态框 -->
    <div v-if="store.isModalOpen && !store.isMinimized" class="timeloop-overlay" @click.self="closeModal">
      <div class="timeloop-modal" @click.stop>
        <!-- 顶部栏 -->
        <header class="timeloop-header">
          <div class="timeloop-brand">
            <div class="timeloop-logo">
              <FlatIcon name="loop" />
            </div>
            <h2 class="timeloop-title">时空回溯</h2>
          </div>

          <div class="timeloop-header-actions">
            <button
              type="button"
              class="tl-icon-btn"
              title="使用说明"
              aria-label="使用说明"
              @click="store.isHelpOpen = true"
            >
              <FlatIcon name="help" />
            </button>

            <button
              type="button"
              class="tl-icon-btn"
              :title="store.settings.color_mode === 'dark' ? '切换日间模式' : '切换夜间模式'"
              :aria-label="store.settings.color_mode === 'dark' ? '切换日间模式' : '切换夜间模式'"
              @click="store.toggleColorMode()"
            >
              <FlatIcon :name="store.settings.color_mode === 'dark' ? 'moon' : 'sun'" />
            </button>

            <button
              type="button"
              class="tl-icon-btn"
              title="最小化窗口（查看后方页面或弹窗）"
              aria-label="最小化窗口"
              @click="minimizeModal"
            >
              <FlatIcon name="minimize" />
            </button>

            <button
              type="button"
              class="tl-icon-btn tl-close-btn"
              :title="isBusy ? '后台运行并收起窗口' : '关闭'"
              :aria-label="isBusy ? '后台运行并收起窗口' : '关闭'"
              @click="closeModal"
            >
              <FlatIcon name="close" />
            </button>
          </div>
        </header>

        <!-- 极简状态条：自动显示已识别到的记忆插件，无需手动选择 -->
        <div class="timeloop-statusbar">
          <div class="tl-status-left">
            <FlatIcon name="folder" />
            <span>{{ shortChatId }}</span>
          </div>

          <div class="tl-status-right">
            <template v-if="activePlugins.length > 0">
              <span class="tl-plugin-tag">已联动：{{ activePlugins.join(' · ') }}</span>
            </template>
            <template v-else>
              <span class="tl-plugin-tag is-muted">聊天原文模式</span>
            </template>
          </div>
        </div>

        <!-- 导航页签 -->
        <nav class="timeloop-tabs">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            type="button"
            class="timeloop-tab"
            :class="{ active: activeTab === tab.id }"
            @click="activeTab = tab.id"
          >
            <FlatIcon :name="tab.icon" />
            <span>{{ tab.label }}</span>
            <span v-if="tab.badge !== undefined" class="tl-tab-badge">{{ tab.badge }}</span>
          </button>
        </nav>

        <!-- 内容区 -->
        <main class="timeloop-content">
          <SlotsPanel
            v-if="activeTab === 'slots'"
            :slots="store.chatData.timeloop_slots"
            :memories="store.chatData.timeloop_memories"
            :is-busy="isBusy"
            :busy-slot-key="busySlotKey"
            :just-saved-key="justSavedSlotKey"
            @save="saveSlot"
            @rewind="rewindToSlot"
            @clear="handleClearSlot"
            @view-memories="activeTab = 'memories'"
          />

          <MemoriesPanel
            v-else-if="activeTab === 'memories'"
            :memories="store.chatData.timeloop_memories"
            :latest-memory-id="store.latestMemoryId"
            @update="handleUpdateMemory"
            @add="handleAddMemory"
            @delete="handleDeleteMemory"
            @clear-all="handleClearAllMemories"
          />

          <SettingsPanel v-else-if="activeTab === 'settings'" />
        </main>

        <!-- 说明书弹窗 -->
        <HelpModal :open="store.isHelpOpen" @close="store.isHelpOpen = false" />
      </div>
    </div>

    <!-- 最小化悬浮胶囊：可随时查看后方页面与弹窗，点击立即恢复主窗口 -->
    <div v-if="store.isModalOpen && store.isMinimized" class="timeloop-minimized-dock">
      <button
        type="button"
        class="timeloop-minimized-pill"
        :class="{ 'is-busy': isBusy }"
        title="点击恢复时空回溯窗口"
        @click="restoreModal"
      >
        <span class="tl-pill-icon" :class="{ 'tl-spin': isBusy }">
          <FlatIcon name="loop" />
        </span>
        <span class="tl-pill-text">
          {{ isBusy ? '正在回溯总结中 · 点击展开' : '时空回溯 · 点击展开' }}
        </span>
      </button>
      <button
        v-if="!isBusy"
        type="button"
        class="timeloop-minimized-close"
        title="关闭时空回溯窗口"
        aria-label="关闭"
        @click="closeModal"
      >
        <FlatIcon name="close" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import FlatIcon, { type FlatIconName } from './components/FlatIcon.vue';
import HelpModal from './components/HelpModal.vue';
import MemoriesPanel from './components/MemoriesPanel.vue';
import SettingsPanel from './components/SettingsPanel.vue';
import SlotsPanel from './components/SlotsPanel.vue';
import {
  callCustomOpenAiApi,
  captureMvuSnapshot,
  getActivePluginNames,
  getDatabaseApi,
  getHoraeApi,
  getMvuApi,
  normalizeOpenAiBaseUrl,
} from './plugins';
import { useTimeLoopStore, type SlotKey } from './store';
import {
  buildChunkMapPrompt,
  buildChunkReducePrompt,
  buildSummaryPrompts,
  cleanRawMessageText,
  cleanSummaryOutputText,
  splitTimelineIntoChunks,
  type BuildSummaryPromptsOptions,
} from './summarizer';

const store = useTimeLoopStore();

type TabId = 'slots' | 'memories' | 'settings';
const activeTab = ref<TabId>('slots');
const isBusy = ref(false);
const busySlotKey = ref<SlotKey | null>(null);
const justSavedSlotKey = ref<SlotKey | null>(null);
const showFallbackQrBtn = ref(false);
const qrBarEl = ref<Element | null>(null);
const slotKeys: SlotKey[] = ['slot_1', 'slot_2', 'slot_3', 'slot_4', 'slot_5'];

let unregisterHorae: Array<() => void> = [];
let qrCheckTimer: ReturnType<typeof setTimeout> | null = null;
let savedFeedbackTimer: ReturnType<typeof setTimeout> | null = null;

// 用于在 iOS Safari 中激活 :active 伪类触控反馈
function noopTouch() {
  // empty
}

const tabs = computed<Array<{ id: TabId; label: string; icon: FlatIconName; badge?: number | string }>>(() => [
  {
    id: 'slots',
    label: '时间锚点',
    icon: 'anchor',
    badge: `${store.occupiedSlotCount}/5`,
  },
  {
    id: 'memories',
    label: '记忆库',
    icon: 'memory',
    badge: store.chatData.timeloop_memories.length,
  },
  {
    id: 'settings',
    label: '设置',
    icon: 'settings',
  },
]);

const shortChatId = computed(() => {
  const id = store.currentChatId || '未绑定';
  return id.length > 22 ? `${id.slice(0, 10)}...${id.slice(-8)}` : id;
});

const activePlugins = computed(() => {
  // 随弹窗打开或楼层变化动态计算已安装的记忆插件
  void store.isModalOpen;
  return getActivePluginNames();
});

function toggleModal() {
  store.refreshChatSlots();
  if (!store.isModalOpen) {
    store.isMinimized = false;
    store.isModalOpen = true;
  } else if (store.isMinimized) {
    store.isMinimized = false;
  } else if (isBusy.value) {
    store.isHelpOpen = false;
    store.isMinimized = true;
  } else {
    store.isHelpOpen = false;
    store.isModalOpen = false;
  }
}

function minimizeModal() {
  store.isHelpOpen = false;
  store.isMinimized = true;
}

function restoreModal() {
  store.isMinimized = false;
}

function closeModal() {
  if (isBusy.value) {
    store.isHelpOpen = false;
    store.isMinimized = true;
    toastr.info('回溯总结正在后台运行，已收起至右下角，可自由查看后方页面与弹窗');
    return;
  }
  store.isHelpOpen = false;
  store.isMinimized = false;
  store.isModalOpen = false;
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape' || !store.isModalOpen || store.isMinimized) return;
  if (store.isHelpOpen) {
    e.stopPropagation();
    store.isHelpOpen = false;
    return;
  }
  e.stopPropagation();
  if (isBusy.value) {
    minimizeModal();
  } else {
    closeModal();
  }
}

function checkQrBarButton() {
  const parentDoc = window.parent.document;
  const $qrBar = $('#qr--bar', parentDoc).first();
  qrBarEl.value = $qrBar.length ? $qrBar[0] : null;
  const hasHelperBtn = $('#qr--bar .qr--buttons', parentDoc).text().includes('时空回溯');
  showFallbackQrBtn.value = !hasHelperBtn;
}

function handleClearSlot(key: SlotKey) {
  store.clearSlot(key);
  if (justSavedSlotKey.value === key) {
    justSavedSlotKey.value = null;
  }
  toastr.info('已清空该锚点');
}

function handleUpdateMemory(id: string, payload: { range_label: string; content: string }) {
  store.updateMemory(id, payload);
}

function handleAddMemory(payload: { range_label: string; content: string }) {
  store.addMemory(payload.range_label, payload.content);
}

function handleDeleteMemory(id: string) {
  store.deleteMemory(id);
}

function handleClearAllMemories() {
  store.chatData.timeloop_memories = [];
  store.latestMemoryId = null;
  store.persistChatArchive();
  toastr.info('已清空所有记忆');
}

const saveSlot = errorCatched(async (key: SlotKey) => {
  const lastId = getLastMessageId();
  if (lastId < 0) {
    toastr.warning('当前还没有聊天记录');
    return;
  }

  const unhiddenList = getChatMessages(`0-${lastId}`, { hide_state: 'unhidden', include_swipes: false });
  const targetMsg = unhiddenList.length > 0 ? unhiddenList[unhiddenList.length - 1] : getChatMessages(lastId)[0];

  if (!targetMsg) {
    toastr.warning('未找到可记录的聊天楼层');
    return;
  }

  const floor = targetMsg.message_id;
  const cleanPreview = cleanRawMessageText(targetMsg.message) || targetMsg.message;

  let dbSnap: string | null = null;
  try {
    const exported = getDatabaseApi()?.exportTableAsJson?.();
    if (exported && typeof exported === 'object') {
      dbSnap = JSON.stringify(exported);
    }
  } catch {
    dbSnap = null;
  }

  const mvuSnap = captureMvuSnapshot(floor);

  store.chatData.timeloop_slots[key] = {
    floor,
    preview: cleanPreview.length > 90 ? `${cleanPreview.slice(0, 90)}...` : cleanPreview,
    timestamp: new Date().toLocaleTimeString(),
    database_snapshot: dbSnap,
    mvu_snapshot: mvuSnap,
  };
  store.persistChatArchive();
  justSavedSlotKey.value = key;
  if (savedFeedbackTimer) clearTimeout(savedFeedbackTimer);
  savedFeedbackTimer = setTimeout(() => {
    if (justSavedSlotKey.value === key) {
      justSavedSlotKey.value = null;
    }
  }, 1200);
  toastr.success(`已记录第 ${floor} 层为时间锚点`);
});

const rewindToSlot = errorCatched(async (key: SlotKey) => {
  if (isBusy.value) return;
  const slot = store.chatData.timeloop_slots[key];
  if (!slot) return;

  const lastMessageId = getLastMessageId();
  if (lastMessageId <= slot.floor) {
    toastr.warning(`当前最新楼层（第 ${lastMessageId} 层）未超过锚点（第 ${slot.floor} 层），无需回溯`);
    return;
  }

  const raw = getChatMessages(`${slot.floor + 1}-${lastMessageId}`, { hide_state: 'unhidden', include_swipes: false });
  if (raw.length === 0) {
    toastr.warning('锚点之后没有未隐藏的有效楼层可供回溯');
    return;
  }

  const anchor = getChatMessages(slot.floor, { hide_state: 'all', include_swipes: false })[0];
  if (!anchor) {
    toastr.error(`找不到第 ${slot.floor} 层的锚点原始消息`);
    return;
  }

  const effectiveCurrentFloor = raw[raw.length - 1].message_id;
  const startChatId = store.currentChatId;

  const dbApi = getDatabaseApi();
  const apiMode = store.settings.api_mode;
  const activePreset = store.activeCustomPreset;
  const normalizedApiUrl = normalizeOpenAiBaseUrl(activePreset.api_url || store.settings.api_url);
  const customApiKey = (activePreset.api_key ?? store.settings.api_key).trim();
  const customModel = (activePreset.model || store.settings.model).trim();
  const useStream = Boolean(activePreset.stream ?? store.settings.stream);

  if (apiMode === 'custom_api') {
    if (!normalizedApiUrl || !customModel) {
      toastr.warning('请先在「设置」中配置自定义 API 地址与模型名称，或切换至酒馆主聊天 AI');
      activeTab.value = 'settings';
      return;
    }
  }

  const tagOptions = {
    mode: store.settings.tag_filter_mode ?? 'strip',
    tagsInput: store.settings.custom_filter_tags ?? 'think, thinking',
  };

  async function requestAiCompletion(sysPrompt: string, usrPrompt: string): Promise<string> {
    if (apiMode === 'custom_api') {
      return await callCustomOpenAiApi({
        apiUrl: normalizedApiUrl,
        apiKey: customApiKey,
        model: customModel,
        stream: useStream,
        systemPrompt: sysPrompt,
        userPrompt: usrPrompt,
      });
    }

    const result: unknown = await generateRaw({
      user_input: usrPrompt,
      ordered_prompts: [
        { role: 'system', content: sysPrompt },
        { role: 'user', content: usrPrompt },
      ],
    });
    return (typeof result === 'string' ? result : (result as { content?: string })?.content || '').trim();
  }

  isBusy.value = true;
  busySlotKey.value = key;
  toastr.info('正在提炼本轮记忆并回溯时间...');

  try {
    const char = SillyTavern?.name2 || '角色';
    const user = SillyTavern?.name1 || '主角';

    const promptOptions: BuildSummaryPromptsOptions = {
      messages: raw,
      slot,
      currentFloor: effectiveCurrentFloor,
      charName: char,
      userName: user,
      sourceMode: store.settings.summary_source_mode,
      fallbackToRaw: store.settings.fallback_to_raw,
      wordLimit: store.settings.summary_word_limit,
      systemPromptTemplate: store.settings.summary_system_prompt,
      userPromptTemplate: store.settings.summary_user_prompt,
      tagFilterMode: tagOptions.mode,
      customFilterTags: tagOptions.tagsInput,
    };

    const built = buildSummaryPrompts(promptOptions);
    const sourceDescription = built.sourceDescription;
    const maxChunkChars = Math.max(1000, Number(store.settings.max_chunk_chars) || 32000);
    const chunks = splitTimelineIntoChunks(built.timelineBlocks, built.timelineDataText, maxChunkChars);

    let resultText = '';
    if (chunks.length <= 1) {
      resultText = await requestAiCompletion(built.systemPrompt, built.userPrompt);
    } else {
      toastr.info(`回溯区间文本较长（已超 ${maxChunkChars} 字），将分 ${chunks.length} 批提炼后合并...`);
      const partialSummaries: string[] = [];

      for (let idx = 0; idx < chunks.length; idx++) {
        toastr.info(`正在分批提炼记忆 (${idx + 1}/${chunks.length})...`);
        const mapPrompt = buildChunkMapPrompt({
          baseSystemPrompt: built.systemPrompt,
          fromFloor: slot.floor + 1,
          toFloor: effectiveCurrentFloor,
          chunkIndex: idx + 1,
          totalChunks: chunks.length,
          chunkText: chunks[idx],
        });
        const chunkReply = await requestAiCompletion(mapPrompt.systemPrompt, mapPrompt.userPrompt);
        const cleanedChunk = cleanSummaryOutputText(chunkReply, tagOptions) || chunkReply.trim();
        if (cleanedChunk) {
          partialSummaries.push(cleanedChunk);
        }
      }

      if (partialSummaries.length === 0) {
        throw new Error('分批总结未获取到有效内容，回溯已中止');
      }

      toastr.info(`正在汇总合并 ${partialSummaries.length} 段阶段记录...`);
      const reducePrompt = buildChunkReducePrompt({
        options: promptOptions,
        built,
        partialSummaries,
      });
      resultText = await requestAiCompletion(reducePrompt.systemPrompt, reducePrompt.userPrompt);
    }

    store.refreshChatSlots();
    if (store.currentChatId !== startChatId) {
      throw new Error('回溯期间聊天已切换，为保护档案安全已中止本次回溯');
    }

    const memoryText = cleanSummaryOutputText(resultText, tagOptions) || cleanRawMessageText(resultText, tagOptions);
    if (!memoryText) {
      throw new Error('AI 返回的总结内容为空，回溯已中止');
    }

    const latestIdNow = getLastMessageId();
    const latestAnchor = getChatMessages(slot.floor, { hide_state: 'all', include_swipes: false })[0];
    if (!latestAnchor || latestIdNow < slot.floor) {
      throw new Error(`第 ${slot.floor} 层的锚点消息已不存在，回溯已中止`);
    }

    const toHide = getChatMessages(`${slot.floor}-${latestIdNow}`, { hide_state: 'unhidden', include_swipes: false });
    if (toHide.length > 0) {
      await setChatMessages(
        toHide.map(m => ({
          message_id: m.message_id,
          is_hidden: true,
          data: { ...m.data, timeloop_abandoned: true, bbs_omit: true },
          extra: { ...m.extra, timeloop_abandoned: true, bbs_omit: true },
        })),
        { refresh: 'affected' },
      );
    }

    const cleanAnchorData = { ...(latestAnchor.data ?? {}) };
    delete cleanAnchorData.timeloop_abandoned;
    delete cleanAnchorData.bbs_omit;

    const cleanAnchorExtra = { ...(latestAnchor.extra ?? {}) };
    delete cleanAnchorExtra.timeloop_abandoned;
    delete cleanAnchorExtra.bbs_omit;

    await createChatMessages(
      [
        {
          name: latestAnchor.name,
          role: latestAnchor.role,
          is_hidden: false,
          message: latestAnchor.message,
          data: cleanAnchorData,
          extra: cleanAnchorExtra,
        },
      ],
      { refresh: 'all' },
    );

    const newAnchorFloor = getLastMessageId();
    const oldAnchorFloor = slot.floor;
    const slotNumber = slotKeys.indexOf(key) + 1;
    const anchorTitle = `锚点 0${slotNumber}（第 ${newAnchorFloor} 层）`;

    const newItem = store.addMemory(
      `${anchorTitle} ← 原第 ${oldAnchorFloor + 1} 至 ${effectiveCurrentFloor} 层`,
      memoryText,
    );
    newItem.anchor_key = key;
    newItem.anchor_floor = newAnchorFloor;

    const clearedSubsequentFloors: number[] = [];
    for (const k of slotKeys) {
      const s = store.chatData.timeloop_slots[k];
      if (!s) continue;
      if (s.floor === oldAnchorFloor) {
        store.chatData.timeloop_slots[k] = { ...s, floor: newAnchorFloor };
      } else if (s.floor > oldAnchorFloor) {
        clearedSubsequentFloors.push(s.floor);
        store.chatData.timeloop_slots[k] = null;
      }
    }

    store.compactSlots();
    store.persistChatArchive();

    if (slot.database_snapshot && dbApi?.restoreTableAsJson) {
      const restored = await dbApi.restoreTableAsJson(slot.database_snapshot);
      if (restored) {
        await dbApi.refreshDataAndWorldbook?.();
      } else {
        toastr.warning('记忆表格快照恢复未成功');
      }
    }

    if (slot.mvu_snapshot) {
      try {
        const mvu = getMvuApi();
        if (mvu?.replaceMvuData) {
          await mvu.replaceMvuData(slot.mvu_snapshot, { type: 'message', message_id: 'latest' });
        }
      } catch {
        // ignore
      }
    }

    uninjectPrompts(['timeloop_rewind_notice']);
    injectPrompts(
      [
        {
          id: 'timeloop_rewind_notice',
          position: 'in_chat',
          depth: 0,
          role: 'system',
          content: `时间已从第 ${effectiveCurrentFloor} 层回溯至当前存档点。物理世界与其他 NPC 已恢复存档点状态并遗忘后续经历；${char} 与 ${user} 保留客观事件记录。请自然承接场景。`,
        },
      ],
      { once: true },
    );

    activeTab.value = 'memories';
    store.isMinimized = false;
    const clearedTip =
      clearedSubsequentFloors.length > 0
        ? `，已自动清除第 ${clearedSubsequentFloors.join('、')} 层的后续存档`
        : '';
    toastr.success(`回溯完成（${sourceDescription}${clearedTip}），可在此查看或修改总结内容`);
  } finally {
    isBusy.value = false;
    busySlotKey.value = null;
  }
});

function registerHorae() {
  const h = getHoraeApi();
  if (!h?.registerDataProvider || !h.registerPort) return;
  unregisterHorae = [
    h.registerDataProvider('timeloop', () => ({
      memories: store.chatData.timeloop_memories.length,
      slots: store.chatData.timeloop_slots,
    })),
    h.registerPort({
      id: 'timeloop.system.status',
      slot: 'status',
      priority: 85,
      render: () =>
        `<div class="horae-state-section"><div class="horae-section-header">时空回溯</div><div>保留记忆：${store.chatData.timeloop_memories.length}</div></div>`,
      update: () => undefined,
    }),
  ];
  h.refreshPorts?.();
}

onMounted(() => {
  checkQrBarButton();
  qrCheckTimer = setTimeout(checkQrBarButton, 600);
  registerHorae();
  window.parent.document.addEventListener('keydown', handleKeydown);
  window.document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  if (qrCheckTimer) clearTimeout(qrCheckTimer);
  if (savedFeedbackTimer) clearTimeout(savedFeedbackTimer);
  window.parent.document.removeEventListener('keydown', handleKeydown);
  window.document.removeEventListener('keydown', handleKeydown);
  unregisterHorae.forEach(fn => fn());
});
</script>
