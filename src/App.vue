<script setup lang="ts">
import { ref } from "vue";

// Comprehensive fix for endsWith and other string methods - add to ALL objects
const fixStringMethod = (methodName: string) => {
  Object.defineProperty(Object.prototype, methodName, {
    value: function(...args: any[]) {
      if (typeof this !== 'string') {
        console.warn(`${methodName} called on non-string, converting to string:`, this);
        return String(this)[methodName](...args);
      }
      const originalMethod = Function.prototype.call.bind(String.prototype[methodName]);
      return originalMethod(this, ...args);
    },
    enumerable: false,
    configurable: true,
    writable: true
  });
};

// Fix endsWith first (the one causing the error)
fixStringMethod('endsWith');

// Also fix other string methods that might be called on non-strings
const stringMethods = ['startsWith', 'includes', 'indexOf', 'match', 'replace', 'charAt'];
stringMethods.forEach(fixStringMethod);

// Global error handler to catch the endsWith error
window.addEventListener('error', (event) => {
  if (event.message && event.message.includes('endsWith is not a function')) {
    console.error('ENDSWITH ERROR CAUGHT:', event.message);
    console.error('Error stack:', event.error?.stack);
    console.error('Error object:', event.error);
    console.error('Current state:', {
      ocrMod,
      imgUrl: imgUrl.value,
      busy: busy.value
    });
  }
});

// ⚠️ 注意：有些版本导出方式不同（default / named），这里用动态兼容写法
let ocrMod: any = null;

const imgUrl = ref<string>("");
const busy = ref(false);
const resultText = ref<string>("");
const raw = ref<any>(null);
const recognitionTime = ref<number | null>(null); // 识别耗时（毫秒）
const error = ref<string | null>(null); // 错误提示
const success = ref<string | null>(null); // 成功提示

async function ensureOcrLoaded() {
  if (ocrMod) return;
  // Try a different import approach
  try {
    const m: any = await import("@paddlejs-models/ocr/lib/index.js");
    ocrMod = m?.paddlejs?.ocr ?? m;
    console.log('Direct import from lib:', ocrMod);
  } catch (err) {
    console.error('Direct import failed:', err);
    const m: any = await import("@paddlejs-models/ocr");
    ocrMod = m;
  }
}

/**
 * 初始化 OCR
 */
async function initOcrIfNeeded() {
  await ensureOcrLoaded();
  console.log('OCR Module loaded:', ocrMod);
  console.log('Available methods:', Object.keys(ocrMod));
  
  if (ocrMod.init && !ocrMod.__inited) {
    // Initialize OCR with default configuration
    try {
      console.log('Initializing OCR with default configuration...');
      // Use default initialization without custom model paths (they may not be supported)
      await ocrMod.init();
      ocrMod.__inited = true;
      console.log('OCR initialized successfully with default configuration');
    } catch (err) {
      console.error('Failed to initialize OCR:', err);
      throw err;
    }
  }
}

function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    try {
      console.log('Converting file to image:', file.name, file.size);
      const url = URL.createObjectURL(file);
      console.log('Created object URL:', url);
      
      const img = new Image();
      img.crossOrigin = 'anonymous'; // 防止跨域问题
      
      img.onload = () => {
        console.log('Image loaded successfully:', img.width, 'x', img.height);
        resolve(img);
      };
      
      img.onerror = (e) => {
        console.error('Image load error:', e);
        console.error('Image error event:', e);
        reject(new Error(`图片加载失败: ${e}`));
      };
      
      img.onabort = () => {
        console.error('Image load aborted');
        reject(new Error('图片加载被中断'));
      };
      
      img.src = url;
      
      // 超时处理，防止图片加载卡住
      const timeoutId = setTimeout(() => {
        console.error('Image load timeout');
        reject(new Error('图片加载超时'));
      }, 10000);
      
      img.onload = () => {
        clearTimeout(timeoutId);
        console.log('Image loaded successfully:', img.width, 'x', img.height);
        resolve(img);
      };
    } catch (err) {
      console.error('Error in fileToImage:', err);
      reject(err);
    }
  });
}

async function onPick(e: Event) {
  // 增加事件对象检查，解决移动端"object event"错误
  console.log('onPick event received:', e);
  console.log('Event target type:', typeof e.target);
  console.log('Event target:', e.target);

  // 严格检查事件目标和文件
  let file: File | null = null;
  if (e.target && typeof e.target === 'object' && 'files' in (e.target as any)) {
    const input = e.target as HTMLInputElement;
    file = input.files?.[0] || null;
  } else if (e instanceof Event && e.target instanceof HTMLInputElement) {
    file = e.target.files?.[0] || null;
  }

  if (!file) {
    console.error('No file selected or invalid event target:', e.target);
    error.value = '无法获取文件，请重新选择图片';
    return;
  }

  resultText.value = "";
  raw.value = null;
  recognitionTime.value = null; // 重置识别时间
  error.value = null; // 重置错误提示
  success.value = null; // 重置成功提示

  // 预览
  try {
    imgUrl.value = URL.createObjectURL(file);
  } catch (err) {
    console.error('Failed to create object URL:', err);
    error.value = '图片加载失败，请重试';
    return;
  }

  // 识别
  busy.value = true;
  try {
      await initOcrIfNeeded();
      await ensureOcrLoaded();

      console.log('Using ocrMod:', ocrMod);
      console.log('Has recognize method:', typeof ocrMod.recognize === 'function');
      
      if (typeof ocrMod.recognize !== 'function') {
        throw new Error("找不到 recognize 方法：请确认 @paddlejs-models/ocr 的导出 API。");
      }

      // 把图片喂给 OCR（大多数实现接受 HTMLImageElement / Canvas / ImageData）
      const img = await fileToImage(file);
      console.log('Image prepared:', img);
      
      let out;
      try {
        const startTime = Date.now(); // 记录开始时间
        out = await ocrMod.recognize(img);
        const endTime = Date.now(); // 记录结束时间
        recognitionTime.value = endTime - startTime; // 计算耗时
        console.log('OCR recognition successful:', out);
        console.log('Recognition time:', recognitionTime.value, 'ms');
        raw.value = out;
      } catch (err) {
        console.error('Recognition error:', err);
        console.error('Recognition error stack:', err?.stack);
        throw err;
      }

    // 尝试从输出里提取纯文本（不同版本结构不一）
    let extractedText = null;
    
    // Case 1: text is a string (most common)
    if (typeof out?.text === 'string') {
      extractedText = out.text;
    }
    // Case 2: text is an array (new structure)
    else if (Array.isArray(out?.text)) {
      extractedText = out.text.filter(Boolean).join('\n');
    }
    // Case 3: text in data object
    else if (typeof out?.data?.text === 'string') {
      extractedText = out.data.text;
    }
    // Case 4: text is an array in data object
    else if (Array.isArray(out?.data?.text)) {
      extractedText = out.data.text.filter(Boolean).join('\n');
    }
    // Case 5: text in result object
    else if (typeof out?.result?.text === 'string') {
      extractedText = out.result.text;
    }
    // Case 6: results is an array of objects with text
    else if (Array.isArray(out?.results)) {
      extractedText = out.results.map((x: any) => x.text).filter(Boolean).join('\n');
    }

    if (extractedText) {
      resultText.value = extractedText;
      success.value = "识别成功！";
    } else {
      resultText.value = "已返回结果，但无法自动提取 text 字段；请查看 raw JSON。";
      error.value = "文本提取格式异常，请查看原始数据。";
    }
  } catch (err: any) {
    const errorMsg = `识别失败：${err?.message ?? String(err)}`;
    console.error('OCR processing error:', err);
    console.error('Error stack:', err?.stack);
    resultText.value = errorMsg;
    error.value = errorMsg;
    success.value = null;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="ocr-app">
    <div class="container">
      <header class="app-header">
        <h1>Vue3 + PaddleJS OCR 识别工具</h1>
        <p class="subtitle">基于 PaddleJS 的光学字符识别应用</p>
      </header>

      <div class="upload-section">
        <label class="file-input-container">
          <span class="file-input-text">选择图片</span>
          <input type="file" accept="image/*" @change="onPick" class="file-input" />
        </label>
        <div v-if="busy" class="loading-indicator">
          <span class="loading-spinner"></span>
          <span>识别中...</span>
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="error-message">
        <span class="message-icon">⚠️</span>
        <span class="message-text">{{ error }}</span>
        <button class="message-close" @click="error = null">×</button>
      </div>

      <!-- Success Message -->
      <div v-if="success" class="success-message">
        <span class="message-icon">✅</span>
        <span class="message-text">{{ success }}</span>
        <button class="message-close" @click="success = null">×</button>
      </div>

      <div class="main-content">
        <div class="card">
          <div class="card-header">
            <h2>图片预览</h2>
          </div>
          <div class="card-body image-preview">
            <img v-if="imgUrl" :src="imgUrl" class="preview-image" />
            <div v-else class="placeholder">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
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
            <span v-if="recognitionTime" class="recognition-time">
              识别耗时：{{ recognitionTime }}ms
            </span>
          </div>
          <div class="card-body">
            <textarea
              readonly
              :value="resultText"
              class="result-textarea"
              placeholder="识别结果将显示在这里..."
            />
          </div>
        </div>
      </div>

      <div class="debug-section">
        <details class="debug-details">
          <summary class="debug-summary">
            <span>原始 JSON 数据</span>
          </summary>
          <pre class="debug-pre">{{ raw }}</pre>
        </details>
      </div>

      <footer class="app-footer">
        <p>
          <strong>提示：</strong>如果你遇到模型加载 404/跨域/离线问题，把模型文件放到 <code>public/models/</code> 并配置 <code>modelPath</code>。
        </p>
      </footer>
    </div>
  </div>
</template>

<style scoped>
/* CSS Variables for theme */
:root {
  --primary-color: #3b82f6;
  --primary-hover: #2563eb;
  --secondary-color: #64748b;
  --success-color: #10b981;
  --danger-color: #ef4444;
  --background-color: #f8fafc;
  --card-background: #ffffff;
  --card-hover: #fefefe;
  --border-color: #e2e8f0;
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --text-muted: #94a3b8;
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  --border-radius: 8px;
  --border-radius-lg: 12px;
  --transition: all 0.2s ease;
  --transition-slow: all 0.3s ease;
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
}

/* Reset and Base Styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background-color: var(--background-color);
  color: var(--text-primary);
  line-height: 1.6;
}

/* App Container */
.ocr-app {
  min-height: 100vh;
  padding: 2rem 0;
}

.container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

/* Header */
.app-header {
  text-align: center;
  margin-bottom: 2rem;
}

.app-header h1 {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.subtitle {
  font-size: 1rem;
  color: var(--text-secondary);
}

/* Upload Section */
.upload-section {
  display: flex;
  gap: 1.5rem;
  align-items: center;
  justify-content: center;
  margin-bottom: 2.5rem;
  flex-wrap: wrap;
  padding: var(--spacing-lg);
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(16, 185, 129, 0.03) 100%);
  border-radius: var(--border-radius-lg);
  border: 1px solid rgba(59, 130, 246, 0.1);
}

.file-input-container {
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%);
  color: white;
  padding: var(--spacing-md) var(--spacing-xl);
  border-radius: var(--border-radius-lg);
  font-weight: 500;
  transition: var(--transition-slow);
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
  border: none;
  font-size: 1rem;
  gap: var(--spacing-sm);
  text-align: center;
  letter-spacing: 0.025em;
}

.file-input-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: var(--transition);
}

.file-input-container:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(59, 130, 246, 0.4);
}

.file-input-container:hover::before {
  left: 100%;
}

.file-input-container:active {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.35);
}

.file-input-container .file-input-text::before {
  content: '📁';
  margin-right: var(--spacing-sm);
  font-size: 1.1rem;
}

.file-input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  font-size: 100px;
}

/* File Input Text */
.file-input-text {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.loading-indicator {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--primary-color);
  font-weight: 500;
  padding: var(--spacing-md);
  background-color: rgba(59, 130, 246, 0.05);
  border-radius: var(--border-radius-lg);
  border: 1px solid rgba(59, 130, 246, 0.2);
  animation: pulse 2s infinite;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(59, 130, 246, 0.2);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  box-shadow: 0 0 10px rgba(59, 130, 246, 0.3);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Error Message */
.error-message {
  background-color: rgba(239, 68, 68, 0.1);
  color: var(--danger-color);
  padding: var(--spacing-md);
  border-radius: var(--border-radius-lg);
  border: 1px solid rgba(239, 68, 68, 0.2);
  margin-bottom: var(--spacing-lg);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: 0.875rem;
  animation: slideIn 0.3s ease;
  box-shadow: var(--shadow-sm);
}

.error-message .message-icon {
  font-size: 1rem;
  flex-shrink: 0;
}

.error-message .message-text {
  flex: 1;
  line-height: 1.5;
}

/* Success Message */
.success-message {
  background-color: rgba(16, 185, 129, 0.1);
  color: var(--success-color);
  padding: var(--spacing-md);
  border-radius: var(--border-radius-lg);
  border: 1px solid rgba(16, 185, 129, 0.2);
  margin-bottom: var(--spacing-lg);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: 0.875rem;
  animation: slideIn 0.3s ease;
  box-shadow: var(--shadow-sm);
}

.success-message .message-icon {
  font-size: 1rem;
  flex-shrink: 0;
}

.success-message .message-text {
  flex: 1;
  line-height: 1.5;
}

/* Message Close Button */
.message-close {
  background: none;
  border: none;
  color: inherit;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--border-radius);
  transition: var(--transition);
  flex-shrink: 0;
}

.message-close:hover {
  background-color: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Main Content */
.main-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

/* Card Styles */
.card {
  background-color: var(--card-background);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-md);
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
  border: 1px solid var(--border-color);
  position: relative;
  z-index: 1;
  animation: cardSlideIn 0.5s ease-out;
}

.card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%);
  opacity: 0;
  transition: var(--transition-slow);
  z-index: -1;
}

.card:hover {
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  transform: translateY(-5px) scale(1.02);
  background-color: var(--card-hover);
}

.card:hover::before {
  opacity: 1;
}

/* First card animation delay */
.card:first-child {
  animation-delay: 0.1s;
}

/* Second card animation delay */
.card:last-child {
  animation-delay: 0.2s;
}

@keyframes cardSlideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.card-header {
  padding: var(--spacing-lg);
  background-color: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

.card-header h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.card-body {
  padding: var(--spacing-lg);
  background-color: var(--card-background);
}

/* Image Preview */
.image-preview {
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f8fafc;
  border-radius: var(--border-radius-lg);
  border: 2px dashed var(--border-color);
  transition: var(--transition-slow);
  position: relative;
  overflow: hidden;
}

.image-preview::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, transparent 48%, rgba(59, 130, 246, 0.03) 49%, rgba(59, 130, 246, 0.03) 51%, transparent 52%);
  background-size: 20px 20px;
  opacity: 0;
  transition: var(--transition-slow);
}

.image-preview:hover {
  border-color: var(--primary-color);
  background-color: rgba(59, 130, 246, 0.02);
}

.image-preview:hover::before {
  opacity: 1;
}

.preview-image {
  max-width: 100%;
  max-height: 400px;
  object-fit: contain;
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-md);
  transition: var(--transition-slow);
}

.preview-image:hover {
  transform: scale(1.01);
  box-shadow: var(--shadow-lg);
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
  transform: scale(1.1) rotate(5deg);
}

.placeholder span {
  font-size: 1.1rem;
  font-weight: 500;
  display: block;
}

/* Recognition Time */
.recognition-time {
  font-size: 0.875rem;
  color: var(--text-muted);
  font-weight: 400;
  background-color: rgba(16, 185, 129, 0.1);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius);
  border: 1px solid rgba(16, 185, 129, 0.2);
  transition: var(--transition);
}

.recognition-time:hover {
  background-color: rgba(16, 185, 129, 0.15);
  border-color: rgba(16, 185, 129, 0.3);
}

/* Result Textarea */
.result-textarea {
  width: 100%;
  height: 300px;
  padding: var(--spacing-lg);
  border: 2px solid var(--border-color);
  border-radius: var(--border-radius-lg);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.875rem;
  line-height: 1.6;
  resize: vertical;
  background-color: #f8fafc;
  transition: var(--transition-slow);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
  color: var(--text-primary);
}

.result-textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1), inset 0 1px 2px rgba(0, 0, 0, 0.05);
  background-color: white;
}

.result-textarea::placeholder {
  color: var(--text-muted);
  opacity: 0.7;
}

/* Debug Section */
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
  box-shadow: var(--shadow-lg);
}

.debug-summary {
  display: block;
  padding: var(--spacing-lg);
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  cursor: pointer;
  font-weight: 500;
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
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  color: var(--primary-color);
}

.debug-pre {
  margin: 0;
  padding: var(--spacing-lg);
  background-color: #0f172a;
  color: #e2e8f0;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.875rem;
  line-height: 1.6;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
  border-top: 1px solid #1e293b;
}

/* Footer */
.app-footer {
  text-align: center;
  padding: var(--spacing-xl) var(--spacing-lg);
  color: var(--text-secondary);
  font-size: 0.875rem;
  background-color: var(--card-background);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-color);
}

.app-footer p {
  margin: 0;
  line-height: 1.6;
}

.app-footer strong {
  color: var(--text-primary);
}

.app-footer code {
  background-color: rgba(59, 130, 246, 0.1);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.875rem;
  color: var(--primary-color);
  border: 1px solid rgba(59, 130, 246, 0.2);
}

/* Responsive Design */
/* Small devices (mobile phones, less than 576px) */
@media (max-width: 575.98px) {
  .container {
    padding: 0 var(--spacing-sm);
  }

  .ocr-app {
    padding: var(--spacing-lg) 0;
  }

  .app-header h1 {
    font-size: 1.25rem;
  }

  .subtitle {
    font-size: 0.875rem;
  }

  .upload-section {
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .file-input-container {
    padding: var(--spacing-sm) var(--spacing-lg);
    font-size: 0.875rem;
    width: 100%;
    text-align: center;
  }

  .main-content {
    grid-template-columns: 1fr;
    gap: var(--spacing-lg);
  }

  .card {
    border-radius: var(--border-radius);
  }

  .card-header {
    padding: var(--spacing-md);
  }

  .card-header h2 {
    font-size: 1rem;
  }

  .card-body {
    padding: var(--spacing-md);
  }

  .image-preview {
    min-height: 180px;
    border-radius: var(--border-radius);
  }

  .placeholder svg {
    width: 60px;
    height: 60px;
  }

  .placeholder span {
    font-size: 0.875rem;
  }

  .result-textarea {
    height: 180px;
    padding: var(--spacing-md);
    font-size: 0.75rem;
  }

  .recognition-time {
    font-size: 0.75rem;
    padding: 2px 6px;
  }

  .debug-summary {
    padding: var(--spacing-md);
    font-size: 0.875rem;
  }

  .debug-pre {
    padding: var(--spacing-md);
    font-size: 0.75rem;
  }

  .app-footer {
    padding: var(--spacing-lg) var(--spacing-md);
    font-size: 0.75rem;
  }
}

/* Medium devices (tablets, between 576px and 768px) */
@media (min-width: 576px) and (max-width: 767.98px) {
  .container {
    padding: 0 var(--spacing-md);
  }

  .app-header h1 {
    font-size: 1.5rem;
  }

  .main-content {
    grid-template-columns: 1fr;
    gap: var(--spacing-lg);
  }

  .upload-section {
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .card-body {
    padding: var(--spacing-lg);
  }

  .image-preview {
    min-height: 220px;
  }

  .result-textarea {
    height: 220px;
  }
}

/* Large devices (desktops, between 768px and 992px) */
@media (min-width: 768px) and (max-width: 991.98px) {
  .container {
    max-width: 900px;
  }

  .main-content {
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-lg);
  }

  .image-preview {
    min-height: 280px;
  }

  .result-textarea {
    height: 280px;
  }
}

/* Extra large devices (large desktops, 992px and above) */
@media (min-width: 992px) {
  .container {
    max-width: 1100px;
  }

  .main-content {
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-xl);
  }
}
</style>
