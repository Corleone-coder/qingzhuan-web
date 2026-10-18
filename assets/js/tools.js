/* ============================================================
   轻转 Web · 工具清单
   mode: 'local'  —— 纯浏览器完成，文件不上传
   mode: 'server' —— 需要服务端渲染（Word/Excel/PPT 解析）
   ============================================================ */
(function () {
  'use strict';

  var CATEGORIES = [
    { key: 'all', name: '全部' },
    { key: 'image', name: '图片' },
    { key: 'pdf', name: 'PDF' },
    { key: 'doc', name: 'Office' },
    { key: 'other', name: '其他' }
  ];

  var TOOLS = [
    {
      id: 'compress',
      name: '图片压缩',
      short: '图片压缩',
      cat: 'image',
      from: 'image',
      to: 'jpg',
      glyph: 'IMG',
      theme: 'amber',
      mode: 'local',
      accept: ['jpg', 'jpeg', 'png', 'webp', 'bmp'],
      acceptText: 'JPG / PNG / WebP / BMP',
      desc: 'Canvas 重编码，体积极速瘦身，画质几乎无损',
      options: [
        { key: 'quality', label: '压缩强度', type: 'segment', values: ['轻', '标准', '极限'], value: 1 }
      ]
    },
    {
      id: 'imgformat',
      name: '图片格式转换',
      short: 'JPG ⇄ PNG',
      cat: 'image',
      from: 'image',
      to: 'png',
      glyph: 'JPG',
      theme: 'teal',
      mode: 'local',
      accept: ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif'],
      acceptText: 'JPG / PNG / WebP / BMP / GIF',
      desc: 'JPG、PNG、WebP 互转，支持透明背景处理',
      options: [
        { key: 'target', label: '目标格式', type: 'segment', values: ['PNG', 'JPG', 'WebP'], value: 0 },
        { key: 'white', label: '透明区填充白色', type: 'switch', value: true }
      ]
    },
    {
      id: 'img2pdf',
      name: '图片转 PDF',
      short: '图片 → PDF',
      cat: 'image',
      from: 'image',
      to: 'pdf',
      glyph: 'IMG',
      theme: 'pink',
      mode: 'local',
      multiple: true,
      accept: ['jpg', 'jpeg', 'png', 'webp', 'bmp'],
      acceptText: 'JPG / PNG / WebP（可多选）',
      desc: '多张图片按顺序合成一份 PDF，支持 A4 排版',
      options: [
        { key: 'paper', label: '纸张尺寸', type: 'segment', values: ['原图尺寸', 'A4'], value: 1 },
        { key: 'margin', label: '添加页边距', type: 'switch', value: true }
      ]
    },
    {
      id: 'pdf2img',
      name: 'PDF 转图片',
      short: 'PDF → 图片',
      cat: 'pdf',
      from: 'pdf',
      to: 'png',
      glyph: 'PDF',
      theme: 'cyan',
      mode: 'local',
      accept: ['pdf'],
      acceptText: 'PDF 文件',
      desc: '逐页渲染为高清 PNG，可打包成 ZIP 下载',
      options: [
        { key: 'dpi', label: '清晰度', type: 'segment', values: ['普通', '高清', '超清'], value: 1 },
        { key: 'zip', label: '多页打包为 ZIP', type: 'switch', value: true }
      ]
    },
    {
      id: 'merge',
      name: 'PDF 合并',
      short: 'PDF 合并',
      cat: 'pdf',
      from: 'pdf',
      to: 'pdf',
      glyph: 'MG',
      theme: 'slate',
      mode: 'local',
      multiple: true,
      accept: ['pdf'],
      acceptText: '多个 PDF 文件',
      desc: '多份 PDF 按选择顺序合并成一份',
      options: []
    },
    {
      id: 'split',
      name: 'PDF 拆分',
      short: 'PDF 拆分',
      cat: 'pdf',
      from: 'pdf',
      to: 'pdf',
      glyph: 'SP',
      theme: 'rose',
      mode: 'local',
      accept: ['pdf'],
      acceptText: 'PDF 文件',
      desc: '按页数拆成多个小文件，打包下载',
      options: [
        { key: 'step', label: '拆分方式', type: 'segment', values: ['每页一个', '每 2 页', '每 5 页'], value: 0 }
      ]
    },
    {
      id: 'txt2pdf',
      name: '文本转 PDF',
      short: 'TXT → PDF',
      cat: 'other',
      from: 'txt',
      to: 'pdf',
      glyph: 'TXT',
      theme: 'green',
      mode: 'local',
      accept: ['txt', 'md', 'markdown', 'log', 'csv', 'json'],
      acceptText: 'TXT / MD / CSV / JSON / LOG',
      desc: '自动换行分页，长文本也能排得整齐',
      options: [
        { key: 'size', label: '字号', type: 'segment', values: ['小', '中', '大'], value: 1 }
      ]
    },
    {
      id: 'md2pdf',
      name: 'Markdown 转 PDF',
      short: 'MD → PDF',
      cat: 'other',
      from: 'md',
      to: 'pdf',
      glyph: 'MD',
      theme: 'sky',
      mode: 'local',
      accept: ['md', 'markdown', 'txt'],
      acceptText: 'Markdown 文件（.md / .markdown）',
      desc: '标题、列表、引用、代码块按排版层级还原',
      options: [
        { key: 'toc', label: '生成目录', type: 'switch', value: false }
      ]
    },
    {
      id: 'ocr',
      name: '图片转文字',
      short: 'OCR 识别',
      cat: 'image',
      from: 'image',
      to: 'txt',
      glyph: 'OCR',
      theme: 'indigo',
      mode: 'local',
      accept: ['jpg', 'jpeg', 'png', 'webp', 'bmp'],
      acceptText: 'JPG / PNG / WebP',
      desc: '浏览器内 OCR，首次使用需加载识别模型',
      heavy: true,
      options: [
        { key: 'lang', label: '识别语言', type: 'segment', values: ['中英混合', '纯英文'], value: 0 }
      ]
    },

    /* ---------- 需要服务端 ---------- */
    {
      id: 'word2pdf',
      name: 'Word 转 PDF',
      short: 'Word → PDF',
      cat: 'doc',
      from: 'doc',
      to: 'pdf',
      glyph: 'W',
      theme: 'blue',
      mode: 'server',
      accept: ['doc', 'docx'],
      acceptText: 'Word 文档（.doc / .docx）',
      desc: '保留原始排版、字体与图片位置',
      options: [
        { key: 'quality', label: '输出清晰度', type: 'segment', values: ['标准', '高清'], value: 1 }
      ]
    },
    {
      id: 'pdf2word',
      name: 'PDF 转 Word',
      short: 'PDF → Word',
      cat: 'pdf',
      from: 'pdf',
      to: 'docx',
      glyph: 'PDF',
      theme: 'violet',
      mode: 'server',
      accept: ['pdf'],
      acceptText: 'PDF 文件',
      desc: '可编辑文本，段落与表格自动还原',
      options: [
        { key: 'mode', label: '还原模式', type: 'segment', values: ['版式优先', '编辑优先'], value: 1 }
      ]
    },
    {
      id: 'excel2pdf',
      name: 'Excel 转 PDF',
      short: 'Excel → PDF',
      cat: 'doc',
      from: 'xls',
      to: 'pdf',
      glyph: 'X',
      theme: 'green',
      mode: 'server',
      accept: ['xls', 'xlsx', 'csv'],
      acceptText: '表格文件（.xls / .xlsx / .csv）',
      desc: '表格完整分页，不截断行列',
      options: [
        { key: 'fit', label: '缩放到一页宽', type: 'switch', value: true }
      ]
    },
    {
      id: 'ppt2pdf',
      name: 'PPT 转 PDF',
      short: 'PPT → PDF',
      cat: 'doc',
      from: 'ppt',
      to: 'pdf',
      glyph: 'P',
      theme: 'orange',
      mode: 'server',
      accept: ['ppt', 'pptx'],
      acceptText: '演示文稿（.ppt / .pptx）',
      desc: '一页一屏，动画转为静态页',
      options: [
        { key: 'note', label: '包含备注页', type: 'switch', value: false }
      ]
    },
    {
      id: 'pdfcrypt',
      name: 'PDF 加密',
      short: 'PDF 加密',
      cat: 'pdf',
      from: 'pdf',
      to: 'pdf',
      glyph: 'LCK',
      theme: 'violet',
      mode: 'server',
      accept: ['pdf'],
      acceptText: 'PDF 文件',
      desc: '添加打开密码，保护文件隐私',
      options: [
        { key: 'level', label: '加密强度', type: 'segment', values: ['标准', '高强度'], value: 1 }
      ]
    }
  ];

  window.QZ = window.QZ || {};
  window.QZ.CATEGORIES = CATEGORIES;
  window.QZ.TOOLS = TOOLS;
  window.QZ.getTool = function (id) {
    for (var i = 0; i < TOOLS.length; i++) {
      if (TOOLS[i].id === id) return TOOLS[i];
    }
    return null;
  };
  window.QZ.extOf = function (name) {
    var m = /\.([a-zA-Z0-9]+)$/.exec(name || '');
    return m ? m[1].toLowerCase() : '';
  };
})();
