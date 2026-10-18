/* ============================================================
   轻转 Web · 转换引擎
   所有 local 工具都在浏览器内完成，文件不上传。
   ============================================================ */
(function () {
  'use strict';

  var Store = window.QZ.Store;

  // 计算站点根路径，用于定位本地 pdf.worker
  var BASE = (function () {
    var s = document.currentScript;
    if (!s || !s.src) {
      var all = document.getElementsByTagName('script');
      s = all[all.length - 1];
    }
    var src = (s && s.src) || '';
    var idx = src.indexOf('/assets/js/engine.js');
    return idx > -1 ? src.slice(0, idx + 1) : './';
  })();

  function ensurePdfWorker() {
    if (window.pdfjsLib && !window.pdfjsLib.__qzWorkerSet) {
      // 用同源的 worker，避免跨域 Worker 被浏览器拦截
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = BASE + 'assets/vendor/pdf.worker.min.js';
      window.pdfjsLib.__qzWorkerSet = true;
    }
  }

  /* ---------------- 基础工具 ---------------- */

  function lib(name) {
    var ok = true;
    if (name === 'jspdf') ok = !!(window.jspdf && window.jspdf.jsPDF);
    if (name === 'pdflib') ok = !!window.PDFLib;
    if (name === 'pdfjs') ok = !!window.pdfjsLib;
    if (name === 'jszip') ok = !!window.JSZip;
    if (!ok) {
      throw new Error('依赖库「' + name + '」未能加载，请检查网络后刷新页面');
    }
  }

  function baseName(name) {
    return String(name || 'file').replace(/\.[^.]+$/, '');
  }

  function readBuffer(file) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () {
        resolve(new Uint8Array(fr.result));
      };
      fr.onerror = function () {
        reject(new Error('文件读取失败'));
      };
      fr.readAsArrayBuffer(file);
    });
  }

  function readText(file) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () {
        resolve(String(fr.result || ''));
      };
      fr.onerror = function () {
        reject(new Error('文件读取失败'));
      };
      fr.readAsText(file, 'UTF-8');
    });
  }

  function loadImage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('图片解析失败，可能是格式不受支持'));
      };
      img.src = url;
    });
  }

  function dataURLToBlob(dataUrl) {
    var parts = String(dataUrl).split(',');
    var mime = /:(.*?);/.exec(parts[0])[1];
    var bin = atob(parts[1]);
    var len = bin.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  function canvasToBlob(canvas, type, quality) {
    // WebP 走 toDataURL：同步、格式确定，且能避开部分内核 toBlob 不回调的问题
    if (type === 'image/webp') {
      try {
        var url = canvas.toDataURL(type, quality);
        if (url.indexOf('data:image/webp') !== 0) {
          return Promise.reject(new Error('当前浏览器不支持导出 WebP，请改用 PNG 或 JPG'));
        }
        return Promise.resolve(dataURLToBlob(url));
      } catch (e) {
        return Promise.reject(new Error('当前浏览器不支持导出 WebP'));
      }
    }

    return new Promise(function (resolve, reject) {
      var settled = false;

      function fallback() {
        try {
          resolve(dataURLToBlob(canvas.toDataURL(type, quality)));
        } catch (e) {
          reject(new Error('图片编码失败'));
        }
      }

      // 兜底：某些环境下 toBlob 可能不回调
      var timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        fallback();
      }, 4000);

      canvas.toBlob(
        function (blob) {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          if (blob) resolve(blob);
          else fallback();
        },
        type,
        quality
      );
    });
  }

  function imageToCanvas(img, fillWhite) {
    var canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    var ctx = canvas.getContext('2d');
    if (fillWhite) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0);
    return canvas;
  }

  function makeZip(entries) {
    lib('jszip');
    var zip = new window.JSZip();
    entries.forEach(function (e) {
      zip.file(e.name, e.blob);
    });
    return zip.generateAsync({ type: 'blob' }).then(function (blob) {
      return [{ name: entries[0].zipName || 'qingzhuan.zip', blob: blob }];
    });
  }

  /* ---------------- 图片类 ---------------- */

  function compress(files, opts, onProgress) {
    var q = [0.9, 0.72, 0.42][opts.quality || 0];
    if (q === undefined) q = 0.72;
    return loadImage(files[0]).then(function (img) {
      onProgress && onProgress(45);
      var canvas = imageToCanvas(img, true);
      onProgress && onProgress(70);
      return canvasToBlob(canvas, 'image/jpeg', q);
    }).then(function (blob) {
      return [
        {
          name: baseName(files[0].name) + '.jpg',
          blob: blob,
          originSize: files[0].size
        }
      ];
    });
  }

  function convertFormat(files, opts) {
    var targets = [
      { mime: 'image/png', ext: 'png' },
      { mime: 'image/jpeg', ext: 'jpg' },
      { mime: 'image/webp', ext: 'webp' }
    ];
    var t = targets[opts.target || 0] || targets[0];
    return loadImage(files[0]).then(function (img) {
      var canvas = imageToCanvas(img, t.ext === 'jpg' && opts.white !== false);
      return canvasToBlob(canvas, t.mime, 0.94);
    }).then(function (blob) {
      return [{ name: baseName(files[0].name) + '.' + t.ext, blob: blob }];
    });
  }

  function imagesToPdf(files, opts, onProgress) {
    lib('jspdf');
    var jsPDF = window.jspdf.jsPDF;
    var A4 = { w: 595.28, h: 841.89 };
    var margin = opts.margin === false ? 0 : 28;
    var doc = null;

    var chain = Promise.resolve();
    files.forEach(function (file, i) {
      chain = chain.then(function () {
        return loadImage(file).then(function (img) {
          var canvas = imageToCanvas(img, true);
          var dataUrl = canvas.toDataURL('image/jpeg', 0.92);
          var pw, ph, iw, ih, x, y;

          if (opts.paper === 0) {
            // 原图尺寸
            pw = canvas.width;
            ph = canvas.height;
            iw = pw;
            ih = ph;
            x = 0;
            y = 0;
          } else {
            pw = A4.w;
            ph = A4.h;
            var availW = pw - margin * 2;
            var availH = ph - margin * 2;
            var ratio = Math.min(availW / canvas.width, availH / canvas.height);
            iw = canvas.width * ratio;
            ih = canvas.height * ratio;
            x = (pw - iw) / 2;
            y = (ph - ih) / 2;
          }

          var fmt = [pw, ph];
          var orient = pw > ph ? 'landscape' : 'portrait';
          if (!doc) {
            doc = new jsPDF({ unit: 'pt', format: fmt, orientation: orient });
          } else {
            doc.addPage(fmt, orient);
          }
          doc.addImage(dataUrl, 'JPEG', x, y, iw, ih);
          onProgress && onProgress(Math.round(((i + 1) / files.length) * 85));
        });
      });
    });

    return chain.then(function () {
      var blob = doc.output('blob');
      return [{ name: baseName(files[0].name) + '.pdf', blob: blob }];
    });
  }

  function pdfToImages(files, opts, onProgress) {
    lib('pdfjs');
    ensurePdfWorker();
    var scale = [1.6, 2.4, 3.4][opts.dpi || 0] || 2.4;
    var nameBase = baseName(files[0].name);

    return readBuffer(files[0]).then(function (data) {
      return window.pdfjsLib.getDocument({ data: data }).promise;
    }).then(function (pdf) {
      var out = [];
      var chain = Promise.resolve();
      for (var p = 1; p <= pdf.numPages; p++) {
        (function (pageNo) {
          chain = chain.then(function () {
            return pdf.getPage(pageNo).then(function (page) {
              var viewport = page.getViewport({ scale: scale });
              var canvas = document.createElement('canvas');
              canvas.width = Math.floor(viewport.width);
              canvas.height = Math.floor(viewport.height);
              var ctx = canvas.getContext('2d');
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              return page
                .render({ canvasContext: ctx, viewport: viewport })
                .promise.then(function () {
                  return canvasToBlob(canvas, 'image/png');
                });
            }).then(function (blob) {
              out.push({
                name: nameBase + '_第' + pageNo + '页.png',
                blob: blob
              });
              onProgress && onProgress(Math.round((pageNo / pdf.numPages) * 80));
            });
          });
        })(p);
      }
      return chain.then(function () {
        if (out.length > 1 && opts.zip !== false) {
          return makeZip(
            out.map(function (f) {
              return { name: f.name, blob: f.blob, zipName: nameBase + '_图片.zip' };
            })
          );
        }
        return out;
      });
    });
  }

  /* ---------------- PDF 类 ---------------- */

  function mergePdf(files, opts, onProgress) {
    lib('pdflib');
    var PDFDocument = window.PDFLib.PDFDocument;

    return PDFDocument.create().then(function (out) {
      var chain = Promise.resolve();
      files.forEach(function (file, i) {
        chain = chain.then(function () {
          return readBuffer(file).then(function (bytes) {
            return PDFDocument.load(bytes, { ignoreEncryption: true });
          }).then(function (src) {
            return out.copyPages(src, src.getPageIndices());
          }).then(function (pages) {
            pages.forEach(function (p) {
              out.addPage(p);
            });
            onProgress && onProgress(Math.round(((i + 1) / files.length) * 82));
          });
        });
      });
      return chain.then(function () {
        return out.save();
      });
    }).then(function (bytes) {
      return [
        {
          name: '合并结果.pdf',
          blob: new Blob([bytes], { type: 'application/pdf' })
        }
      ];
    });
  }

  function splitPdf(files, opts, onProgress) {
    lib('pdflib');
    var PDFDocument = window.PDFLib.PDFDocument;
    var step = [1, 2, 5][opts.step || 0] || 1;
    var nameBase = baseName(files[0].name);

    return readBuffer(files[0]).then(function (bytes) {
      return PDFDocument.load(bytes, { ignoreEncryption: true });
    }).then(function (src) {
      var total = src.getPageCount();
      var out = [];
      var chain = Promise.resolve();
      var index = 0;

      for (var i = 0; i < total; i += step) {
        (function (start) {
          chain = chain.then(function () {
            return PDFDocument.create().then(function (doc) {
              var idx = [];
              for (var k = start; k < Math.min(start + step, total); k++) idx.push(k);
              return doc.copyPages(src, idx).then(function (pages) {
                pages.forEach(function (p) {
                  doc.addPage(p);
                });
                return doc.save();
              });
            }).then(function (bytes2) {
              index++;
              out.push({
                name: nameBase + '_' + index + '.pdf',
                blob: new Blob([bytes2], { type: 'application/pdf' })
              });
              onProgress && onProgress(Math.round((index / Math.ceil(total / step)) * 80));
            });
          });
        })(i);
      }

      return chain.then(function () {
        if (out.length > 1) {
          return makeZip(
            out.map(function (f) {
              return { name: f.name, blob: f.blob, zipName: nameBase + '_拆分.zip' };
            })
          );
        }
        return out;
      });
    });
  }

  /* ---------------- 文本排版引擎（Canvas → PDF） ---------------- */
  /* 用 Canvas 绘制再嵌入 PDF，可以完整支持中文与任意字体 */

  var FONT_STACK = '"PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", sans-serif';
  var PAGE_W = 595.28;
  var PAGE_H = 841.89;
  var MARGIN = 62;
  var SCALE = 2;

  function wrapText(ctx, text, maxWidth) {
    var lines = [];
    var line = '';
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (ch === '\n') {
        lines.push(line);
        line = '';
        continue;
      }
      var test = line + ch;
      if (ctx.measureText(test).width > maxWidth && line) {
        // 尝试在空格处断行，避免把英文单词劈开
        var sp = line.lastIndexOf(' ');
        if (sp > line.length * 0.55 && /[a-zA-Z0-9]/.test(ch)) {
          lines.push(line.slice(0, sp));
          line = line.slice(sp + 1) + ch;
        } else {
          lines.push(line);
          line = ch;
        }
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines.length ? lines : [''];
  }

  function blocksToPdf(blocks) {
    lib('jspdf');
    var jsPDF = window.jspdf.jsPDF;

    var canvas = document.createElement('canvas');
    canvas.width = PAGE_W * SCALE;
    canvas.height = PAGE_H * SCALE;
    var ctx = canvas.getContext('2d');
    ctx.scale(SCALE, SCALE);
    ctx.textBaseline = 'top';

    var pages = [];
    var y = MARGIN;
    var maxW = PAGE_W - MARGIN * 2;

    function paintBg() {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, PAGE_W, PAGE_H);
    }

    function newPage() {
      pages.push(canvas.toDataURL('image/jpeg', 0.94));
      paintBg();
      y = MARGIN;
    }

    paintBg();

    blocks.forEach(function (b) {
      y += b.gapBefore || 0;
      var size = b.size || 11;
      var weight = b.weight || 400;
      var family = b.mono ? '"SFMono-Regular", Consolas, "Courier New", monospace' : FONT_STACK;
      ctx.font = weight + ' ' + size + 'px ' + family;
      ctx.fillStyle = b.color || '#14161f';

      var indent = b.indent || 0;
      var lines = wrapText(ctx, b.text, maxW - indent);
      var lh = size * (b.lineHeight || 1.7);

      if (b.quote) {
        ctx.fillStyle = '#e3e8f4';
        ctx.fillRect(MARGIN + indent - 12, y, 3, lines.length * lh - 4);
        ctx.fillStyle = b.color || '#4b5563';
      }

      lines.forEach(function (line, li) {
        if (y + lh > PAGE_H - MARGIN) newPage();
        if (b.bullet && li === 0) {
          ctx.beginPath();
          ctx.arc(MARGIN + indent - 10, y + size * 0.62, 2, 0, Math.PI * 2);
          ctx.fillStyle = b.color || '#4c6fff';
          ctx.fill();
        }
        ctx.fillStyle = b.color || '#14161f';
        ctx.fillText(line, MARGIN + indent, y);
        y += lh;
      });

      y += b.gapAfter || 0;
    });

    pages.push(canvas.toDataURL('image/jpeg', 0.94));

    var doc = new jsPDF({ unit: 'pt', format: 'a4' });
    pages.forEach(function (dataUrl, i) {
      if (i > 0) doc.addPage();
      doc.addImage(dataUrl, 'JPEG', 0, 0, PAGE_W, PAGE_H);
    });
    return doc.output('blob');
  }

  function txtToBlocks(text, fontSize) {
    var size = [9.5, 11.5, 14][fontSize || 0] || 11.5;
    return text.replace(/\r\n/g, '\n').split('\n').map(function (line) {
      return { text: line || ' ', size: size, lineHeight: 1.75 };
    });
  }

  function mdToBlocks(text) {
    var blocks = [];
    var lines = text.replace(/\r\n/g, '\n').split('\n');
    var inCode = false;
    var codeBuf = [];

    lines.forEach(function (raw) {
      var line = raw;

      if (/^```/.test(line.trim())) {
        if (inCode) {
          blocks.push({
            text: codeBuf.join('\n'),
            size: 9.5,
            mono: true,
            color: '#334155',
            gapBefore: 6,
            gapAfter: 10,
            lineHeight: 1.55
          });
          codeBuf = [];
          inCode = false;
        } else {
          inCode = true;
        }
        return;
      }

      if (inCode) {
        codeBuf.push(line);
        return;
      }

      if (/^\s*$/.test(line)) {
        blocks.push({ text: ' ', size: 8, lineHeight: 1 });
        return;
      }

      var h1 = /^#\s+(.*)$/.exec(line);
      var h2 = /^##\s+(.*)$/.exec(line);
      var h3 = /^###\s+(.*)$/.exec(line);
      var quote = /^>\s?(.*)$/.exec(line);
      var bullet = /^\s*[-*+]\s+(.*)$/.exec(line);
      var ordered = /^\s*(\d+)\.\s+(.*)$/.exec(line);
      var hr = /^\s*(---|\*\*\*|___)\s*$/.test(line);

      if (h1) {
        blocks.push({ text: clean(h1[1]), size: 24, weight: 700, gapBefore: 14, gapAfter: 10, lineHeight: 1.4 });
      } else if (h2) {
        blocks.push({ text: clean(h2[1]), size: 17, weight: 700, gapBefore: 12, gapAfter: 7, lineHeight: 1.45 });
      } else if (h3) {
        blocks.push({ text: clean(h3[1]), size: 13.5, weight: 700, gapBefore: 10, gapAfter: 5, lineHeight: 1.5 });
      } else if (hr) {
        blocks.push({ text: ' ', size: 4, gapBefore: 6, gapAfter: 6 });
      } else if (quote) {
        blocks.push({
          text: clean(quote[1]),
          size: 11,
          color: '#6b7280',
          quote: true,
          indent: 16,
          gapBefore: 6,
          gapAfter: 8
        });
      } else if (bullet) {
        blocks.push({ text: clean(bullet[1]), size: 11.5, bullet: true, indent: 18, lineHeight: 1.7 });
      } else if (ordered) {
        blocks.push({
          text: ordered[1] + '. ' + clean(ordered[2]),
          size: 11.5,
          indent: 18,
          lineHeight: 1.7
        });
      } else {
        blocks.push({ text: clean(line), size: 11.5, lineHeight: 1.78 });
      }
    });

    if (codeBuf.length) {
      blocks.push({ text: codeBuf.join('\n'), size: 9.5, mono: true, color: '#334155', lineHeight: 1.55 });
    }
    return blocks;
  }

  function clean(s) {
    return String(s)
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/`(.+?)`/g, '$1')
      .replace(/\[(.+?)\]\((.+?)\)/g, '$1')
      .replace(/!\[.*?\]\(.*?\)/g, '');
  }

  function textToPdf(files, opts, isMd) {
    return readText(files[0]).then(function (text) {
      if (!text.trim()) throw new Error('文件内容为空');
      var blocks = isMd ? mdToBlocks(text) : txtToBlocks(text, opts.size);
      var blob = blocksToPdf(blocks);
      return [
        {
          name: baseName(files[0].name) + '.pdf',
          blob: blob
        }
      ];
    });
  }

  /* ---------------- OCR ---------------- */

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = function () {
        reject(new Error('识别引擎加载失败，请检查网络'));
      };
      document.head.appendChild(s);
    });
  }

  function ocr(files, opts, onProgress) {
    var lang = opts.lang === 1 ? 'eng' : 'chi_sim+eng';
    var ready = window.Tesseract
      ? Promise.resolve()
      : loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5.0.4/dist/tesseract.min.js');

    return ready.then(function () {
      onProgress && onProgress(8);
      return window.Tesseract.createWorker(lang, 1, {
        logger: function (m) {
          if (m.status === 'recognizing text') {
            onProgress && onProgress(15 + Math.round(m.progress * 78));
          } else if (m.progress) {
            onProgress && onProgress(8 + Math.round(m.progress * 6));
          }
        }
      });
    }).then(function (worker) {
      return worker.recognize(files[0]).then(function (res) {
        return worker.terminate().then(function () {
          return res;
        });
      });
    }).then(function (res) {
      var text = (res && res.data && res.data.text) || '';
      text = text.replace(/\n{3,}/g, '\n\n').trim();
      if (!text) throw new Error('没有识别到文字，换一张更清晰的图片试试');
      return [
        {
          name: baseName(files[0].name) + '.txt',
          blob: new Blob([text], { type: 'text/plain;charset=utf-8' }),
          preview: text.slice(0, 120)
        }
      ];
    });
  }

  /* ---------------- 服务端工具 ---------------- */

  function runServer(tool, files, opts) {
    var base = (Store.getSettings().serverBase || '').replace(/\/+$/, '');
    if (!base) {
      var err = new Error('该格式需要服务端渲染');
      err.code = 'NEED_SERVER';
      throw err;
    }
    var form = new FormData();
    files.forEach(function (f) {
      form.append('file', f, f.name);
    });
    form.append('tool', tool.id);
    form.append('options', JSON.stringify(opts));

    return fetch(base + '/convert', { method: 'POST', body: form })
      .then(function (r) {
        if (!r.ok) throw new Error('服务返回 ' + r.status);
        return r.json();
      })
      .then(function (data) {
        if (!data || data.code !== 0) {
          throw new Error((data && data.message) || '转换失败');
        }
        return fetch(data.url).then(function (r) {
          return r.blob();
        }).then(function (blob) {
          return [{ name: data.name || baseName(files[0].name) + '.' + tool.to, blob: blob }];
        });
      });
  }

  /* ---------------- 调度 ---------------- */

  var LOCAL = {
    compress: compress,
    imgformat: convertFormat,
    img2pdf: imagesToPdf,
    pdf2img: pdfToImages,
    merge: mergePdf,
    split: splitPdf,
    txt2pdf: function (f, o, p) {
      return textToPdf(f, o, false);
    },
    md2pdf: function (f, o, p) {
      return textToPdf(f, o, true);
    },
    ocr: ocr
  };

  function run(tool, files, opts, onProgress) {
    if (tool.mode === 'server') {
      return Promise.resolve().then(function () {
        return runServer(tool, files, opts);
      });
    }
    var fn = LOCAL[tool.id];
    if (!fn) return Promise.reject(new Error('该工具暂未实现'));
    return Promise.resolve().then(function () {
      return fn(files, opts || {}, onProgress);
    });
  }

  window.QZ.Engine = {
    run: run,
    isLocal: function (tool) {
      return tool.mode === 'local';
    }
  };
})();
