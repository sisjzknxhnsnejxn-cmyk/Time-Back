import { createScriptIdDiv, teleportStyle } from '@util/script';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import './index.scss';
import { useTimeLoopStore } from './store';

const QR_BUTTON_NAME = '↺ 时空回溯';
const QR_BUTTON_SELECTOR =
  '#qr--bar .qr--button, #qr--bar button, #qr--bar .menu_button, .qr--buttons .qr--button, .qr--buttons button, .qr--button, .menu_button';

function resolveElementTarget(raw: EventTarget | null): HTMLElement | null {
  if (!raw) return null;
  const node = raw as Node;
  if (node.nodeType === 3) {
    return node.parentElement;
  }
  return node.nodeType === 1 ? (node as HTMLElement) : null;
}

function isTimeLoopButtonElement(el: HTMLElement): boolean {
  const label = (el.textContent || el.getAttribute('title') || '').trim();
  return label.length > 0 && label.length <= 32 && label.includes('时空回溯');
}

function findQrBarTimeLoopButton(target: HTMLElement | null): HTMLElement | null {
  if (!target || typeof target.closest !== 'function') return null;
  if (target.closest('.timeloop-root')) return null;
  const btn = target.closest(QR_BUTTON_SELECTOR) as HTMLElement | null;
  if (!btn || btn.classList.contains('timeloop-qr-btn')) return null;
  if (isTimeLoopButtonElement(btn)) {
    return btn;
  }
  return null;
}

function enhanceNativeQrButtons(parentDoc: Document, onTrigger?: () => void) {
  try {
    const candidates = parentDoc.querySelectorAll(QR_BUTTON_SELECTOR);
    candidates.forEach(node => {
      const el = node as HTMLElement;
      if (el.closest('.timeloop-root') || el.classList.contains('timeloop-qr-btn')) return;
      if (!isTimeLoopButtonElement(el)) return;
      el.style.cursor = 'pointer';
      el.style.touchAction = 'manipulation';
      el.style.setProperty('-webkit-tap-highlight-color', 'transparent');
      if (!el.getAttribute('role') && el.tagName !== 'BUTTON') {
        el.setAttribute('role', 'button');
        el.setAttribute('tabindex', '0');
      }
      if (onTrigger && el.dataset.timeloopBound !== '1') {
        el.dataset.timeloopBound = '1';
        let directTouchStart: { x: number; y: number } | null = null;
        el.addEventListener(
          'touchstart',
          (ev: TouchEvent) => {
            if (ev.touches.length === 1) {
              directTouchStart = { x: ev.touches[0].clientX, y: ev.touches[0].clientY };
            } else {
              directTouchStart = null;
            }
          },
          { passive: true },
        );
        el.addEventListener(
          'touchend',
          (ev: TouchEvent) => {
            if (!directTouchStart || ev.changedTouches.length === 0) return;
            const t = ev.changedTouches[0];
            const dist = Math.hypot(t.clientX - directTouchStart.x, t.clientY - directTouchStart.y);
            directTouchStart = null;
            if (dist <= 18) {
              onTrigger();
            }
          },
          { passive: true },
        );
        el.addEventListener('click', () => {
          onTrigger();
        });
      }
    });
  } catch {
    // ignore
  }
}

function init() {
  const parentDoc = window.parent.document;
  const scriptId = getScriptId();
  $(`[script_id="${scriptId}"]`, parentDoc).remove();

  const win = window as Window & {
    __TIMELOOP_REGISTER_TOGGLE__?: (fn: (forceOpen?: boolean) => void) => void;
  };
  const hasCloudLoaderHook = typeof win.__TIMELOOP_REGISTER_TOGGLE__ === 'function';

  // 若云端加载器已注册过脚本按钮且 DOM 中已存在，避免重复调用 replaceScriptButtons 导致移动端按钮节点重建失联
  const existingQrBtn = Array.from(
    parentDoc.querySelectorAll('#qr--bar .qr--button, .qr--buttons .qr--button'),
  ).some(el => (el.textContent || '').includes('时空回溯'));

  if (!hasCloudLoaderHook || !existingQrBtn) {
    try {
      replaceScriptButtons([{ name: QR_BUTTON_NAME, visible: true }]);
    } catch (e) {
      console.warn('[TimeLoop] 注册脚本按钮失败', e);
    }
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

  if (typeof win.__TIMELOOP_REGISTER_TOGGLE__ === 'function') {
    win.__TIMELOOP_REGISTER_TOGGLE__(handleQrButtonTrigger);
  }

  enhanceNativeQrButtons(parentDoc, handleQrButtonTrigger);
  const enhanceTimer = setTimeout(() => enhanceNativeQrButtons(parentDoc, handleQrButtonTrigger), 500);
  const enhanceInterval = setInterval(() => enhanceNativeQrButtons(parentDoc, handleQrButtonTrigger), 2000);

  // DOM 级点击 + iOS 触摸轻触 (Tap) 双重兜底：
  // 解决 iOS 浏览器中非 <button> 的 .qr--button 不派发 click、Text 节点无 closest 方法、或滚动容器吞噬点击的问题
  let touchStartPos: { x: number; y: number; time: number } | null = null;

  const onParentTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) {
      touchStartPos = null;
      return;
    }
    const target = resolveElementTarget(e.target);
    const btn = findQrBarTimeLoopButton(target);
    if (!btn) {
      touchStartPos = null;
      return;
    }
    const touch = e.touches[0];
    touchStartPos = { x: touch.clientX, y: touch.clientY, time: Date.now() };
  };

  const onParentTouchEnd = (e: TouchEvent) => {
    if (!touchStartPos || e.changedTouches.length === 0) return;
    const start = touchStartPos;
    touchStartPos = null;

    const touch = e.changedTouches[0];
    const dist = Math.hypot(touch.clientX - start.x, touch.clientY - start.y);
    const elapsed = Date.now() - start.time;
    if (dist > 14 || elapsed > 700) return;

    const target = resolveElementTarget(e.target);
    const btn = findQrBarTimeLoopButton(target);
    if (!btn) return;

    if (e.cancelable) {
      e.preventDefault();
    }
    handleQrButtonTrigger();
  };

  const onParentQrClick = (e: MouseEvent) => {
    const target = resolveElementTarget(e.target);
    const btn = findQrBarTimeLoopButton(target);
    if (!btn) return;
    handleQrButtonTrigger();
  };

  parentDoc.addEventListener('touchstart', onParentTouchStart, { capture: true, passive: true });
  parentDoc.addEventListener('touchend', onParentTouchEnd, { capture: true, passive: false });
  parentDoc.addEventListener('click', onParentQrClick, true);

  const chatChangeListener = eventOn(tavern_events.CHAT_CHANGED, () => {
    store.refreshChatSlots();
    setTimeout(() => enhanceNativeQrButtons(parentDoc, handleQrButtonTrigger), 200);
  });

  const beforeGenListeners: Array<{ stop: () => void }> = [];
  const registerBeforeGenEvent = (evtName: any) => {
    if (!evtName) return;
    try {
      beforeGenListeners.push(
        eventOn(evtName, () => {
          store.refreshChatSlots();
        }),
      );
    } catch {
      // ignore
    }
  };
  registerBeforeGenEvent(tavern_events.GENERATION_AFTER_COMMANDS);
  registerBeforeGenEvent(tavern_events.GENERATION_STARTED);
  registerBeforeGenEvent(tavern_events.GENERATE_BEFORE_COMBINE_PROMPTS);

  let promptReadyListener: { stop: () => void } | null = null;
  try {
    promptReadyListener = eventOn(tavern_events.CHAT_COMPLETION_PROMPT_READY, (eventData: any) => {
      store.ensureMemoryInChatCompletion(eventData);
    });
  } catch {
    // ignore
  }

  const cleanup = () => {
    clearTimeout(enhanceTimer);
    clearInterval(enhanceInterval);
    qrBtnListener?.stop();
    chatChangeListener.stop();
    beforeGenListeners.forEach(l => l.stop());
    promptReadyListener?.stop();
    parentDoc.removeEventListener('touchstart', onParentTouchStart, true);
    parentDoc.removeEventListener('touchend', onParentTouchEnd, true);
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

