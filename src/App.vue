<script setup lang="ts">
import { ref } from "vue";
import OcrLayout from "./components/OcrLayout.vue";

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
  } catch (err) {
    const m: any = await import("@paddlejs-models/ocr");
    ocrMod = m;
  }
}

/**
 * 初始化 OCR
 */
async function initOcrIfNeeded() {
  await ensureOcrLoaded();
  
  if (ocrMod.init && !ocrMod.__inited) {
    // Initialize OCR with default configuration
    try {
      // Use default initialization without custom model paths (they may not be supported)
      await ocrMod.init();
      ocrMod.__inited = true;
    } catch (err) {
      throw err;
    }
  }
}

function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    try {
      const url = URL.createObjectURL(file);
      
      const img = new Image();
      img.crossOrigin = 'anonymous'; // 防止跨域问题
      
      // 超时处理，防止图片加载卡住
      const timeoutId = setTimeout(() => {
        reject(new Error('图片加载超时'));
      }, 10000);
      
      img.onload = () => {
        clearTimeout(timeoutId);
        resolve(img);
      };
      
      img.onerror = (e) => {
        clearTimeout(timeoutId);
        reject(new Error(`图片加载失败: ${e}`));
      };
      
      img.onabort = () => {
        clearTimeout(timeoutId);
        reject(new Error('图片加载被中断'));
      };
      
      img.src = url;
    } catch (err) {
      reject(err);
    }
  });
}

async function onPick(e: Event) {
  // 增加事件对象检查，解决移动端"object event"错误
  let file: File | null = null;
  
  // 简化事件目标检查逻辑
  const target = e.target as HTMLInputElement;
  if (target && 'files' in target && target.files?.[0]) {
    file = target.files[0];
  }

  if (!file) {
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
      
      if (typeof ocrMod.recognize !== 'function') {
        throw new Error("找不到 recognize 方法：请确认 @paddlejs-models/ocr 的导出 API。");
      }

      // 把图片喂给 OCR（大多数实现接受 HTMLImageElement / Canvas / ImageData）
      const img = await fileToImage(file);
      
      let out;
      try {
        const startTime = Date.now(); // 记录开始时间
        out = await ocrMod.recognize(img);
        const endTime = Date.now(); // 记录结束时间
        recognitionTime.value = endTime - startTime; // 计算耗时
        raw.value = out;
      } catch (err) {
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

const clearError = () => {
  error.value = null;
};

const clearSuccess = () => {
  success.value = null;
};
</script>

<template>
  <OcrLayout
    :img-url="imgUrl"
    :busy="busy"
    :error="error"
    :success="success"
    :result-text="resultText"
    :recognition-time="recognitionTime"
    :raw="raw"
    @pick="onPick"
    @clear-error="clearError"
    @clear-success="clearSuccess"
  />
</template>
