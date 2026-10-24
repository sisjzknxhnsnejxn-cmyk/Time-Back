<template>
  <div class="tl-panel tl-settings-panel">
    <div class="tl-setting-card">
      <div class="tl-card-title">界面外观</div>

      <div class="tl-setting-row">
        <span class="tl-row-label">显示模式</span>
        <div class="tl-seg-group">
          <button
            type="button"
            class="tl-seg-btn"
            :class="{ active: store.settings.color_mode === 'dark' }"
            @click="store.setColorMode('dark')"
          >
            <FlatIcon name="moon" />
            <span>夜间</span>
          </button>
          <button
            type="button"
            class="tl-seg-btn"
            :class="{ active: store.settings.color_mode === 'light' }"
            @click="store.setColorMode('light')"
          >
            <FlatIcon name="sun" />
            <span>日间</span>
          </button>
        </div>
      </div>

      <div class="tl-setting-row">
        <span class="tl-row-label">主题色调</span>
        <div class="tl-color-pills">
          <button
            v-for="item in themeOptions"
            :key="item.id"
            type="button"
            class="tl-color-pill"
            :class="[item.pillClass, { active: store.settings.theme_color === item.id }]"
            @click="store.setThemeColor(item.id)"
          >
            <span class="tl-pill-dot" />
            <span>{{ item.label }}</span>
          </button>
        </div>
      </div>
    </div>

    <div class="tl-setting-card">
      <div class="tl-card-title">总结所用 AI 接口</div>

      <label class="tl-check-row">
        <input v-model="store.settings.use_main_api" type="checkbox" />
        <span>使用酒馆当前主聊天 AI（省心推荐）</span>
      </label>

      <label v-if="!store.settings.use_main_api && hasDatabaseAi" class="tl-check-row">
        <input v-model="store.settings.use_database_ai" type="checkbox" />
        <span>使用「记忆表格」插件配置的 AI 接口</span>
      </label>

      <div v-if="!store.settings.use_main_api && store.settings.use_database_ai && hasDatabaseAi" class="tl-field">
        <label class="tl-label">指定记忆表格 AI 预设名（留空默认）</label>
        <input v-model="store.settings.database_ai_preset" type="text" class="tl-input" placeholder="默认预设" />
      </div>

      <template v-if="!store.settings.use_main_api && (!store.settings.use_database_ai || !hasDatabaseAi)">
        <div class="tl-field">
          <label class="tl-label">API 地址 (OpenAI 兼容)</label>
          <input v-model="store.settings.api_url" type="text" class="tl-input" placeholder="https://api.openai.com/v1" />
        </div>
        <div class="tl-field">
          <label class="tl-label">API 密钥 (Key)</label>
          <input v-model="store.settings.api_key" type="password" class="tl-input" placeholder="sk-..." />
        </div>
        <div class="tl-field">
          <label class="tl-label">模型名称</label>
          <div class="tl-input-group">
            <select v-model="store.settings.model" class="tl-select">
              <option v-for="m in store.settings.model_list" :key="m" :value="m">{{ m }}</option>
            </select>
            <button
              type="button"
              class="tl-btn tl-btn-secondary tl-btn-sm"
              :disabled="isFetchingModels"
              @click="fetchModels"
            >
              {{ isFetchingModels ? '获取中...' : '拉取列表' }}
            </button>
          </div>
        </div>
      </template>
    </div>

    <div class="tl-setting-card">
      <div class="tl-card-title">总结读取方式</div>

      <div class="tl-seg-group tl-seg-triple">
        <button
          type="button"
          class="tl-seg-btn"
          :class="{ active: store.settings.summary_source_mode === 'hybrid' }"
          @click="store.settings.summary_source_mode = 'hybrid'"
        >
          混合读取（推荐）
        </button>
        <button
          type="button"
          class="tl-seg-btn"
          :class="{ active: store.settings.summary_source_mode === 'memory_plugin' }"
          @click="store.settings.summary_source_mode = 'memory_plugin'"
        >
          优先记忆插件
        </button>
        <button
          type="button"
          class="tl-seg-btn"
          :class="{ active: store.settings.summary_source_mode === 'raw_floors' }"
          @click="store.settings.summary_source_mode = 'raw_floors'"
        >
          只读聊天原文
        </button>
      </div>

      <div class="tl-setting-row">
        <span class="tl-row-label">总结字数范围</span>
        <input
          v-model="store.settings.summary_word_limit"
          type="text"
          class="tl-input tl-input-compact"
          placeholder="180-320"
        />
      </div>

      <div class="tl-setting-row">
        <button
          type="button"
          class="tl-btn tl-btn-ghost tl-btn-sm"
          @click="showPromptEditor = !showPromptEditor"
        >
          <FlatIcon name="edit" />
          <span>{{ showPromptEditor ? '收起提示词设置' : '自定义总结提示词' }}</span>
        </button>

        <button
          v-if="showPromptEditor"
          type="button"
          class="tl-btn tl-btn-danger-ghost tl-btn-sm"
          @click="handleResetPrompts"
        >
          恢复默认
        </button>
      </div>

      <div v-if="showPromptEditor" class="tl-prompt-box">
        <div class="tl-field">
          <label class="tl-label">系统提示词 (System Prompt)</label>
          <textarea v-model="store.settings.summary_system_prompt" rows="4" class="tl-textarea" />
        </div>
        <div class="tl-field">
          <label class="tl-label">用户提示词模板 (User Prompt)</label>
          <textarea v-model="store.settings.summary_user_prompt" rows="6" class="tl-textarea" />
        </div>
      </div>
    </div>

    <div class="tl-setting-card">
      <div class="tl-card-title">当前聊天档案</div>
      <div class="tl-setting-row">
        <span class="tl-row-label">档案：{{ shortChatId }}</span>
        <div class="tl-toolbar-actions">
          <button type="button" class="tl-btn tl-btn-secondary tl-btn-sm" @click="handleReloadArchive">
            <FlatIcon name="refresh" />
            <span>刷新</span>
          </button>
          <button type="button" class="tl-btn tl-btn-danger-ghost tl-btn-sm" @click="handleResetArchive">
            <FlatIcon name="trash" />
            <span>{{ confirmResetArchive ? '确认重置？' : '重置本档案' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';
import { getDatabaseApi, normalizeOpenAiBaseUrl } from '../plugins';
import { useTimeLoopStore } from '../store';
import type { ThemeColor } from '../types';
import FlatIcon from './FlatIcon.vue';

const store = useTimeLoopStore();

const showPromptEditor = ref(false);
const isFetchingModels = ref(false);
const confirmResetArchive = ref(false);
let resetArchiveTimer: ReturnType<typeof setTimeout> | null = null;

const themeOptions: Array<{ id: ThemeColor; label: string; pillClass: string }> = [
  { id: 'amber', label: '琥珀', pillClass: 'pill-amber' },
  { id: 'cyan', label: '青蓝', pillClass: 'pill-cyan' },
  { id: 'rose', label: '绯红', pillClass: 'pill-rose' },
  { id: 'emerald', label: '翠绿', pillClass: 'pill-emerald' },
];

const hasDatabaseAi = computed(() => Boolean(getDatabaseApi()?.callAI));

const shortChatId = computed(() => {
  const id = store.currentChatId || '未绑定';
  return id.length > 22 ? `${id.slice(0, 10)}...${id.slice(-8)}` : id;
});

function handleResetPrompts() {
  store.resetSummaryPrompts();
  toastr.success('已恢复默认提示词');
}

function handleReloadArchive() {
  store.refreshChatSlots();
  toastr.success('已刷新当前聊天档案');
}

function handleResetArchive() {
  if (!confirmResetArchive.value) {
    confirmResetArchive.value = true;
    if (resetArchiveTimer) clearTimeout(resetArchiveTimer);
    resetArchiveTimer = setTimeout(() => {
      confirmResetArchive.value = false;
    }, 2500);
    return;
  }
  confirmResetArchive.value = false;
  store.resetCurrentChatArchive();
  toastr.info('当前聊天的锚点与记忆已重置');
}

const fetchModels = errorCatched(async () => {
  const url = normalizeOpenAiBaseUrl(store.settings.api_url);
  const key = store.settings.api_key.trim();
  if (!url || !key) {
    toastr.warning('请先填写 API 地址和密钥');
    return;
  }
  store.settings.api_url = url;
  isFetchingModels.value = true;
  try {
    const res = await fetch(`${url}/models`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const models = Array.isArray(data?.data)
      ? data.data.map((x: { id?: string }) => x?.id).filter((x: unknown): x is string => Boolean(x))
      : [];
    if (!models.length) {
      toastr.warning('未获取到可用模型');
      return;
    }
    store.settings.model_list = models;
    if (!models.includes(store.settings.model)) {
      store.settings.model = models[0];
    }
    toastr.success(`已获取 ${models.length} 个模型`);
  } finally {
    isFetchingModels.value = false;
  }
});

onUnmounted(() => {
  if (resetArchiveTimer) clearTimeout(resetArchiveTimer);
});
</script>

