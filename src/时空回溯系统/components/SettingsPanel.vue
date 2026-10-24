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

      <div class="tl-seg-group">
        <button
          type="button"
          class="tl-seg-btn"
          :class="{ active: store.settings.api_mode === 'main_api' }"
          @click="handleSelectApiMode('main_api')"
        >
          酒馆主聊天 AI
        </button>
        <button
          type="button"
          class="tl-seg-btn"
          :class="{ active: store.settings.api_mode === 'custom_api' }"
          @click="handleSelectApiMode('custom_api')"
        >
          自定义 API ({{ store.settings.custom_api_presets.length }})
        </button>
      </div>

      <!-- 模式 1：酒馆主聊天 AI -->
      <div v-if="store.settings.api_mode === 'main_api'" class="tl-api-mode-box">
        <div class="tl-api-hint">
          直接使用酒馆当前主聊天连接的 AI 接口与模型生成回溯总结，省心免配置。
        </div>
      </div>

      <!-- 模式 2：自定义 API（支持多个配置管理、自定义命名、流式/非流式切换与测试） -->
      <div v-else class="tl-api-mode-box">
        <div class="tl-custom-preset-header">
          <div class="tl-preset-tabs">
            <button
              v-for="preset in store.settings.custom_api_presets"
              :key="preset.id"
              type="button"
              class="tl-preset-pill"
              :class="{ active: preset.id === store.activeCustomPreset.id }"
              @click="handleSwitchCustomPreset(preset.id)"
            >
              <span class="tl-preset-pill-name">{{ preset.name || '未命名 API' }}</span>
              <span v-if="preset.model" class="tl-preset-pill-model">{{ preset.model }}</span>
            </button>
          </div>

          <div class="tl-preset-actions">
            <button
              type="button"
              class="tl-btn tl-btn-secondary tl-btn-sm"
              title="新增一个自定义 API 配置"
              @click="handleAddCustomPreset"
            >
              <FlatIcon name="plus" />
              <span>新增 API</span>
            </button>
            <button
              type="button"
              class="tl-btn tl-btn-ghost tl-btn-sm"
              title="复制当前 API 配置"
              @click="handleDuplicateCustomPreset"
            >
              <FlatIcon name="copy" />
              <span>复制</span>
            </button>
            <button
              type="button"
              class="tl-btn tl-btn-danger-ghost tl-btn-sm"
              title="删除当前 API 配置"
              @click="handleDeleteCustomPreset"
            >
              <FlatIcon name="trash" />
              <span>{{ confirmDeletePreset ? '确认删除？' : '删除' }}</span>
            </button>
          </div>
        </div>

        <div class="tl-field">
          <label class="tl-label">自定义配置名称（修改后实时更新上方标签）</label>
          <input
            v-model="store.activeCustomPreset.name"
            type="text"
            class="tl-input"
            placeholder="例如：DeepSeek 主力 / OpenAI / 硅基流动"
            @input="store.syncActivePresetToLegacyFields()"
          />
        </div>

        <div class="tl-setting-row">
          <span class="tl-row-label">请求传输方式</span>
          <div class="tl-seg-group">
            <button
              type="button"
              class="tl-seg-btn"
              :class="{ active: !store.activeCustomPreset.stream }"
              @click="handleSetStreamMode(false)"
            >
              非流式 (JSON)
            </button>
            <button
              type="button"
              class="tl-seg-btn"
              :class="{ active: Boolean(store.activeCustomPreset.stream) }"
              @click="handleSetStreamMode(true)"
            >
              流式传输 (Stream)
            </button>
          </div>
        </div>

        <div class="tl-field">
          <label class="tl-label">API 地址 (OpenAI 兼容)</label>
          <input
            v-model="store.activeCustomPreset.api_url"
            type="text"
            class="tl-input"
            placeholder="https://api.openai.com/v1"
            @input="store.syncActivePresetToLegacyFields()"
          />
        </div>

        <div class="tl-field">
          <label class="tl-label">API 密钥 (Key)</label>
          <div class="tl-input-group">
            <input
              v-model="store.activeCustomPreset.api_key"
              :type="showApiKey ? 'text' : 'password'"
              class="tl-input"
              placeholder="sk-..."
              @input="store.syncActivePresetToLegacyFields()"
            />
            <button
              type="button"
              class="tl-btn tl-btn-ghost tl-btn-sm"
              @click="showApiKey = !showApiKey"
            >
              {{ showApiKey ? '隐藏' : '显示' }}
            </button>
          </div>
        </div>

        <div class="tl-field">
          <label class="tl-label">
            模型名称（可拉取列表选择或直接手填，共 {{ store.activeCustomPreset.model_list.length }} 个可选）
          </label>
          <div class="tl-input-group">
            <select
              v-if="store.activeCustomPreset.model_list.length > 0"
              v-model="store.activeCustomPreset.model"
              class="tl-select"
              @change="store.syncActivePresetToLegacyFields()"
            >
              <option v-for="m in store.activeCustomPreset.model_list" :key="m" :value="m">{{ m }}</option>
            </select>
            <button
              type="button"
              class="tl-btn tl-btn-secondary tl-btn-sm"
              :disabled="isFetchingModels"
              @click="fetchModels"
            >
              <FlatIcon name="refresh" />
              <span>{{ isFetchingModels ? '拉取中...' : '拉取列表' }}</span>
            </button>
            <button
              type="button"
              class="tl-btn tl-btn-primary tl-btn-sm"
              :disabled="isTestingApi"
              @click="handleTestCurrentApi"
            >
              <FlatIcon name="bolt" />
              <span>{{ isTestingApi ? '测试中...' : '测试 API' }}</span>
            </button>
          </div>
          <input
            v-model="store.activeCustomPreset.model"
            type="text"
            class="tl-input tl-model-manual-input"
            placeholder="也可在此直接手动输入模型名，如 deepseek-chat / gpt-4o-mini"
            @input="onManualModelInput"
          />
        </div>
      </div>

      <!-- API 测试结果展示条（仅自定义副 API 显示） -->
      <div
        v-if="store.settings.api_mode === 'custom_api' && apiTestResult"
        class="tl-api-test-banner"
        :class="apiTestResult.ok ? 'is-success' : 'is-error'"
      >
        <div class="tl-test-banner-head">
          <strong>
            {{ apiTestResult.ok ? '✓ 接口测试成功' : '✕ 接口测试失败' }}
          </strong>
          <span class="tl-test-meta">
            {{ apiTestResult.channelLabel }}
            <template v-if="apiTestResult.latencyMs > 0"> · {{ apiTestResult.latencyMs }}ms</template>
          </span>
        </div>
        <div class="tl-test-banner-body">
          {{ apiTestResult.ok ? `AI 响应：${apiTestResult.reply}` : `原因：${apiTestResult.error}` }}
        </div>
      </div>
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

      <div class="tl-setting-row tl-word-limit-row">
        <span class="tl-row-label">总结字数范围</span>
        <div class="tl-word-limit-controls">
          <div class="tl-word-quick-pills">
            <button
              v-for="range in wordRangePresets"
              :key="range"
              type="button"
              class="tl-word-pill"
              :class="{ active: store.settings.summary_word_limit === range }"
              @click="store.settings.summary_word_limit = range"
            >
              {{ range }}
            </button>
          </div>
          <input
            v-model="store.settings.summary_word_limit"
            type="text"
            class="tl-input tl-input-compact"
            placeholder="300-800"
          />
        </div>
      </div>

      <div class="tl-setting-row tl-word-limit-row">
        <span class="tl-row-label">单次总结最大字数（超出自动分批提炼并合并）</span>
        <div class="tl-word-limit-controls">
          <div class="tl-word-quick-pills">
            <button
              v-for="limit in chunkLimitPresets"
              :key="limit"
              type="button"
              class="tl-word-pill"
              :class="{ active: Number(store.settings.max_chunk_chars) === limit }"
              @click="store.settings.max_chunk_chars = limit"
            >
              {{ limit }}
            </button>
          </div>
          <input
            v-model.number="store.settings.max_chunk_chars"
            type="number"
            min="1000"
            step="1000"
            class="tl-input tl-input-compact"
            placeholder="32000"
          />
        </div>
      </div>

      <div class="tl-field">
        <label class="tl-label">标签过滤与正文提取（默认过滤 &lt;think&gt;、&lt;thinking&gt; 思维链）</label>
        <div class="tl-seg-group tl-seg-triple">
          <button
            type="button"
            class="tl-seg-btn"
            :class="{ active: store.settings.tag_filter_mode === 'strip' }"
            @click="store.settings.tag_filter_mode = 'strip'"
          >
            剔除指定标签
          </button>
          <button
            type="button"
            class="tl-seg-btn"
            :class="{ active: store.settings.tag_filter_mode === 'extract' }"
            @click="store.settings.tag_filter_mode = 'extract'"
          >
            仅提取标签内正文
          </button>
          <button
            type="button"
            class="tl-seg-btn"
            :class="{ active: store.settings.tag_filter_mode === 'off' }"
            @click="store.settings.tag_filter_mode = 'off'"
          >
            关闭标签过滤
          </button>
        </div>

        <div v-if="store.settings.tag_filter_mode !== 'off'" class="tl-input-group" style="margin-top: 8px">
          <input
            v-model="store.settings.custom_filter_tags"
            type="text"
            class="tl-input"
            :placeholder="
              store.settings.tag_filter_mode === 'extract'
                ? '输入要提取的正文标签名，多个用逗号分隔，例如：content, 正文, story'
                : '输入要剔除的标签名，多个用逗号分隔，例如：think, thinking'
            "
          />
          <button
            type="button"
            class="tl-btn tl-btn-ghost tl-btn-sm"
            @click="store.settings.custom_filter_tags = 'think, thinking'"
          >
            恢复默认标签
          </button>
        </div>
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
import {
  fetchOpenAiModels,
  normalizeOpenAiBaseUrl,
  testCustomApiConnection,
  type ApiTestResult,
} from '../plugins';
import { useTimeLoopStore } from '../store';
import type { ApiMode, ThemeColor } from '../types';
import FlatIcon from './FlatIcon.vue';

const store = useTimeLoopStore();

const showPromptEditor = ref(false);
const showApiKey = ref(false);
const isFetchingModels = ref(false);
const isTestingApi = ref(false);
const apiTestResult = ref<ApiTestResult | null>(null);
const confirmResetArchive = ref(false);
const confirmDeletePreset = ref(false);

let resetArchiveTimer: ReturnType<typeof setTimeout> | null = null;
let deletePresetTimer: ReturnType<typeof setTimeout> | null = null;

const wordRangePresets = ['300-500', '300-800', '500-800', '600-1000'];
const chunkLimitPresets = [16000, 32000, 64000];

const themeOptions: Array<{ id: ThemeColor; label: string; pillClass: string }> = [
  { id: 'amber', label: '琥珀', pillClass: 'pill-amber' },
  { id: 'cyan', label: '青蓝', pillClass: 'pill-cyan' },
  { id: 'rose', label: '绯红', pillClass: 'pill-rose' },
  { id: 'emerald', label: '翠绿', pillClass: 'pill-emerald' },
];

const shortChatId = computed(() => {
  const id = store.currentChatId || '未绑定';
  return id.length > 22 ? `${id.slice(0, 10)}...${id.slice(-8)}` : id;
});

function handleSelectApiMode(mode: ApiMode) {
  store.setApiMode(mode);
  apiTestResult.value = null;
}

function handleSetStreamMode(stream: boolean) {
  store.activeCustomPreset.stream = stream;
  store.settings.stream = stream;
  store.syncActivePresetToLegacyFields();
}

function handleSwitchCustomPreset(id: string) {
  confirmDeletePreset.value = false;
  apiTestResult.value = null;
  store.selectCustomApiPreset(id);
}

function handleAddCustomPreset() {
  confirmDeletePreset.value = false;
  apiTestResult.value = null;
  const created = store.addCustomApiPreset();
  toastr.success(`已新增「${created.name}」`);
}

function handleDuplicateCustomPreset() {
  confirmDeletePreset.value = false;
  apiTestResult.value = null;
  const dup = store.duplicateCustomApiPreset(store.activeCustomPreset.id);
  if (dup) {
    toastr.success(`已复制「${dup.name}」`);
  }
}

function handleDeleteCustomPreset() {
  if (!confirmDeletePreset.value) {
    confirmDeletePreset.value = true;
    if (deletePresetTimer) clearTimeout(deletePresetTimer);
    deletePresetTimer = setTimeout(() => {
      confirmDeletePreset.value = false;
    }, 2500);
    return;
  }
  confirmDeletePreset.value = false;
  const removedName = store.activeCustomPreset.name || '未命名 API';
  const isSinglePreset = store.settings.custom_api_presets.length <= 1;
  store.removeCustomApiPreset(store.activeCustomPreset.id);
  apiTestResult.value = null;
  toastr.info(isSinglePreset ? `已删除并重置「${removedName}」为默认配置` : `已删除配置「${removedName}」`);
}

function onManualModelInput() {
  const cur = store.activeCustomPreset;
  const trimmed = cur.model.trim();
  if (trimmed && !cur.model_list.includes(trimmed)) {
    cur.model_list = [trimmed, ...cur.model_list];
  }
  store.syncActivePresetToLegacyFields();
}

function handleResetPrompts() {
  store.resetSummaryPrompts();
  toastr.success('已恢复默认提示词（300-800字）');
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
  const cur = store.activeCustomPreset;
  const url = normalizeOpenAiBaseUrl(cur.api_url);
  const key = cur.api_key.trim();
  if (!url) {
    toastr.warning('请先填写 API 地址');
    return;
  }
  cur.api_url = url;
  store.syncActivePresetToLegacyFields();
  isFetchingModels.value = true;
  try {
    const models = await fetchOpenAiModels(url, key);
    if (!models.length) {
      toastr.warning('接口返回列表为空，请手动输入模型名称');
      return;
    }
    cur.model_list = models;
    if (!models.includes(cur.model)) {
      cur.model = models[0];
    }
    store.syncActivePresetToLegacyFields();
    toastr.success(`已为「${cur.name}」获取 ${models.length} 个模型`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : '拉取失败';
    toastr.error(`拉取模型列表失败（${msg}），你也可以直接在下方手动输入模型名`);
  } finally {
    isFetchingModels.value = false;
  }
});

const handleTestCurrentApi = errorCatched(async () => {
  if (store.settings.api_mode !== 'custom_api') return;
  isTestingApi.value = true;
  apiTestResult.value = null;

  try {
    const cur = store.activeCustomPreset;
    cur.api_url = normalizeOpenAiBaseUrl(cur.api_url);
    store.syncActivePresetToLegacyFields();
    const res = await testCustomApiConnection({
      apiUrl: cur.api_url,
      apiKey: cur.api_key,
      model: cur.model,
      stream: Boolean(cur.stream),
    });
    apiTestResult.value = res;
    if (res.ok) {
      toastr.success(`「${cur.name}」测试成功 (${res.latencyMs}ms)`);
    } else {
      toastr.error(`「${cur.name}」测试失败：${res.error}`);
    }
  } finally {
    isTestingApi.value = false;
  }
});

onUnmounted(() => {
  if (resetArchiveTimer) clearTimeout(resetArchiveTimer);
  if (deletePresetTimer) clearTimeout(deletePresetTimer);
});
</script>

