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
  type TagFilterMode,
} from './types';

export interface TagFilterOptions {
  mode: TagFilterMode;
  tagsInput: string;
}

/**
 * 解析用户输入的标签列表（支持逗号、中文逗号、分号、空格分隔，带不带 <> 均可）
 */
export function parseTagNames(tagsInput: string): string[] {
  if (!tagsInput || !tagsInput.trim()) return [];
  const parts = tagsInput
    .split(/[,，;；\s\n]+/)
    .map(raw => raw.trim().replace(/^<+\/?|\/?>+$/g, '').trim())
    .filter(Boolean);
  return Array.from(new Set(parts));
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 按标签过滤规则处理文本：
 * - strip: 移除指定标签及其内容（默认清除 <think>、<thinking>）
 * - extract: 仅保留/提取指定标签内部内容（若某条消息未出现该标签则保留原文，但仍清除默认思维链）
 * - off: 不启用自定义标签过滤
 */
export function applyTagFilter(text: string, options?: TagFilterOptions): string {
  if (!text) return '';
  const mode = options?.mode ?? 'strip';
  if (mode === 'off') return text;

  const tagNames = parseTagNames(options?.tagsInput ?? 'think, thinking');
  if (tagNames.length === 0) return text;

  if (mode === 'strip') {
    let output = text;
    for (const tag of tagNames) {
      const safeTag = escapeRegExp(tag);
      const pairedRegex = new RegExp(`<${safeTag}(?:\\s[^>]*)?>[\\s\\S]*?<\\/${safeTag}>`, 'gi');
      output = output.replace(pairedRegex, '');
      const unclosedRegex = new RegExp(`<${safeTag}(?:\\s[^>]*)?>[\\s\\S]*$`, 'gi');
      output = output.replace(unclosedRegex, '');
    }
    return output;
  }

  if (mode === 'extract') {
    const extracted: string[] = [];
    for (const tag of tagNames) {
      const safeTag = escapeRegExp(tag);
      const pairedRegex = new RegExp(`<${safeTag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${safeTag}>`, 'gi');
      let match: RegExpExecArray | null = pairedRegex.exec(text);
      while (match !== null) {
        const inner = (match[1] ?? '').trim();
        if (inner) extracted.push(inner);
        match = pairedRegex.exec(text);
      }
    }
    if (extracted.length > 0) {
      return extracted.join('\n\n');
    }
    return text.replace(/<(think|thinking|thought)(?:\s[^>]*)?>[\s\S]*?<\/\1>/gi, '');
  }

  return text;
}

export function cleanRawMessageText(text: string, tagOptions?: TagFilterOptions): string {
  if (!text) return '';
  const effectiveTagOptions: TagFilterOptions = tagOptions ?? {
    mode: 'strip',
    tagsInput: 'think, thinking',
  };
  const afterTagFilter = applyTagFilter(text, effectiveTagOptions);

  return afterTagFilter
    .replace(/<(think|thinking|thought)(?:\s[^>]*)?>[\s\S]*?<\/\1>/gi, '')
    .replace(/<tableEdit>[\s\S]*?<\/tableEdit>/gi, '')
    .replace(/<status_block>[\s\S]*?<\/status_block>/gi, '')
    .replace(/```(?:horae|bbs|json|yaml|xml|status)[\s\S]*?```/gi, '')
    .trim();
}

export function cleanSummaryOutputText(text: string, tagOptions?: TagFilterOptions): string {
  if (!text) return '';
  let output = text.replace(/<(think|thinking|thought)(?:\s[^>]*)?>[\s\S]*?<\/\1>/gi, '');
  if (tagOptions && tagOptions.mode === 'strip') {
    output = applyTagFilter(output, tagOptions);
  }
  return output.trim();
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
  tagFilterMode?: TagFilterMode;
  customFilterTags?: string;
}

export interface BuiltSummaryPrompts {
  systemPrompt: string;
  userPrompt: string;
  sourceDescription: string;
  timelineBlocks: string[];
  timelineDataText: string;
  pluginDeltaText: string;
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

  const tagOptions: TagFilterOptions = {
    mode: options.tagFilterMode ?? 'strip',
    tagsInput: options.customFilterTags ?? 'think, thinking',
  };

  for (const m of messages) {
    const floorId = m.message_id;
    const roleLabel = m.role === 'user' ? userName : m.role === 'assistant' ? charName : m.name || '系统旁白';
    const header = `【第 ${floorId} 层 | ${roleLabel}】`;

    const rawBody = cleanRawMessageText(m.message, tagOptions);
    const pluginNotes: string[] = [];
    let cleanBodyFromPlugin = '';

    if (sourceMode !== 'raw_floors') {
      if (baibai?.getFloor) {
        try {
          const bFloor = baibai.getFloor(floorId);
          if (bFloor) {
            if (typeof bFloor.body === 'string' && bFloor.body.trim()) {
              cleanBodyFromPlugin = cleanRawMessageText(bFloor.body, tagOptions);
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
        timelineDataText = `【记忆表格最近剧情上下文】：\n${cleanRawMessageText(storyCtx, tagOptions)}`;
      }
    } catch {
      // ignore
    }
  }

  if (!timelineDataText.trim() && fallbackToRaw) {
    timelineDataText = messages
      .map(m => {
        const roleLabel = m.role === 'user' ? userName : m.role === 'assistant' ? charName : '系统旁白';
        return `【第 ${m.message_id} 层 | ${roleLabel}】\n${cleanRawMessageText(m.message, tagOptions)}`;
      })
      .join('\n\n');
  }

  const pluginDeltaText = deltaSections.join('\n\n');

  const replaceVars = (tpl: string, customTimelineText?: string) =>
    tpl
      .replace(/\{\{char\}\}/g, () => charName)
      .replace(/\{\{user\}\}/g, () => userName)
      .replace(/\{\{anchor_floor\}\}/g, () => String(slot.floor))
      .replace(/\{\{from_floor\}\}/g, () => String(fromFloor))
      .replace(/\{\{to_floor\}\}/g, () => String(toFloor))
      .replace(/\{\{anchor_preview\}\}/g, () => slot.preview || '（无锚点预览）')
      .replace(/\{\{source_label\}\}/g, () => sourceDescription)
      .replace(/\{\{word_limit\}\}/g, () => wordLimit || '300-800')
      .replace(/\{\{timeline_data\}\}/g, () => (customTimelineText ?? timelineDataText) || '（无楼层正文记录）')
      .replace(/\{\{plugin_delta\}\}/g, () => pluginDeltaText);

  const systemPrompt = replaceVars((systemPromptTemplate || DEFAULT_SUMMARY_SYSTEM_PROMPT).trim());
  const userPrompt = replaceVars((userPromptTemplate || DEFAULT_SUMMARY_USER_PROMPT).trim());

  return {
    systemPrompt,
    userPrompt,
    sourceDescription,
    timelineBlocks,
    timelineDataText,
    pluginDeltaText,
  };
}

/**
 * 将超长文本按 maxChars 切分为多个批次（优先按楼层块边界切分，避免截断同一楼层）
 */
export function splitTimelineIntoChunks(
  timelineBlocks: string[],
  fallbackText: string,
  maxChars = 32000,
): string[] {
  const safeLimit = Math.max(1000, Math.floor(maxChars || 32000));
  const blocks = timelineBlocks.length > 0 ? timelineBlocks : fallbackText.split(/\n{2,}/).filter(Boolean);
  if (blocks.length === 0) return [];

  const fullText = blocks.join('\n\n').trim();
  if (fullText.length <= safeLimit) {
    return [fullText];
  }

  const chunks: string[] = [];
  let current = '';

  for (const block of blocks) {
    if (!block) continue;
    if (block.length > safeLimit) {
      if (current.trim()) {
        chunks.push(current.trim());
        current = '';
      }
      for (let i = 0; i < block.length; i += safeLimit) {
        chunks.push(block.slice(i, i + safeLimit));
      }
      continue;
    }

    const candidate = current ? `${current}\n\n${block}` : block;
    if (candidate.length > safeLimit && current.trim()) {
      chunks.push(current.trim());
      current = block;
    } else {
      current = candidate;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}

/**
 * 构建分批提炼（Map 阶段）提示词
 */
export function buildChunkMapPrompt(params: {
  baseSystemPrompt: string;
  fromFloor: number;
  toFloor: number;
  chunkIndex: number;
  totalChunks: number;
  chunkText: string;
}): { systemPrompt: string; userPrompt: string } {
  const userPrompt = `当前回溯区间（第 ${params.fromFloor} 层至第 ${params.toFloor} 层）内容较长，正在进行分段提炼（第 ${params.chunkIndex} / ${params.totalChunks} 段）。
请客观、准确地提炼本段记录中的核心剧情事件、关键情报与因果线索、重要角色态度与状态变化。

输出要求：
1. 条理清晰，字数控制在 300-600 字左右；
2. 严禁编造原文中不存在的剧情，直接输出提炼正文，不要带思考过程。

【本段记录（第 ${params.chunkIndex}/${params.totalChunks} 段）】
${params.chunkText}`;

  return {
    systemPrompt: params.baseSystemPrompt,
    userPrompt,
  };
}

/**
 * 构建分批汇总合并（Reduce 阶段）提示词
 */
export function buildChunkReducePrompt(params: {
  options: BuildSummaryPromptsOptions;
  built: BuiltSummaryPrompts;
  partialSummaries: string[];
}): { systemPrompt: string; userPrompt: string } {
  const { options, built, partialSummaries } = params;
  const fromFloor = options.slot.floor + 1;
  const toFloor = options.currentFloor;

  const mergedTimeline = partialSummaries
    .map((item, idx) => `【第 ${idx + 1}/${partialSummaries.length} 阶段提炼要点】\n${item.trim()}`)
    .join('\n\n');

  const replaceVars = (tpl: string) =>
    tpl
      .replace(/\{\{char\}\}/g, () => options.charName)
      .replace(/\{\{user\}\}/g, () => options.userName)
      .replace(/\{\{anchor_floor\}\}/g, () => String(options.slot.floor))
      .replace(/\{\{from_floor\}\}/g, () => String(fromFloor))
      .replace(/\{\{to_floor\}\}/g, () => String(toFloor))
      .replace(/\{\{anchor_preview\}\}/g, () => options.slot.preview || '（无锚点预览）')
      .replace(/\{\{source_label\}\}/g, () => `${built.sourceDescription} · 分 ${partialSummaries.length} 批汇总`)
      .replace(/\{\{word_limit\}\}/g, () => options.wordLimit || '300-800')
      .replace(/\{\{timeline_data\}\}/g, () => mergedTimeline)
      .replace(/\{\{plugin_delta\}\}/g, () => built.pluginDeltaText);

  return {
    systemPrompt: built.systemPrompt,
    userPrompt: replaceVars((options.userPromptTemplate || DEFAULT_SUMMARY_USER_PROMPT).trim()),
  };
}
