<script setup lang="ts">
const props = defineProps<{
  imgUrl: string;
  busy: boolean;
  error: string | null;
  success: string | null;
  resultText: string;
  recognitionTime: number | null;
  raw: unknown;
}>();

const emit = defineEmits<{
  (e: "pick", value: Event): void;
  (e: "clear-error"): void;
  (e: "clear-success"): void;
}>();
</script>

<template>
  <div class="ocr-app">
    <div class="grid-overlay" aria-hidden="true"></div>
    <div class="container">
      <header class="app-header">
        <div class="title-block">
          <div class="eyebrow">PaddleJS • OCR Lab</div>
          <h1>Vue 3 OCR 控制台</h1>
          <p class="subtitle">
            专注快速验证的轻量识别面板，适合本地或边缘端调试。
          </p>
        </div>
        <div class="badge-stack">
          <span class="chip live">实时</span>
          <span class="chip beta">Tech Mode</span>
        </div>
      </header>

      <section class="control-panel">
        <div class="panel-left">
          <div class="panel-title">输入通道</div>
          <p class="panel-desc">上传图片，模型自动识别并返回文本与原始 JSON。</p>
          <div class="status-line">
            <span class="status-dot" :class="props.busy ? 'on' : 'off'"></span>
            <span>{{ props.busy ? '识别中...' : '待上传' }}</span>
          </div>
        </div>
        <div class="panel-actions">
          <label class="file-input-container">
            <span class="file-input-text">选择图片</span>
            <input
              type="file"
              accept="image/*"
              class="file-input"
              @change="emit('pick', $event)"
            />
          </label>
          <div class="inline-indicators">
            <span class="chip soft">
              耗时：{{ props.recognitionTime ? `${props.recognitionTime}ms` : '—' }}
            </span>
            <span class="chip soft">
              文本长度：{{ props.resultText ? props.resultText.length : 0 }}
            </span>
            <span class="chip soft">
              行数：{{ props.resultText ? props.resultText.split('\n').filter(Boolean).length : 0 }}
            </span>
          </div>
          <div v-if="props.busy" class="loading-indicator">
            <span class="loading-spinner"></span>
            <span>识别中...</span>
          </div>
        </div>
      </section>

      <transition name="fade">
        <div v-if="props.error" class="error-message">
          <span class="message-icon">⚠️</span>
          <span class="message-text">{{ props.error }}</span>
          <button class="message-close" @click="emit('clear-error')">×</button>
        </div>
      </transition>

      <transition name="fade">
        <div v-if="props.success" class="success-message">
          <span class="message-icon">✅</span>
          <span class="message-text">{{ props.success }}</span>
          <button class="message-close" @click="emit('clear-success')">×</button>
        </div>
      </transition>

      <div class="main-content">
        <div class="card">
          <div class="card-header">
            <h2>图片预览</h2>
          </div>
          <div class="card-body image-preview">
            <img v-if="props.imgUrl" :src="props.imgUrl" class="preview-image" />
            <div v-else class="placeholder">
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              <span>请选择一张图片</span>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h2>识别文本</h2>
            <span v-if="props.recognitionTime" class="recognition-time">
              识别耗时：{{ props.recognitionTime }}ms
            </span>
          </div>
          <div class="card-body">
            <div
              :class="['result-textarea', {'empty': !props.resultText}]"
              placeholder="识别结果将显示在这里..."
            >
              {{ props.resultText || '' }}
            </div>
          </div>
        </div>
      </div>

      <div class="debug-section">
        <details class="debug-details">
          <summary class="debug-summary">
            <span>原始 JSON 数据</span>
          </summary>
          <pre class="debug-pre">{{ props.raw }}</pre>
        </details>
      </div>

      <footer class="app-footer">
        <p>
          <strong>提示：</strong> 仅支持识别英文和中文。
        </p>
      </footer>
    </div>
  </div>
</template>

<style scoped>
:root {
  --primary-color: #14b8a6;
  --primary-hover: #0ea5e9;
  --accent-color: #f8c25c;
  --success-color: #22c55e;
  --danger-color: #ef4f63;
  --background-color: #0e1529;
  --card-background: rgba(26, 36, 58, 0.96);
  --card-hover: rgba(30, 42, 68, 0.98);
  --border-color: rgba(255, 255, 255, 0.12);
  --text-primary: #f8fafc;
  --text-secondary: #dce4ef;
  --text-muted: #9aabc5;
  --shadow-md: 0 16px 45px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 24px 60px rgba(14, 165, 233, 0.15);
  --border-radius: 10px;
  --border-radius-lg: 14px;
  --transition: all 0.2s ease;
  --transition-slow: all 0.35s ease;
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Space Grotesk', 'Sora', 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
  background:
    radial-gradient(circle at 18% 24%, rgba(20, 184, 166, 0.1), transparent 22%),
    radial-gradient(circle at 82% 12%, rgba(248, 194, 92, 0.08), transparent 24%),
    linear-gradient(140deg, #0e1529 0%, #101a30 45%, #0e1529 100%);
  color: var(--text-primary);
  line-height: 1.6;
}

.ocr-app {
  min-height: 100vh;
  padding: 2.6rem 0 2rem;
  position: relative;
  overflow: auto;
  isolation: isolate;
}

.grid-overlay {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
  background-size: 46px 46px;
  mask-image: radial-gradient(circle at 50% 35%, rgba(0, 0, 0, 0.45), transparent 65%);
  opacity: 0.35;
  pointer-events: none;
  z-index: 0;
}

.container {
  max-width: 1120px;
  margin: 0 auto;
  padding: 0 1.5rem;
  position: relative;
  z-index: 1;
}

.app-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.title-block {
  display: grid;
  gap: 0.35rem;
}

.eyebrow {
  font-size: 0.8rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.app-header h1 {
  font-size: 2.25rem;
  font-weight: 750;
  color: var(--text-primary);
}

.subtitle {
  font-size: 1rem;
  color: var(--text-secondary);
  max-width: 650px;
}

.badge-stack {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.9rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 650;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(248, 250, 252, 0.9);
  color: #0b1624;
  backdrop-filter: blur(6px);
}

.chip.live {
  border-color: rgba(34, 197, 94, 0.4);
  background: linear-gradient(120deg, rgba(34, 197, 94, 0.18), rgba(20, 184, 166, 0.18));
  color: #0b1624;
}

.chip.beta {
  border-color: rgba(248, 194, 92, 0.45);
  background: linear-gradient(120deg, rgba(248, 194, 92, 0.28), rgba(14, 165, 233, 0.12));
  color: #0b1624;
}

.chip.soft {
  border-color: rgba(0, 0, 0, 0.08);
  background: rgba(248, 250, 252, 0.8);
  color: #0b1624;
}

.control-panel {
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 1.4rem;
  padding: 1.25rem 1.5rem;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-lg);
  background: linear-gradient(135deg, rgba(20, 184, 166, 0.08), rgba(16, 24, 40, 0.94));
  box-shadow: var(--shadow-md);
  margin-bottom: 1.5rem;
  backdrop-filter: blur(10px);
}

.panel-left {
  display: grid;
  gap: 0.5rem;
}

.panel-title {
  font-size: 1.08rem;
  font-weight: 720;
  color: var(--text-primary);
}

.panel-desc {
  color: var(--text-secondary);
}

.status-line {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary);
  font-weight: 650;
  letter-spacing: 0.01em;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--text-muted);
  box-shadow: 0 0 0 6px rgba(255, 255, 255, 0.05);
}

.status-dot.on {
  background: #22c55e;
  box-shadow: 0 0 0 6px rgba(34, 197, 94, 0.15), 0 0 12px rgba(34, 197, 94, 0.35);
}

.panel-actions {
  display: grid;
  gap: 0.75rem;
  align-items: center;
  justify-items: start;
}

.file-input-container {
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: linear-gradient(120deg, var(--primary-color), var(--primary-hover));
  color: #041319;
  padding: var(--spacing-md) var(--spacing-xl);
  border-radius: 12px;
  font-weight: 760;
  transition: var(--transition-slow);
  box-shadow: 0 14px 28px rgba(20, 184, 166, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.12);
  font-size: 1rem;
  gap: var(--spacing-sm);
  text-align: center;
  letter-spacing: 0.035em;
}

.file-input-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: -110%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  transition: var(--transition);
}

.file-input-container:hover {
  transform: translateY(-2px) scale(1.01);
  box-shadow: 0 18px 36px rgba(20, 184, 166, 0.42);
}

.file-input-container:hover::before {
  left: 120%;
}

.file-input-container:active {
  transform: translateY(0);
}

.file-input-container .file-input-text::before {
  content: '⟲';
  margin-right: var(--spacing-sm);
  font-size: 1.05rem;
}

.file-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  font-size: 120px;
}

.file-input-text {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.inline-indicators {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.loading-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--primary-color);
  font-weight: 640;
  padding: 0.65rem 1rem;
  background: rgba(20, 184, 166, 0.08);
  border-radius: 10px;
  border: 1px solid rgba(20, 184, 166, 0.18);
  animation: pulse 1.8s infinite;
}

.loading-spinner {
  width: 22px;
  height: 22px;
  border: 3px solid rgba(20, 184, 166, 0.16);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  box-shadow: 0 0 10px rgba(20, 184, 166, 0.25);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message,
.success-message {
  padding: var(--spacing-md);
  border-radius: var(--border-radius-lg);
  margin-bottom: var(--spacing-lg);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: 0.95rem;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-color);
  backdrop-filter: blur(6px);
}

.error-message {
  background: linear-gradient(120deg, rgba(239, 79, 99, 0.15), rgba(239, 79, 99, 0.05));
  color: #ffd7dd;
}

.success-message {
  background: linear-gradient(120deg, rgba(34, 197, 94, 0.16), rgba(34, 197, 94, 0.05));
  color: #cff5d7;
}

.message-text {
  color: #0b1624;
}

.message-close {
  background: none;
  border: none;
  color: #0b1624;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: var(--transition);
  flex-shrink: 0;
}

.message-close:hover {
  background-color: rgba(255, 255, 255, 0.12);
  transform: scale(1.1);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.main-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
  margin-bottom: 1.5rem;
}

.card {
  background-color: var(--card-background);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-md);
  overflow: visible;
  transition: var(--transition-slow);
  border: 1px solid var(--border-color);
  position: relative;
}

.card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 16% 10%, rgba(20, 184, 166, 0.08), transparent 42%),
    radial-gradient(circle at 92% 6%, rgba(248, 194, 92, 0.08), transparent 45%);
  opacity: 0;
  transition: var(--transition-slow);
  z-index: 0;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
  border-color: rgba(20, 184, 166, 0.32);
  background-color: var(--card-hover);
}

.card:hover::before {
  opacity: 1;
}

.card-header {
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0));
  z-index: 1;
}

.card-header h2 {
  font-size: 1.2rem;
  font-weight: 720;
  color: var(--text-primary);
  margin: 0;
}

.recognition-time {
  font-size: 0.85rem;
  color: #0ea5e9;
  background: rgba(14, 165, 233, 0.08);
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  border: 1px solid rgba(14, 165, 233, 0.22);
}

.card-body {
  padding: var(--spacing-lg);
  background-color: transparent;
  z-index: 1;
  overflow: visible;
}

.image-preview {
  min-height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 50% 50%, rgba(20, 184, 166, 0.08), rgba(10, 14, 24, 0.95));
  border-radius: var(--border-radius-lg);
  border: 1.5px dashed rgba(255, 255, 255, 0.08);
  transition: var(--transition-slow);
  position: relative;
  overflow: hidden;
}

.image-preview::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(45deg, transparent 48%, rgba(20, 184, 166, 0.08) 49%, rgba(20, 184, 166, 0.08) 51%, transparent 52%);
  background-size: 18px 18px;
  opacity: 0;
  transition: var(--transition-slow);
}

.image-preview:hover {
  border-color: rgba(20, 184, 166, 0.7);
  box-shadow: 0 15px 30px rgba(20, 184, 166, 0.12);
}

.image-preview:hover::before {
  opacity: 1;
}

.preview-image {
  max-width: 100%;
  max-height: 420px;
  object-fit: contain;
  border-radius: var(--border-radius);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
  transition: var(--transition-slow);
}

.preview-image:hover {
  transform: scale(1.01);
}

.placeholder {
  text-align: center;
  color: var(--text-secondary);
  padding: var(--spacing-xl);
}

.placeholder svg {
  display: block;
  margin: 0 auto var(--spacing-lg);
  color: var(--border-color);
  width: 80px;
  height: 80px;
  transition: var(--transition);
}

.image-preview:hover .placeholder svg {
  color: var(--primary-color);
  transform: scale(1.05) rotate(4deg);
}

.placeholder span {
  font-size: 1.05rem;
  font-weight: 620;
  display: block;
}

.result-textarea {
  width: 100%;
  height: 360px;
  max-height: 70vh;
  padding: var(--spacing-lg);
  border: 1.5px solid rgba(255, 255, 255, 0.35);
  border-radius: var(--border-radius-lg);
  font-family: 'JetBrains Mono', 'Fira Code', 'Monaco', 'Menlo', monospace;
  font-size: 1rem;
  line-height: 1.75;
  background: #f8fafc;
  transition: var(--transition-slow);
  color: #0b1624;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.12);
  overflow-y: scroll;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
  user-select: text;
  cursor: text;
  pointer-events: auto;
  display: block;
}

.result-textarea.empty::before {
  content: attr(placeholder);
  color: #6b7280;
  opacity: 0.95;
  pointer-events: none;
}

.result-textarea:hover {
  border-color: rgba(20, 184, 166, 0.6);
}

.result-textarea:focus {
  outline: none;
  border-color: rgba(20, 184, 166, 0.9);
  box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.25);
  background: #ffffff;
}

.debug-section {
  margin-bottom: var(--spacing-xl);
}

.debug-details {
  background-color: var(--card-background);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-md);
  overflow: hidden;
  border: 1px solid var(--border-color);
  transition: var(--transition);
}

.debug-details:hover {
  border-color: rgba(20, 184, 166, 0.32);
  box-shadow: var(--shadow-lg);
}

.debug-summary {
  display: block;
  padding: var(--spacing-lg);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.02));
  cursor: pointer;
  font-weight: 640;
  color: var(--text-primary);
  transition: var(--transition-slow);
  position: relative;
  user-select: none;
}

.debug-summary::after {
  content: '▶';
  position: absolute;
  right: var(--spacing-lg);
  top: 50%;
  transform: translateY(-50%) rotate(0deg);
  transition: var(--transition);
  font-size: 0.875rem;
  color: var(--text-muted);
}

.debug-details[open] .debug-summary::after {
  transform: translateY(-50%) rotate(90deg);
}

.debug-summary:hover {
  color: var(--primary-color);
}

.debug-pre {
  margin: 0;
  padding: var(--spacing-lg);
  background-color: #0d1528;
  color: #e2e8f0;
  font-family: 'JetBrains Mono', 'Fira Code', 'Monaco', 'Menlo', monospace;
  font-size: 0.92rem;
  line-height: 1.65;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.app-footer {
  text-align: center;
  padding: var(--spacing-xl) var(--spacing-lg);
  color: var(--text-secondary);
  font-size: 0.9rem;
  background-color: var(--card-background);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-color);
}

.app-footer strong {
  color: var(--text-primary);
}

.app-footer code {
  background-color: rgba(248, 194, 92, 0.12);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius);
  font-family: 'JetBrains Mono', 'Fira Code', 'Monaco', 'Menlo', monospace;
  font-size: 0.9rem;
  color: var(--accent-color);
  border: 1px solid rgba(248, 194, 92, 0.25);
}

@media (max-width: 575.98px) {
  .container {
    padding: 0 var(--spacing-sm);
  }

  .ocr-app {
    padding: var(--spacing-lg) 0;
  }

  .app-header h1 {
    font-size: 1.5rem;
  }

  .subtitle {
    font-size: 0.95rem;
  }

  .app-header {
    flex-direction: column;
  }

  .control-panel {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .panel-actions {
    width: 100%;
  }

  .file-input-container {
    width: 100%;
    justify-content: center;
  }

  .inline-indicators {
    width: 100%;
  }

  .main-content {
    grid-template-columns: 1fr;
    gap: var(--spacing-lg);
  }

  .image-preview {
    min-height: 200px;
  }

  .result-textarea {
    height: 220px;
  }
}

@media (min-width: 576px) and (max-width: 991.98px) {
  .app-header {
    flex-direction: column;
  }

  .control-panel {
    grid-template-columns: 1fr;
  }

  .main-content {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 992px) {
  .main-content {
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-xl);
  }
}
</style>
