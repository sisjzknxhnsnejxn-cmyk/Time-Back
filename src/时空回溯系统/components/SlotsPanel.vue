<template>
  <div class="tl-panel">
    <div class="tl-slot-grid">
      <div
        v-for="(key, index) in visibleSlotKeys"
        :key="key"
        class="tl-slot-card"
        :class="{ 'is-occupied': Boolean(slots[key]), 'is-just-saved': justSavedKey === key }"
      >
        <div class="tl-slot-top">
          <div class="tl-slot-name">
            <FlatIcon name="anchor" />
            <span>锚点 0{{ index + 1 }}</span>
          </div>
          <div class="tl-slot-badges">
            <button
              v-if="slots[key] && getLinkedMemoryCount(key, slots[key]!.floor) > 0"
              type="button"
              class="tl-slot-memory-link"
              title="点击查看此锚点关联的回溯记忆"
              @click="$emit('view-memories')"
            >
              <FlatIcon name="memory" />
              <span>已回溯 {{ getLinkedMemoryCount(key, slots[key]!.floor) }} 次</span>
            </button>
            <span class="tl-slot-badge" :class="{ active: Boolean(slots[key]) }">
              {{ slots[key] ? `第 ${slots[key]?.floor} 层` : '待记录新锚点' }}
            </span>
          </div>
        </div>

        <div v-if="slots[key]" class="tl-slot-content">
          <p class="tl-slot-preview">{{ slots[key]?.preview }}</p>
          <div class="tl-slot-meta">
            <span>记录于 {{ slots[key]?.timestamp }}</span>
            <span v-if="slots[key]?.database_snapshot" class="tl-meta-tag">含表格快照</span>
            <span v-if="slots[key]?.mvu_snapshot" class="tl-meta-tag">含变量快照</span>
          </div>
        </div>
        <div v-else class="tl-slot-empty">
          {{ index === 0 ? '尚未记录锚点，点击下方按钮记录当前楼层' : `已解锁第 ${index + 1} 槽位，可记录后续楼层锚点` }}
        </div>

        <div class="tl-slot-actions">
          <button
            type="button"
            class="tl-btn tl-btn-secondary"
            :disabled="isBusy"
            @click="onSaveClick(key)"
          >
            <FlatIcon :name="justSavedKey === key ? 'check' : slots[key] ? 'refresh' : 'save'" />
            <span>{{ justSavedKey === key ? '已记录' : slots[key] ? '更新当前层' : '记录当前层' }}</span>
          </button>

          <button
            v-if="slots[key]"
            type="button"
            class="tl-btn tl-btn-primary"
            :disabled="isBusy"
            @click="$emit('rewind', key)"
          >
            <FlatIcon name="rewind" />
            <span>{{ busySlotKey === key ? '正在总结回溯...' : '回溯到此层' }}</span>
          </button>

          <button
            v-if="slots[key]"
            type="button"
            class="tl-btn"
            :class="confirmClearKey === key ? 'tl-btn-danger-ghost tl-btn-sm' : 'tl-btn-icon-danger'"
            :disabled="isBusy"
            :title="confirmClearKey === key ? '再点一次确认清空锚点' : '清空此锚点'"
            :aria-label="confirmClearKey === key ? '再点一次确认清空锚点' : '清空此锚点'"
            @click="onClearClick(key)"
          >
            <FlatIcon name="trash" />
            <span v-if="confirmClearKey === key">确认清空</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';
import type { LoopMemoryItem, SlotItem, SlotKey } from '../types';
import FlatIcon from './FlatIcon.vue';

const props = defineProps<{
  slots: Record<SlotKey, SlotItem | null>;
  memories: LoopMemoryItem[];
  isBusy: boolean;
  busySlotKey: SlotKey | null;
  justSavedKey: SlotKey | null;
}>();

const emit = defineEmits<{
  (e: 'save', key: SlotKey): void;
  (e: 'rewind', key: SlotKey): void;
  (e: 'clear', key: SlotKey): void;
  (e: 'view-memories'): void;
}>();

const confirmClearKey = ref<SlotKey | null>(null);
let clearConfirmTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 渐进式显示槽位：
 * - 默认只显示 锚点 01
 * - 当 锚点 01 存档后，自动显示 锚点 02
 * - 当 锚点 02 存档后，自动显示 锚点 03
 */
const visibleSlotKeys = computed<SlotKey[]>(() => {
  const list: SlotKey[] = ['slot_1'];
  if (props.slots.slot_1 || props.slots.slot_2 || props.slots.slot_3) {
    list.push('slot_2');
  }
  if ((props.slots.slot_1 && props.slots.slot_2) || props.slots.slot_3) {
    list.push('slot_3');
  }
  return list;
});

function getLinkedMemoryCount(key: SlotKey, floor: number): number {
  return props.memories.filter(
    m => m.anchor_key === key || m.anchor_floor === floor || m.range_label.includes(`第 ${floor} 层`),
  ).length;
}

function onSaveClick(key: SlotKey) {
  confirmClearKey.value = null;
  emit('save', key);
}

function onClearClick(key: SlotKey) {
  if (confirmClearKey.value !== key) {
    confirmClearKey.value = key;
    if (clearConfirmTimer) clearTimeout(clearConfirmTimer);
    clearConfirmTimer = setTimeout(() => {
      if (confirmClearKey.value === key) {
        confirmClearKey.value = null;
      }
    }, 2500);
    return;
  }
  confirmClearKey.value = null;
  emit('clear', key);
}

onUnmounted(() => {
  if (clearConfirmTimer) clearTimeout(clearConfirmTimer);
});
</script>
