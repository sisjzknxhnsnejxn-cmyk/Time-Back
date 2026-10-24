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
            <span v-if="slots[key]?.database_snapshot" class="tl-meta-tag">含数据库快照</span>
            <span v-if="slots[key]?.baibai_snapshot" class="tl-meta-tag">含柏宝书快照</span>
            <span v-if="slots[key]?.horae_snapshot" class="tl-meta-tag">含Horae快照</span>
            <span v-if="slots[key]?.qqj_snapshot" class="tl-meta-tag">含千千结/千事快照</span>
            <span v-if="slots[key]?.engram_snapshot" class="tl-meta-tag">含Engram快照</span>
            <span v-if="slots[key]?.mvu_snapshot || slots[key]?.mvu_chat_snapshot" class="tl-meta-tag">含MVU快照</span>
          </div>
        </div>
        <div v-else class="tl-slot-empty">
          {{ index === 0 ? '尚未记录锚点，点击下方按钮记录当前楼层（或在 # 输入框指定历史楼层）' : `已解锁第 ${index + 1} 槽位，可记录当前或任意历史楼层锚点` }}
        </div>

        <div class="tl-slot-actions">
          <div
            class="tl-floor-picker"
            :title="
              currentFloor >= 0
                ? `指定要快照的楼层号（0 ~ ${currentFloor}，留空默认记录当前第 ${currentFloor} 层；输入历史楼层如 70 可逆向构建该层快照）`
                : '指定要快照的目标楼层号（留空默认记录当前最新楼层）'
            "
          >
            <span class="tl-floor-prefix">#</span>
            <input
              v-model="customFloorInputs[key]"
              type="number"
              min="0"
              :max="currentFloor >= 0 ? currentFloor : undefined"
              class="tl-floor-input"
              :placeholder="currentFloor >= 0 ? String(currentFloor) : '层'"
              :disabled="isBusy"
              aria-label="指定记录的目标楼层号"
              @keydown.enter.prevent="onSaveClick(key)"
            />
          </div>

          <button
            type="button"
            class="tl-btn tl-btn-secondary"
            :disabled="isBusy"
            @click="onSaveClick(key)"
          >
            <FlatIcon :name="justSavedKey === key ? 'check' : slots[key] ? 'refresh' : 'save'" />
            <span>{{ getSaveButtonLabel(key) }}</span>
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
import { computed, onUnmounted, reactive, ref } from 'vue';
import { SLOT_KEYS, type LoopMemoryItem, type SlotItem, type SlotKey } from '../types';
import FlatIcon from './FlatIcon.vue';

const props = defineProps<{
  slots: Record<SlotKey, SlotItem | null>;
  memories: LoopMemoryItem[];
  currentFloor: number;
  isBusy: boolean;
  busySlotKey: SlotKey | null;
  justSavedKey: SlotKey | null;
}>();

const emit = defineEmits<{
  (e: 'save', key: SlotKey, targetFloor?: number): void;
  (e: 'rewind', key: SlotKey): void;
  (e: 'clear', key: SlotKey): void;
  (e: 'view-memories'): void;
}>();

const confirmClearKey = ref<SlotKey | null>(null);
const customFloorInputs = reactive<Record<SlotKey, string>>({
  slot_1: '',
  slot_2: '',
  slot_3: '',
  slot_4: '',
  slot_5: '',
});
let clearConfirmTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 渐进式显示槽位（最多 5 个槽位）：
 * - 默认显示 锚点 01
 * - 每当当前已解锁槽位存档后（或后续槽位已有数据），自动解锁下一个槽位，直至锚点 05
 */
const visibleSlotKeys = computed<SlotKey[]>(() => {
  let highestOccupiedIndex = -1;
  for (let i = 0; i < SLOT_KEYS.length; i++) {
    if (props.slots[SLOT_KEYS[i]]) {
      highestOccupiedIndex = i;
    }
  }
  const visibleCount = Math.min(SLOT_KEYS.length, Math.max(1, highestOccupiedIndex + 2));
  return SLOT_KEYS.slice(0, visibleCount);
});

function getLinkedMemoryCount(key: SlotKey, floor: number): number {
  return props.memories.filter(
    m => m.anchor_key === key || m.anchor_floor === floor || m.range_label.includes(`第 ${floor} 层`),
  ).length;
}

function getParsedTargetFloor(key: SlotKey): number | undefined {
  const raw = String(customFloorInputs[key] ?? '').trim();
  if (!raw) return undefined;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return Math.floor(parsed);
}

function getSaveButtonLabel(key: SlotKey): string {
  if (props.justSavedKey === key) {
    return '已记录';
  }
  const tf = getParsedTargetFloor(key);
  if (tf !== undefined && (props.currentFloor < 0 || tf !== props.currentFloor)) {
    return props.slots[key] ? `更新第 ${tf} 层` : `记录第 ${tf} 层`;
  }
  return props.slots[key] ? '更新当前层' : '记录当前层';
}

function onSaveClick(key: SlotKey) {
  confirmClearKey.value = null;
  const targetFloor = getParsedTargetFloor(key);
  emit('save', key, targetFloor);
  customFloorInputs[key] = '';
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
