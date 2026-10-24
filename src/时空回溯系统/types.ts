export const ThemeColorSchema = z.enum(['amber', 'cyan', 'rose', 'emerald']).default('amber');
export const ColorModeSchema = z.enum(['dark', 'light']).default('dark');

/**
 * 回溯总结的数据源模式：
 * - hybrid: 混合读取（自动结合已安装的记忆插件数据 + 聊天原文，推荐）
 * - memory_plugin: 优先读取记忆插件（未覆盖楼层可自动回退原文）
 * - raw_floors: 只读聊天原文
 */
export const SummarySourceModeSchema = z.enum(['hybrid', 'memory_plugin', 'raw_floors']).default('hybrid');

export type ThemeColor = z.infer<typeof ThemeColorSchema>;
export type ColorMode = z.infer<typeof ColorModeSchema>;
export type SummarySourceMode = z.infer<typeof SummarySourceModeSchema>;

export const DEFAULT_SUMMARY_SYSTEM_PROMPT = `你是「时空回溯系统」的跨时间线客观记忆提炼官。
当前正在执行时间回溯：故事时间将从【回溯触发楼层】倒流回【存档锚点楼层】。这段即将被抹除的时间线（存档点之后至回溯前发生的一切）需要被浓缩为客观、清晰的记忆记录，供保留记忆的角色在回溯后参考。

请遵守以下准则：
1. 【客观纪实】：只记录该时间段内实际发生的事件、行动、关键对话披露的事实、地点转移、物品/状态变化与最终结果；不要脑补未明说的心理活动，不写文学性修饰。
2. 【先知情报优先】：重点提炼具有跨时间线预警价值的信息——例如：某决定引发的后果、暴露的秘密或陷阱、人物真实立场、关键物品下落，以及触发回溯的直接原因。
3. 【时序清晰】：按发生先后顺序梳理，合并琐碎寒暄，保留核心脉络。`;

export const DEFAULT_SUMMARY_USER_PROMPT = `请根据以下提供的【第 {{from_floor}} 层 至 第 {{to_floor}} 层】回溯区间记录（存档锚点位于第 {{anchor_floor}} 层），总结这段被回溯抹除的时间线中发生了什么。

【主要角色】：{{char}}、{{user}}
【存档锚点起点（第 {{anchor_floor}} 层）】：
{{anchor_preview}}

【回溯区间记录（{{source_label}}）】：
{{timeline_data}}

{{plugin_delta}}

【输出要求】：
1. 字数控制在 {{word_limit}} 字左右，语言直观精炼，便于阅读和修改。
2. 直接输出总结正文（不要包含“好的”、“以下是总结”等前缀），按以下三个部分清晰分段：
   - **时间与轨迹**：期间经历的时间变化与地点转换；
   - **关键事件与行动**：按顺序发生的核心事件、关键抉择与直接结果；
   - **重要情报与结局**：获知的秘密/状态变化，以及回溯前的最终局面。`;

export const ApiSettingsSchema = z
  .object({
    use_main_api: z.boolean().default(true),
    use_database_ai: z.boolean().default(false),
    database_ai_preset: z.string().default(''),
    api_url: z.string().default('https://api.openai.com/v1'),
    api_key: z.string().default(''),
    model: z.string().default('gpt-4o-mini'),
    model_list: z.array(z.string()).default(['gpt-4o-mini']),
    summary_source_mode: SummarySourceModeSchema,
    fallback_to_raw: z.boolean().default(true),
    summary_word_limit: z.string().default('180-320'),
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

export const LoopMemoryItemSchema = z.object({
  id: z.string(),
  range_label: z.string(),
  content: z.string(),
  timestamp: z.string(),
  anchor_key: z.enum(['slot_1', 'slot_2', 'slot_3']).optional(),
  anchor_floor: z.number().int().nonnegative().optional(),
});

export type SlotKey = 'slot_1' | 'slot_2' | 'slot_3';
export type SlotItem = z.infer<typeof SlotItemSchema>;
export type LoopMemoryItem = z.infer<typeof LoopMemoryItemSchema>;
export type ApiSettings = z.infer<typeof ApiSettingsSchema>;

export const SlotsSchema = z
  .object({
    slot_1: SlotItemSchema.nullable().default(null),
    slot_2: SlotItemSchema.nullable().default(null),
    slot_3: SlotItemSchema.nullable().default(null),
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
