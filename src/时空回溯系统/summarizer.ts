import {
  buildBaiBaiSnapshotDiff,
  buildDatabaseTableDiff,
  buildMvuSnapshotDiff,
  extractDatabaseFloorMeta,
  extractHoraeFloorMeta,
  extractStSummarizeFloorMeta,
  formatStructuredDelta,
  getActivePluginNames,
  getBaiBaiApi,
  getDatabaseApi,
} from './plugins';
import {
  DEFAULT_SUMMARY_SYSTEM_PROMPT,
  DEFAULT_SUMMARY_USER_PROMPT,
  type SlotItem,
  type SummarySourceMode,
} from './types';

export function cleanRawMessageText(text: string): string {
  if (!text) return '';
  return text
    .replace(/<(think|thinking|thought)>[\s\S]*?<\/\1>/gi, '')
    .replace(/<tableEdit>[\s\S]*?<\/tableEdit>/gi, '')
    .replace(/<status_block>[\s\S]*?<\/status_block>/gi, '')
    .replace(/```(?:horae|bbs|json|yaml|xml|status)[\s\S]*?```/gi, '')
    .trim();
}

export interface BuildSummaryPromptsOptions {
  messages: ChatMessage[];
  slot: SlotItem;
  currentFloor: number;
  charName: string;
  userName: string;
  sourceMode: SummarySourceMode;
  fallbackToRaw: boolean;
  wordLimit: string;
  systemPromptTemplate: string;
  userPromptTemplate: string;
}

export interface BuiltSummaryPrompts {
  systemPrompt: string;
  userPrompt: string;
  sourceDescription: string;
}

export function buildSummaryPrompts(options: BuildSummaryPromptsOptions): BuiltSummaryPrompts {
  const {
    messages,
    slot,
    currentFloor,
    charName,
    userName,
    sourceMode,
    fallbackToRaw,
    wordLimit,
    systemPromptTemplate,
    userPromptTemplate,
  } = options;

  const fromFloor = slot.floor + 1;
  const toFloor = currentFloor;

  const baibai = getBaiBaiApi();
  const activePluginNames = getActivePluginNames();
  const pluginLabel = activePluginNames.length > 0 ? activePluginNames.join(' + ') : '无外部插件（使用聊天原文）';

  const modeNameMap: Record<SummarySourceMode, string> = {
    hybrid: `混合读取 (${pluginLabel} + 聊天原文)`,
    memory_plugin: `记忆插件优先 (${pluginLabel})`,
    raw_floors: '仅聊天原文',
  };
  const sourceDescription = modeNameMap[sourceMode] || modeNameMap.hybrid;

  const timelineBlocks: string[] = [];

  for (const m of messages) {
    const floorId = m.message_id;
    const roleLabel = m.role === 'user' ? userName : m.role === 'assistant' ? charName : m.name || '系统旁白';
    const header = `【第 ${floorId} 层 | ${roleLabel}】`;

    const rawBody = cleanRawMessageText(m.message);
    const pluginNotes: string[] = [];
    let cleanBodyFromPlugin = '';

    if (sourceMode !== 'raw_floors') {
      if (baibai?.getFloor) {
        try {
          const bFloor = baibai.getFloor(floorId);
          if (bFloor) {
            if (typeof bFloor.body === 'string' && bFloor.body.trim()) {
              cleanBodyFromPlugin = cleanRawMessageText(bFloor.body);
            }
            const summary = bFloor.memory?.summary?.trim();
            if (summary) {
              pluginNotes.push(`[柏宝书摘要]：${summary}`);
            }
            const deltaText = formatStructuredDelta(bFloor.memory?.delta);
            if (deltaText) {
              pluginNotes.push(`[柏宝书状态变更]：${deltaText}`);
            }
          }
        } catch {
          // ignore
        }
      }

      const dbNote = extractDatabaseFloorMeta(floorId, m);
      if (dbNote) pluginNotes.push(`[${dbNote}]`);

      const horaeNote = extractHoraeFloorMeta(floorId);
      if (horaeNote) pluginNotes.push(`[${horaeNote}]`);

      const stSumNote = extractStSummarizeFloorMeta(floorId, m);
      if (stSumNote) pluginNotes.push(`[${stSumNote}]`);
    }

    const effectiveRawText = cleanBodyFromPlugin || rawBody;

    if (sourceMode === 'raw_floors') {
      if (effectiveRawText) {
        timelineBlocks.push(`${header}\n${effectiveRawText}`);
      }
    } else if (sourceMode === 'memory_plugin') {
      if (pluginNotes.length > 0) {
        timelineBlocks.push(`${header}\n${pluginNotes.join('\n')}`);
      } else if (fallbackToRaw && effectiveRawText) {
        timelineBlocks.push(`${header}\n${effectiveRawText}`);
      }
    } else {
      const segments: string[] = [];
      if (pluginNotes.length > 0) {
        segments.push(pluginNotes.join('\n'));
      }
      if (effectiveRawText) {
        segments.push(`[原文]：${effectiveRawText}`);
      }
      if (segments.length > 0) {
        timelineBlocks.push(`${header}\n${segments.join('\n')}`);
      }
    }
  }


  const deltaSections: string[] = [];
  if (sourceMode !== 'raw_floors') {
    const bbDiff = buildBaiBaiSnapshotDiff(slot.floor, currentFloor);
    if (bbDiff) deltaSections.push(bbDiff);

    const dbDiff = buildDatabaseTableDiff(slot.database_snapshot);
    if (dbDiff) deltaSections.push(dbDiff);

    const mvuDiff = buildMvuSnapshotDiff(slot, currentFloor);
    if (mvuDiff) deltaSections.push(mvuDiff);
  }

  let timelineDataText = timelineBlocks.join('\n\n');
  if (!timelineDataText.trim()) {
    try {
      const storyCtx = getDatabaseApi()?.getStoryContext?.(Math.max(1, toFloor - fromFloor + 1));
      if (storyCtx && storyCtx.trim()) {
        timelineDataText = `【记忆表格最近剧情上下文】：\n${cleanRawMessageText(storyCtx)}`;
      }
    } catch {
      // ignore
    }
  }

  if (!timelineDataText.trim() && fallbackToRaw) {
    timelineDataText = messages
      .map(m => {
        const roleLabel = m.role === 'user' ? userName : m.role === 'assistant' ? charName : '系统旁白';
        return `【第 ${m.message_id} 层 | ${roleLabel}】\n${cleanRawMessageText(m.message)}`;
      })
      .join('\n\n');
  }

  const pluginDeltaText = deltaSections.join('\n\n');

  const replaceVars = (tpl: string) =>
    tpl
      .replace(/\{\{char\}\}/g, () => charName)
      .replace(/\{\{user\}\}/g, () => userName)
      .replace(/\{\{anchor_floor\}\}/g, () => String(slot.floor))
      .replace(/\{\{from_floor\}\}/g, () => String(fromFloor))
      .replace(/\{\{to_floor\}\}/g, () => String(toFloor))
      .replace(/\{\{anchor_preview\}\}/g, () => slot.preview || '（无锚点预览）')
      .replace(/\{\{source_label\}\}/g, () => sourceDescription)
      .replace(/\{\{word_limit\}\}/g, () => wordLimit || '180-320')
      .replace(/\{\{timeline_data\}\}/g, () => timelineDataText || '（无楼层正文记录）')
      .replace(/\{\{plugin_delta\}\}/g, () => pluginDeltaText);

  const systemPrompt = replaceVars((systemPromptTemplate || DEFAULT_SUMMARY_SYSTEM_PROMPT).trim());
  const userPrompt = replaceVars((userPromptTemplate || DEFAULT_SUMMARY_USER_PROMPT).trim());

  return {
    systemPrompt,
    userPrompt,
    sourceDescription,
  };
}
