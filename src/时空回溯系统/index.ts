import { createScriptIdDiv, teleportStyle } from '@util/script';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import './index.scss';
import { useTimeLoopStore } from './store';

const QR_BUTTON_NAME = '↺ 时空回溯';

function init() {
  const parentDoc = window.parent.document;
  const scriptId = getScriptId();
  $(`[script_id="${scriptId}"]`, parentDoc).remove();

  try {
    replaceScriptButtons([{ name: QR_BUTTON_NAME, visible: true }]);
  } catch (e) {
    console.warn('[TimeLoop] 注册脚本按钮失败', e);
  }

  // 始终挂载在 body 下，避免在 iOS Safari 中受 #qr--bar 的 transform/overflow 影响导致 fixed 弹窗被裁剪
  const $container = createScriptIdDiv().addClass('timeloop-root');
  $container.appendTo($('body', parentDoc));

  const pinia = createPinia();
  const app = createApp(App);
  app.use(pinia);
  app.mount($container[0]);

  const styleTeleporter = teleportStyle($('head', parentDoc));

  const store = useTimeLoopStore(pinia);

  const qrBtnListener = eventOn(getButtonEvent(QR_BUTTON_NAME), () => {
    store.refreshChatSlots();
    store.isModalOpen = !store.isModalOpen;
  });

  const chatChangeListener = eventOn(tavern_events.CHAT_CHANGED, () => {
    store.refreshChatSlots();
  });

  const cleanup = () => {
    qrBtnListener.stop();
    chatChangeListener.stop();
    app.unmount();
    $container.remove();
    styleTeleporter.destroy();
  };
  $(window).one('pagehide', cleanup);
}

$(() => {
  errorCatched(init)();
});

