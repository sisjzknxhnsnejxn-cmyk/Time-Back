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

  let lastTriggerTime = 0;
  const handleQrButtonTrigger = () => {
    const now = Date.now();
    store.lastOpenedAt = now;
    store.isMinimized = false;
    store.isModalOpen = true;
    if (now - lastTriggerTime < 350) return;
    lastTriggerTime = now;
    store.refreshChatSlots();
  };

  let qrBtnListener: { stop: () => void } | null = null;
  try {
    qrBtnListener = eventOn(getButtonEvent(QR_BUTTON_NAME), () => {
      handleQrButtonTrigger();
    });
  } catch (e) {
    console.warn('[TimeLoop] 监听脚本按钮事件失败', e);
  }

  const win = window as Window & {
    __TIMELOOP_REGISTER_TOGGLE__?: (fn: (forceOpen?: boolean) => void) => void;
  };
  if (typeof win.__TIMELOOP_REGISTER_TOGGLE__ === 'function') {
    win.__TIMELOOP_REGISTER_TOGGLE__(handleQrButtonTrigger);
  }

  // DOM 级点击兜底：防止云端异步加载后部分环境下 getButtonEvent 映射失效
  const onParentQrClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const btn = target.closest('#qr--bar .qr--button, #qr--bar button') as HTMLElement | null;
    if (!btn || btn.classList.contains('timeloop-qr-btn')) return;
    if (btn.textContent && btn.textContent.includes('时空回溯')) {
      handleQrButtonTrigger();
    }
  };
  parentDoc.addEventListener('click', onParentQrClick, true);

  const chatChangeListener = eventOn(tavern_events.CHAT_CHANGED, () => {
    store.refreshChatSlots();
  });

  const cleanup = () => {
    qrBtnListener?.stop();
    chatChangeListener.stop();
    parentDoc.removeEventListener('click', onParentQrClick, true);
    app.unmount();
    $container.remove();
    styleTeleporter.destroy();
  };
  $(window).one('pagehide', cleanup);
}

$(() => {
  errorCatched(init)();
});

