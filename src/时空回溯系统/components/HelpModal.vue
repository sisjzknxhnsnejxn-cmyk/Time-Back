<template>
  <div v-if="open" class="tl-help-backdrop" @click.self="$emit('close')">
    <div class="tl-help-sheet" @click.stop>
      <div class="tl-help-header">
        <div class="tl-help-title">
          <FlatIcon name="help" />
          <span>使用说明</span>
        </div>
        <button type="button" class="tl-icon-btn" aria-label="关闭说明" @click="$emit('close')">
          <FlatIcon name="close" />
        </button>
      </div>

      <div class="tl-help-body">
        <section class="tl-help-card">
          <h4>1. 这个工具是干嘛的？</h4>
          <p>
            就像游戏里的「存档读档」，但多了一个核心能力：<strong>读档回溯之后，主角与核心角色还能保留上一轮时间线的客观记忆与情报</strong>，而物理世界、时间、物品与其他 NPC 则自动恢复到存档点状态。
          </p>
        </section>

        <section class="tl-help-card">
          <h4>2. 怎么用？（只需三步）</h4>
          <ul class="tl-help-steps">
            <li>
              <span class="tl-step-num">1</span>
              <div>
                <strong>记录时间锚点（支持当前层 &amp; 任意历史楼层）</strong>：在关键对话楼层点击「记录当前层」定为起点；如果剧情已经推进到后面（如第 90 层）才想起给前面的第 70 层存档，直接在按钮左侧的 <code>#</code> 楼层框输入 <code>70</code> 并点击「记录第 70 层」，即可自动逆向构建第 70 层的完整状态快照。最多可解锁 <strong>5 个时间锚点</strong>。
              </div>
            </li>
            <li>
              <span class="tl-step-num">2</span>
              <div>
                <strong>回溯到锚点</strong>：继续往后推进剧情，若走向不理想、触发坏结局或想尝试其他分支，打开窗口点击对应锚点的「回溯到此层」（若回溯到较早锚点，其后面的未来分支锚点会自动清理）。
              </div>
            </li>
            <li>
              <span class="tl-step-num">3</span>
              <div>
                <strong>查看与编辑保留记忆</strong>：回溯完成后会自动跳转到「记忆库」，你可以直接审阅 AI 提炼的跨时间线记忆；如有疏漏，点击「编辑」即可随时修改保存，或点击右上角手动新增记忆。
              </div>
            </li>
          </ul>
        </section>

        <section class="tl-help-card">
          <h4>3. AI 接口、记忆插件与总结增强</h4>
          <p>
            • <strong>双模式 AI 接口</strong>：支持直接使用「酒馆主聊天 AI」（省心免配置，自动以纯净无预设方式调用），或切换至「自定义 API（副 API）」管理多个配置（支持新增、复制、删除、拉取模型、流式/非流式切换及连接测试）。<br />
            • <strong>插件联动与快照恢复</strong>：自动识别已安装的记忆插件（柏宝书、记忆表格、Horae、千千结/千事、Engram 记忆、酒馆总结、MVU 变量等），在存档时保存各插件的记忆/表格/变量快照，并在回溯时自动恢复与清理隐藏分支楼层。<br />
            • <strong>分批提炼与标签过滤</strong>：当回溯区间超过单次字数上限（默认 32000 字）时会自动分段提炼并合并总结；默认剔除 <code>&lt;think&gt;</code>、<code>&lt;thinking&gt;</code> 思维链标签，也支持仅提取指定标签内的正文。
          </p>
        </section>

        <section class="tl-help-card">
          <h4>4. 常见问题</h4>
          <div class="tl-faq-item">
            <strong>Q：回溯之后，原来的聊天记录真删了吗？</strong>
            <p>没有真删，只是自动隐藏了起来，既不会干扰回溯后的新剧情，也不会损坏原聊天记录文件。</p>
          </div>
          <div class="tl-faq-item">
            <strong>Q：怎么自己手写一条记忆给 AI？</strong>
            <p>切换到「记忆库」页签，点击右上角的「新增记忆」，填写标题与内容后保存即可。</p>
          </div>
          <div class="tl-faq-item">
            <strong>Q：如何移动或关闭屏幕上的悬浮球？</strong>
            <p>悬浮球支持用鼠标或手指<strong>按住自由拖动</strong>，松手后会自动平滑吸附到屏幕左侧或右侧边缘；您也可以在「设置 → 界面外观 → 屏幕悬浮球」中自由切换为<strong>常驻显示 / 仅最小化时 / 关闭</strong>。</p>
          </div>
        </section>
      </div>

      <div class="tl-help-footer">
        <button type="button" class="tl-btn tl-btn-primary tl-btn-block" @click="$emit('close')">我知道了</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import FlatIcon from './FlatIcon.vue';

defineProps<{
  open: boolean;
}>();

defineEmits<{
  (e: 'close'): void;
}>();
</script>
