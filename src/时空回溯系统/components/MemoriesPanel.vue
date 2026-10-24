<template>
  <div class="tl-panel">
    <div class="tl-panel-toolbar">
      <div class="tl-toolbar-stat">
        <span>共 {{ memories.length }} 条保留记忆</span>
      </div>
      <div class="tl-toolbar-actions">
        <button
          type="button"
          class="tl-btn tl-btn-secondary tl-btn-sm"
          @click="toggleCreateForm"
        >
          <FlatIcon :name="isCreating ? 'close' : 'plus'" />
          <span>{{ isCreating ? '取消新增' : '新增记忆' }}</span>
        </button>
        <button
          v-if="memories.length > 0"
          type="button"
          class="tl-btn tl-btn-danger-ghost tl-btn-sm"
          @click="handleClearAllClick"
        >
          <FlatIcon name="trash" />
          <span>{{ confirmClearAll ? '再点一次清空' : '清空全部' }}</span>
        </button>
      </div>
    </div>

    <div v-if="isCreating" class="tl-memory-editor-card">
      <div class="tl-field">
        <label class="tl-label">记忆标题 / 楼层范围</label>
        <input
          v-model="newRangeLabel"
          type="text"
          class="tl-input"
          placeholder="例如：第一轮回（第 5 至 18 层）"
        />
      </div>
      <div class="tl-field">
        <label class="tl-label">记忆内容</label>
        <textarea
          v-model="newContent"
          rows="5"
          class="tl-textarea"
          placeholder="输入希望主角与核心角色保留的记忆内容..."
        />
      </div>
      <div class="tl-editor-actions">
        <button type="button" class="tl-btn tl-btn-secondary" @click="isCreating = false">取消</button>
        <button type="button" class="tl-btn tl-btn-primary" @click="saveNewMemory">
          <FlatIcon name="check" />
          <span>保存新增</span>
        </button>
      </div>
    </div>

    <div v-if="memories.length === 0 && !isCreating" class="tl-empty-box">
      <FlatIcon name="memory" class="tl-empty-icon" />
      <p>当前还没有回溯记忆</p>
      <span>执行回溯后会自动在此生成总结，也可以点击右上角手动新增</span>
    </div>

    <div v-else class="tl-memory-list">
      <div
        v-for="(item, idx) in reversedMemories"
        :key="item.id"
        class="tl-memory-card"
        :class="{
          'is-latest': item.id === latestMemoryId,
          'is-editing': editingId === item.id,
          'is-just-saved': justSavedId === item.id,
        }"
      >
        <div class="tl-memory-head">
          <div class="tl-memory-title-wrap">
            <span class="tl-memory-index">#{{ memories.length - idx }}</span>
            <strong class="tl-memory-range">{{ item.range_label }}</strong>
            <span v-if="item.id === latestMemoryId" class="tl-latest-pill">刚生成</span>
          </div>
          <span class="tl-memory-time">{{ item.timestamp }}</span>
        </div>

        <div v-if="editingId === item.id" class="tl-memory-edit-body">
          <div class="tl-field">
            <label class="tl-label">标题 / 楼层标记</label>
            <input v-model="editRangeLabel" type="text" class="tl-input" />
          </div>
          <div class="tl-field">
            <label class="tl-label">总结内容（可直接修改）</label>
            <textarea v-model="editContent" rows="7" class="tl-textarea" />
          </div>
          <div class="tl-editor-actions">
            <button type="button" class="tl-btn tl-btn-secondary" @click="cancelEdit">取消</button>
            <button type="button" class="tl-btn tl-btn-primary" @click="saveEdit(item.id)">
              <FlatIcon name="check" />
              <span>保存修改</span>
            </button>
          </div>
        </div>

        <template v-else>
          <div class="tl-memory-content">{{ item.content }}</div>

          <div class="tl-memory-foot">
            <button
              type="button"
              class="tl-btn tl-btn-secondary tl-btn-sm"
              @click="startEdit(item)"
            >
              <FlatIcon :name="justSavedId === item.id ? 'check' : 'edit'" />
              <span>{{ justSavedId === item.id ? '已保存修改' : '编辑内容' }}</span>
            </button>

            <button
              type="button"
              class="tl-btn tl-btn-ghost tl-btn-sm"
              @click="copyMemory(item)"
            >
              <FlatIcon :name="copiedId === item.id ? 'check' : 'copy'" />
              <span>{{ copiedId === item.id ? '已复制' : '复制' }}</span>
            </button>

            <button
              type="button"
              class="tl-btn tl-btn-danger-ghost tl-btn-sm"
              @click="handleDeleteClick(item.id)"
            >
              <FlatIcon name="trash" />
              <span>{{ confirmDeleteId === item.id ? '确认删除？' : '删除' }}</span>
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';
import type { LoopMemoryItem } from '../types';
import FlatIcon from './FlatIcon.vue';

const props = defineProps<{
  memories: LoopMemoryItem[];
  latestMemoryId: string | null;
}>();

const emit = defineEmits<{
  (e: 'update', id: string, payload: { range_label: string; content: string }): void;
  (e: 'add', payload: { range_label: string; content: string }): void;
  (e: 'delete', id: string): void;
  (e: 'clear-all'): void;
}>();

const reversedMemories = computed(() => [...props.memories].reverse());

const editingId = ref<string | null>(null);
const editRangeLabel = ref('');
const editContent = ref('');
const justSavedId = ref<string | null>(null);
const copiedId = ref<string | null>(null);
const confirmDeleteId = ref<string | null>(null);
const confirmClearAll = ref(false);

const isCreating = ref(false);
const newRangeLabel = ref('');
const newContent = ref('');

function toggleCreateForm() {
  isCreating.value = !isCreating.value;
  if (isCreating.value) {
    newRangeLabel.value = `手动记录 #${props.memories.length + 1}`;
    newContent.value = '';
    editingId.value = null;
  }
}

function saveNewMemory() {
  if (!newContent.value.trim()) {
    toastr.warning('请填写记忆内容');
    return;
  }
  emit('add', {
    range_label: newRangeLabel.value.trim() || `手动记录 #${props.memories.length + 1}`,
    content: newContent.value.trim(),
  });
  isCreating.value = false;
  newRangeLabel.value = '';
  newContent.value = '';
  toastr.success('已添加记忆并同步至当前聊天');
}

function startEdit(item: LoopMemoryItem) {
  isCreating.value = false;
  editingId.value = item.id;
  editRangeLabel.value = item.range_label;
  editContent.value = item.content;
}

function cancelEdit() {
  editingId.value = null;
  editRangeLabel.value = '';
  editContent.value = '';
}

let savedTimer: ReturnType<typeof setTimeout> | null = null;
let copiedTimer: ReturnType<typeof setTimeout> | null = null;
let deleteConfirmTimer: ReturnType<typeof setTimeout> | null = null;
let clearAllConfirmTimer: ReturnType<typeof setTimeout> | null = null;

function saveEdit(id: string) {
  if (!editContent.value.trim()) {
    toastr.warning('记忆内容不能为空');
    return;
  }
  emit('update', id, {
    range_label: editRangeLabel.value.trim() || '回溯记忆',
    content: editContent.value.trim(),
  });
  editingId.value = null;
  justSavedId.value = id;
  if (savedTimer) clearTimeout(savedTimer);
  savedTimer = setTimeout(() => {
    if (justSavedId.value === id) {
      justSavedId.value = null;
    }
  }, 1500);
  toastr.success('记忆已更新并同步');
}

function fallbackCopyText(text: string): boolean {
  try {
    const doc = window.parent?.document ?? document;
    const textarea = doc.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.style.left = '-9999px';
    textarea.style.opacity = '0';
    doc.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    const ok = doc.execCommand('copy');
    doc.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

async function copyMemory(item: LoopMemoryItem) {
  let copied = false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(item.content);
      copied = true;
    }
  } catch {
    copied = false;
  }

  if (!copied) {
    copied = fallbackCopyText(item.content);
  }

  if (copied) {
    copiedId.value = item.id;
    if (copiedTimer) clearTimeout(copiedTimer);
    copiedTimer = setTimeout(() => {
      if (copiedId.value === item.id) {
        copiedId.value = null;
      }
    }, 1200);
  } else {
    toastr.info('复制失败，请长按或选中文本手动复制');
  }
}

function handleDeleteClick(id: string) {
  if (confirmDeleteId.value !== id) {
    confirmDeleteId.value = id;
    if (deleteConfirmTimer) clearTimeout(deleteConfirmTimer);
    deleteConfirmTimer = setTimeout(() => {
      if (confirmDeleteId.value === id) {
        confirmDeleteId.value = null;
      }
    }, 2500);
    return;
  }
  confirmDeleteId.value = null;
  emit('delete', id);
  toastr.info('已删除该条记忆');
}

function handleClearAllClick() {
  if (!confirmClearAll.value) {
    confirmClearAll.value = true;
    if (clearAllConfirmTimer) clearTimeout(clearAllConfirmTimer);
    clearAllConfirmTimer = setTimeout(() => {
      confirmClearAll.value = false;
    }, 2500);
    return;
  }
  confirmClearAll.value = false;
  emit('clear-all');
}

onUnmounted(() => {
  if (savedTimer) clearTimeout(savedTimer);
  if (copiedTimer) clearTimeout(copiedTimer);
  if (deleteConfirmTimer) clearTimeout(deleteConfirmTimer);
  if (clearAllConfirmTimer) clearTimeout(clearAllConfirmTimer);
});
</script>
