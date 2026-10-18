# 轻转 Web · 在线文档转换

一个纯前端实现的文档转换工具。**文件不上传**，所有转换在浏览器里完成。

- 14 个工具，其中 **9 个完全本地运行**（图片、PDF、文本）
- 无框架、无构建、无依赖安装，双击就能打开
- 蓝紫渐变 + 玻璃拟态，全部图标由 CSS 绘制，零图片资源

---

## 一、怎么打开

### 方式 A：直接双击 `index.html`
界面全部可用，图片类工具也能用。
但浏览器会拦截 `file://` 下的 Web Worker，**「PDF 转图片」会失败**。

### 方式 B：起一个本地服务（推荐，功能完整）

在本目录下打开终端，任选一条：

```bash
python -m http.server 8080
# 或
npx serve .
```

然后访问 `http://localhost:8080`。

> 部署到任何静态托管（Vercel / Netlify / GitHub Pages / Nginx / 对象存储）也可以，把整个目录上传即可，不需要后端。

---

## 二、目录结构

```
qingzhuan-web/
├── index.html                 入口（顶栏 / 容器 / 页脚 + CDN 依赖）
├── assets/
│   ├── css/style.css          全部样式（设计变量、组件、响应式）
│   ├── js/
│   │   ├── tools.js           工具清单：名称、格式、选项、本地/服务端
│   │   ├── store.js           localStorage 记录与偏好
│   │   ├── engine.js          ★ 转换引擎（9 个本地实现 + 服务端转发）
│   │   └── app.js             hash 路由 + 视图渲染 + 交互
│   └── vendor/
│       └── pdf.worker.min.js  pdf.js 的 worker（同源，必须放在这）
```

**加一个工具**只需要在 `tools.js` 里加一条，首页网格、工具页、选项控件会自动生成；再到 `engine.js` 的 `LOCAL` 表里注册实现函数即可。

---

## 三、9 个真正可用的本地工具

| 工具 | 实现方式 | 说明 |
| --- | --- | --- |
| 图片压缩 | Canvas 重编码 | 轻/标准/极限三档，输出 JPG |
| 图片格式转换 | Canvas `toBlob` / `toDataURL` | JPG / PNG / WebP 互转，可填白底 |
| 图片转 PDF | jsPDF | 多图合成，可选 A4 排版与原图尺寸 |
| PDF 转图片 | pdf.js + Canvas | 逐页渲染 PNG，多页自动打包 ZIP |
| PDF 合并 | pdf-lib | 按选择顺序拼接 |
| PDF 拆分 | pdf-lib | 每 1/2/5 页一组，打包 ZIP |
| 文本转 PDF | Canvas 排版 → jsPDF | 中文完整支持，自动换行分页 |
| Markdown 转 PDF | 同上 + 轻量 MD 解析 | 标题、列表、引用、代码块分层 |
| 图片转文字 | Tesseract.js | 浏览器内 OCR，首次需下载模型 |

### 为什么文本类 PDF 要"画"出来？

jsPDF 内置的 14 种标准字体**不含中文**，直接 `doc.text('中文')` 会输出乱码。
所以文本类工具先用 Canvas 按 A4 尺寸排版（2 倍分辨率）再嵌进 PDF。
代价是文字不可选中，换来的是中文、标点、换行、分页全部正确。
如果需要可复制文字的 PDF，就得在服务端嵌入中文字体（比如思源黑体子集）。

---

## 四、5 个需要服务端的工具

`Word 转 PDF`、`PDF 转 Word`、`Excel 转 PDF`、`PPT 转 PDF`、`PDF 加密`。

Office 的版式解析依赖真正的渲染引擎，浏览器做不到。这些工具在界面上标了「需服务端」，点击时会给出说明。

在 **设置 → 转换服务** 里填入地址后即可启用，接口约定：

```
POST {你的地址}/convert        Content-Type: multipart/form-data

  file     文件本体（多文件时重复该字段）
  tool     工具 id，如 word2pdf
  options  JSON 字符串，如 {"quality":1}

成功响应：
{
  "code": 0,
  "name": "报告.pdf",
  "url": "https://.../output.pdf",   // 需要允许跨域读取
  "size": 238123
}
失败响应：
{ "code": 1001, "message": "文件已损坏" }
```

后端推荐组合：`LibreOffice + unoconv`（Office→PDF）、`pdf2docx`（PDF→Word）、`qpdf`（加密）。一个装好 LibreOffice 的容器就能覆盖大部分场景。

---

## 五、几个实现细节

- **WebP 编码走 `toDataURL`**：部分内核里 `canvas.toBlob('image/webp')` 不回调，会卡死流程。这里改成同步的 `toDataURL` 并校验前缀，同时给 `toBlob` 加了 4 秒兜底。
- **pdf.js 的 worker 必须同源**：CDN 的 worker 会被跨域策略拦掉，`getDocument` 会永远不返回。所以 `pdf.worker.min.js` 放在 `assets/vendor/` 下，路径由 `document.currentScript` 推导。
- **拖拽即识别**：首页把文件拖进来，会按扩展名自动匹配工具（PDF→转图片、图片→压缩、DOCX→Word转PDF…），再跳到对应页面并带上文件。
- **动效曲线统一** `cubic-bezier(0.22, 1, 0.36, 1)`；卡片进场有 30ms 阶梯延迟。
- **进度条**用缓动逼近 92%，真实完成后再冲到 100%，不会出现"瞬间跳到 100 再干等"的割裂感。
- **响应式**：1440 三列 → 1024 两列 → 640 单列；移动端操作按钮常显（桌面端 hover 才出现）。

---

## 六、浏览器支持

Chrome / Edge / Safari 15+ / Firefox 90+。

- WebP 导出：Safari 14+ 支持
- `backdrop-filter`：不支持时自动降级为半透明背景
- OCR 与 PDF 渲染依赖 WebAssembly / Worker，需要较新的内核
