export const ThemeColorSchema = z.enum(['amber', 'cyan', 'rose', 'emerald']).default('amber');
export const ColorModeSchema = z.enum(['dark', 'light']).default('dark');
export const FloatingBallModeSchema = z.enum(['always', 'minimized_only', 'off']).default('always');
export const FloatingBallSideSchema = z.enum(['left', 'right']).default('right');

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
export type FloatingBallMode = z.infer<typeof FloatingBallModeSchema>;
export type FloatingBallSide = z.infer<typeof FloatingBallSideSchema>;
export type SummarySourceMode = z.infer<typeof SummarySourceModeSchema>;
export type ApiMode = z.infer<typeof ApiModeSchema>;
export type TagFilterMode = z.infer<typeof TagFilterModeSchema>;

export const DEFAULT_SUMMARY_SYSTEM_PROMPT = `你是「时空回溯系统」的跨时间线客观记忆提炼官。
当前正在执行时间回溯：故事时间将从【回溯触发楼层】倒流回【存档锚点楼层】。这段即将被抹除的时间线（存档点之后至回溯前发生的一切）需要被浓缩为客观、详实、高价值的纯文本记忆档案，供保留记忆的角色在回溯后参考。

请遵守以下核心准则：
1. 客观纪实：只记录该时间段内实际发生的事件、行动、对话披露的事实、情感与关系变化、物品流转与最终结果；不脑补未明说的心理活动，不写浮夸的文学修辞。
2. 跨周目破局情报优先：重点提炼对回溯后改写未来最有价值的信息，包括：关键事件发生的具体时间点与地点（便于提前卡点或避险）、某项抉择引发的连锁因果、能瞬间取信他人的私人秘密或暗号口令、暴露的伪装与真实立场、隐藏道具下落，以及触发回溯的直接导火索。
3. 纯文本排版（严禁Markdown）：全文必须使用纯文本格式输出，严禁使用任何 Markdown 语法符号（禁止出现 # 标题、**加粗**、*斜体*、- 无序列表、> 引用或代码块符号），仅使用中文方括号【】、中文标点与数字序号进行分段排版。`;

export const DEFAULT_SUMMARY_USER_PROMPT = `请根据以下提供的【第 {{from_floor}} 层 至 第 {{to_floor}} 层】回溯区间记录（存档锚点位于第 {{anchor_floor}} 层），总结这段被回溯抹除的时间线中发生了什么。

【主要角色】：{{char}}、{{user}}
【存档锚点起点（第 {{anchor_floor}} 层）】：
{{anchor_preview}}

【回溯区间记录（{{source_label}}）】：
{{timeline_data}}

{{plugin_delta}}

【输出要求】：
1. 字数控制在 {{word_limit}} 字之间，内容详实、逻辑清晰，完整保留关键事件经过、因果链条与重要细节。
2. 严禁使用任何 Markdown 格式（禁止使用 #、*、**、-、\` 等符号），直接输出纯文本总结正文（不要包含“好的”、“以下是总结”等寒暄前缀）。
3. 请严格按照以下六个纯文本栏目分段输出（若某栏目无对应内容可简写为“无明显变化”或合并简述）：

【时空节点与动线】
记录期间经历的具体时间节点变化、经过的地点转移路线与关键时机。

【核心事件与抉择因果】
按时间先后顺序梳理发生的核心事件、双方做出的关键选择，以及该选择直接导致的后果（明确“因何行动导致何种结果”）。

【关键对话与信物暗号】
提炼对话中披露的重要事实、约定承诺、秘密情报、口令暗号，或回溯后可用于直接说服/取信他人的关键信息。

【人物立场与关系变化】
记录相关角色暴露的真实目的、阵营立场、性格弱点/忌讳，以及与主角之间的感情升温、矛盾激化或信任度变化。

【物品线索与状态变动】
记录获得、消耗、丢失或发现的关键道具及其所在位置，解开的谜题线索，以及角色身体状态、伤势或能力的变化。

【危机预警与回溯终局】
总结本轮暴露的致命陷阱、敌方行动规律、遗憾失误点，以及触发回溯前的最终定格局面。`;

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
    floating_ball_mode: FloatingBallModeSchema,
    floating_ball_side: FloatingBallSideSchema,
    floating_ball_top_percent: z.number().min(5).max(92).default(72),
    floating_ball_x_percent: z.number().min(2).max(92).default(78),
    floating_ball_y_percent: z.number().min(4).max(92).default(76),
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
