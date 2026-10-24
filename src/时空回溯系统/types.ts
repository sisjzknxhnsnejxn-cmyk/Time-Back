export const ThemeColorSchema = z.enum(['amber', 'cyan', 'rose', 'emerald']).default('amber');
export const ColorModeSchema = z.enum(['dark', 'light']).default('dark');

/**
 * 回溯总结的数据源模式：
 * - hybrid: 混合读取（自动结合已安装的记忆插件数据 + 聊天原文，推荐）
 * - memory_plugin: 优先读取记忆插件（未覆盖楼层可自动回退原文）
 * - raw_floors: 只读聊天原文
 */
export const SummarySourceModeSchema = z.enum(['hybrid', 'memory_plugin', 'raw_floors']).default('hybrid');

/**
 * 总结所用 AI 接口模式：
 * - main_api: 使用酒馆当前主聊天 AI
 * - custom_api: 使用自定义 OpenAI 兼容 API（支持添加多个配置）
 */
export const ApiModeSchema = z.enum(['main_api', 'custom_api']).default('main_api');

/**
 * 标签过滤模式：
 * - strip: 清除指定标签及其内容（默认清除 <think>, <thinking>）
 * - extract: 仅提取/保留指定标签内部的内容
 * - off: 不启用自定义标签过滤
 */
export const TagFilterModeSchema = z.enum(['strip', 'extract', 'off']).default('strip');

export type ThemeColor = z.infer<typeof ThemeColorSchema>;
export type ColorMode = z.infer<typeof ColorModeSchema>;
export type SummarySourceMode = z.infer<typeof SummarySourceModeSchema>;
export type ApiMode = z.infer<typeof ApiModeSchema>;
export type TagFilterMode = z.infer<typeof TagFilterModeSchema>;

export const DEFAULT_SUMMARY_SYSTEM_PROMPT = `你是「时空回溯系统」的跨时间线客观记忆提炼官。
当前正在执行时间回溯：故事时间将从【回溯触发楼层】倒流回【存档锚点楼层】。这段即将被抹除的时间线（存档点之后至回溯前发生的一切）需要被浓缩为客观、详实的记忆记录，供保留记忆的角色在回溯后参考。

请遵守以下准则：
1. 【客观纪实】：只记录该时间段内实际发生的事件、行动、关键对话披露的事实、地点转移、物品/状态变化与最终结果；不要脑补未明说的心理活动，不写浮夸的文学性修饰。
2. 【先知情报优先】：重点提炼具有跨时间线预警价值的信息——例如：某决定引发的连锁后果、暴露的秘密或陷阱、人物真实立场与态度变化、关键物品下落，以及触发回溯的直接原因。
3. 【时序清晰、细节完整】：按发生先后顺序梳理，合并无意义寒暄，保留核心剧情脉络与关键细节。`;

export const DEFAULT_SUMMARY_USER_PROMPT = `请根据以下提供的【第 {{from_floor}} 层 至 第 {{to_floor}} 层】回溯区间记录（存档锚点位于第 {{anchor_floor}} 层），总结这段被回溯抹除的时间线中发生了什么。

【主要角色】：{{char}}、{{user}}
【存档锚点起点（第 {{anchor_floor}} 层）】：
{{anchor_preview}}

【回溯区间记录（{{source_label}}）】：
{{timeline_data}}

{{plugin_delta}}

【输出要求】：
1. 字数控制在 {{word_limit}} 字之间，内容详实、逻辑清晰，完整保留关键事件经过与重要情报细节，便于阅读和修改。
2. 直接输出总结正文（不要包含“好的”、“以下是总结”等前缀），按以下三个部分清晰分段：
   - **时间与轨迹**：期间经历的时间变化与地点转换；
   - **关键事件与行动**：按顺序发生的核心事件、重要对话细节、关键抉择与直接结果；
   - **重要情报与结局**：获知的秘密/人物立场/状态变化，以及回溯前的最终局面。`;

export const CustomApiPresetSchema = z.object({
  id: z.string(),
  name: z.string().default('自定义配置 1'),
  api_url: z.string().default('https://api.openai.com/v1'),
  api_key: z.string().default(''),
  model: z.string().default('gpt-4o-mini'),
  model_list: z.array(z.string()).default(['gpt-4o-mini']),
  stream: z.boolean().default(false),
});

export type CustomApiPreset = z.infer<typeof CustomApiPresetSchema>;

export const ApiSettingsSchema = z
  .object({
    api_mode: ApiModeSchema,
    use_main_api: z.boolean().default(true),
    stream: z.boolean().default(false),
    api_url: z.string().default('https://api.openai.com/v1'),
    api_key: z.string().default(''),
    model: z.string().default('gpt-4o-mini'),
    model_list: z.array(z.string()).default(['gpt-4o-mini']),
    custom_api_presets: z.array(CustomApiPresetSchema).default([]),
    active_custom_api_id: z.string().default(''),
    summary_source_mode: SummarySourceModeSchema,
    fallback_to_raw: z.boolean().default(true),
    max_chunk_chars: z.number().int().min(1000).default(32000),
    tag_filter_mode: TagFilterModeSchema,
    custom_filter_tags: z.string().default('think, thinking'),
    summary_word_limit: z.string().default('300-800'),
    summary_system_prompt: z.string().default(DEFAULT_SUMMARY_SYSTEM_PROMPT),
    summary_user_prompt: z.string().default(DEFAULT_SUMMARY_USER_PROMPT),
    color_mode: ColorModeSchema,
    theme_color: ThemeColorSchema,
  })
  .prefault({});

export const SlotItemSchema = z.object({
  floor: z.number().int().nonnegative(),
  preview: z.string(),
  timestamp: z.string(),
  database_snapshot: z.string().nullable().default(null),
  mvu_snapshot: z.record(z.string(), z.unknown()).nullable().default(null),
});

export const SLOT_KEYS = ['slot_1', 'slot_2', 'slot_3', 'slot_4', 'slot_5'] as const;
export type SlotKey = (typeof SLOT_KEYS)[number];

export const LoopMemoryItemSchema = z.object({
  id: z.string(),
  range_label: z.string(),
  content: z.string(),
  timestamp: z.string(),
  anchor_key: z.enum(SLOT_KEYS).optional(),
  anchor_floor: z.number().int().nonnegative().optional(),
});

export type SlotItem = z.infer<typeof SlotItemSchema>;
export type LoopMemoryItem = z.infer<typeof LoopMemoryItemSchema>;
export type ApiSettings = z.infer<typeof ApiSettingsSchema>;

export const SlotsSchema = z
  .object({
    slot_1: SlotItemSchema.nullable().default(null),
    slot_2: SlotItemSchema.nullable().default(null),
    slot_3: SlotItemSchema.nullable().default(null),
    slot_4: SlotItemSchema.nullable().default(null),
    slot_5: SlotItemSchema.nullable().default(null),
  })
  .prefault({});

export const ChatArchiveDataSchema = z
  .object({
    chat_id: z.string().default(''),
    updated_at: z.string().default(''),
    timeloop_slots: SlotsSchema,
    timeloop_memories: z.array(LoopMemoryItemSchema).default([]),
  })
  .prefault({});

export type ChatArchiveData = z.infer<typeof ChatArchiveDataSchema>;
