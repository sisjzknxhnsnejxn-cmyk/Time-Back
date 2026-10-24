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
            就像游戏里的「存档读档」，但多了一个功能：<strong>读档回去之后，主角和核心角色还能记得上一轮发生过什么</strong>。
          </p>
        </section>

        <section class="tl-help-card">
          <h4>2. 怎么用？（只需三步）</h4>
          <ul class="tl-help-steps">
            <li>
              <span class="tl-step-num">1</span>
              <div>
                <strong>存个档</strong>：在关键对话楼层，点击任意槽位的「记录当前层」，把这一层定为起点。
              </div>
            </li>
            <li>
              <span class="tl-step-num">2</span>
              <div>
                <strong>回溯回去</strong>：继续往后聊，如果剧情走歪了、失败了或者想换个选择，打开窗口点「回溯到此层」。
              </div>
            </li>
            <li>
              <span class="tl-step-num">3</span>
              <div>
                <strong>检查和修改记忆</strong>：回溯完成后会自动跳到「记忆库」，你可以直接查看 AI 总结的内容；如果哪里写得不对，点「编辑」改掉再保存就行。
              </div>
            </li>
          </ul>
        </section>

        <section class="tl-help-card">
          <h4>3. 记忆插件需要手动选吗？</h4>
          <p>
            <strong>不需要。</strong>系统会自动检测你装了什么记忆插件（比如柏宝书、记忆表格、Horae、酒馆总结等），有哪个就自动用哪个；如果都没装，就会直接读聊天内容来总结。
          </p>
        </section>

        <section class="tl-help-card">
          <h4>4. 常见问题</h4>
          <div class="tl-faq-item">
            <strong>Q：回溯之后，原来的聊天记录真删了吗？</strong>
            <p>没有真删，只是自动隐藏了起来，不会再干扰新剧情，也不会弄坏聊天文件。</p>
          </div>
          <div class="tl-faq-item">
            <strong>Q：怎么自己手写一条记忆给 AI？</strong>
            <p>切换到「记忆库」页签，点击右上角的「新增记忆」，写好内容点保存即可。</p>
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
