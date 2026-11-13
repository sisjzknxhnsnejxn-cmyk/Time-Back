<template>
  <div v-if="open" class="tl-help-backdrop" :style="viewportStyle" @click.self="$emit('close')">
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
          <h4>这是什么？</h4>
          <p>
            就像游戏的<strong>存档 / 读档</strong
            >。读档回到过去后，<strong>角色依然记得上一轮发生的事</strong>，而世界状态和插件数据都会恢复到存档时的样子。
          </p>
        </section>

        <section class="tl-help-card">
          <h4>怎么用？（三步搞定）</h4>
          <ul class="tl-help-steps">
            <li>
              <span class="tl-step-num">1</span>
              <div>
                <strong>存档</strong>：点「记录当前层」。想给以前的楼层补存档，在左边
                <code>#</code> 框填楼层号再点记录（最多 5 个存档）。
              </div>
            </li>
            <li>
              <span class="tl-step-num">2</span>
              <div><strong>读档</strong>：剧情不满意或想走别的分支时，点对应存档的「回溯到此层」。</div>
            </li>
            <li>
              <span class="tl-step-num">3</span>
              <div>
                <strong>改记忆</strong>：读档后会自动提炼上一轮记忆并放进「记忆库」，你可以随时修改、删除或手动添加。
              </div>
            </li>
          </ul>
        </section>

        <section class="tl-help-card">
          <h4>实用小提示</h4>
          <div class="tl-faq-item">
            <strong>• 聊天记录不会真删</strong>
            <p>回溯只是把后面的楼层自动隐藏起来，原记录完好无损。</p>
          </div>
          <div class="tl-faq-item">
            <strong>• 自动联动插件</strong>
            <p>已自动适配柏宝书、记忆表格、千千结、Horae、Engram、MVU 变量等，存档读档时会自动同步恢复。</p>
          </div>
          <div class="tl-faq-item">
            <strong>• 最小化小圆球</strong>
            <p>点窗口右上角的 <code>—</code> 可缩成小圆球（可拖动），点一下圆球就能回到窗口。</p>
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
  viewportStyle?: Record<string, string>;
}>();

defineEmits<{
  (e: 'close'): void;
}>();
</script>
