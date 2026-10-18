/* ============================================================
   轻转 Web · 应用主逻辑（hash 路由 + 视图渲染）
   ============================================================ */
(function () {
  'use strict';

  var QZ = window.QZ;
  var Store = QZ.Store;
  var Engine = QZ.Engine;
  var appEl = document.getElementById('app');
  var toastEl = document.getElementById('toast');
  var toastTimer = null;

  /* ---------------- 全局状态 ---------------- */
  var state = {
    cat: 'all',
    tool: null,
    files: [],
    options: {},
    converting: false
  };

  var pendingFiles = null; // 从首页拖入、待带进工具页的文件

  /* ---------------- 小工具 ---------------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('show');
    }, 2400);
  }

  function fmt(size) {
    return Store.formatSize(size);
  }

  function downloadBlob(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(url);
      if (a.parentNode) a.parentNode.removeChild(a);
    }, 4000);
  }

  function glyphClass(g) {
    return String(g).length > 1 ? ' multi' : '';
  }

  /* ---------------- 工具推断（首页拖入文件） ---------------- */
  function inferTool(files) {
    var ext = QZ.extOf(files[0].name);
    var map = {
      pdf: 'pdf2img',
      doc: 'word2pdf',
      docx: 'word2pdf',
      xls: 'excel2pdf',
      xlsx: 'excel2pdf',
      csv: 'excel2pdf',
      ppt: 'ppt2pdf',
      pptx: 'ppt2pdf',
      md: 'md2pdf',
      markdown: 'md2pdf',
      txt: 'txt2pdf',
      log: 'txt2pdf',
      json: 'txt2pdf'
    };
    if (map[ext]) return QZ.getTool(map[ext]);
    if (['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif'].indexOf(ext) > -1) {
      return QZ.getTool('compress');
    }
    return null;
  }

  /* ============================================================
     首页
     ============================================================ */
  function viewHome() {
    var tools = state.cat === 'all'
      ? QZ.TOOLS
      : QZ.TOOLS.filter(function (t) {
          return t.cat === state.cat;
        });

    var tabs = QZ.CATEGORIES.map(function (c) {
      return '<button class="tab' + (state.cat === c.key ? ' active' : '') + '" data-cat="' +
        c.key + '">' + c.name + '</button>';
    }).join('');

    var cards = tools.map(function (t) {
      return '' +
        '<div class="tool-card" data-tool="' + t.id + '">' +
          '<div class="tile th-' + t.theme + glyphClass(t.glyph) + '">' + esc(t.glyph) + '</div>' +
          '<div class="info">' +
            '<h3>' + esc(t.name) +
              '<span class="' + (t.mode === 'local' ? 'badge-local' : 'badge-server') + '">' +
                (t.mode === 'local' ? '本地' : '需服务端') +
              '</span>' +
            '</h3>' +
            '<p>' + esc(t.desc) + '</p>' +
          '</div>' +
          '<span class="go"></span>' +
        '</div>';
    }).join('');

    return '' +
    '<div class="view">' +
      '<section class="hero">' +
        '<div class="blob b1"></div><div class="blob b2"></div><div class="blob b3"></div>' +
        '<div class="container hero-inner">' +
          '<span class="eyebrow"><b>本地处理</b> · 文件不上传服务器</span>' +
          '<h1>把文件拖进来<br><span class="grad-txt">就转好了</span></h1>' +
          '<p class="lead">图片压缩、PDF 转图片、合并拆分、Markdown 排版……全部在浏览器里完成，速度取决于你的电脑，隐私留在你自己手上。</p>' +
          '<div class="hero-stats">' +
            '<div><b>' + QZ.TOOLS.length + '</b><span>个转换工具</span></div>' +
            '<div><b>9</b><span>个纯本地运行</span></div>' +
            '<div><b>0</b><span>个文件被上传</span></div>' +
          '</div>' +
        '</div>' +
      '</section>' +

      '<div class="container drop-wrap">' +
        '<div class="dropzone" id="dz">' +
          '<div class="drop-inner" id="dzInner">' +
            '<div class="drop-ico"></div>' +
            '<div class="drop-title">拖拽文件到这里</div>' +
            '<div class="drop-sub">或点击选择文件，我们会自动匹配对应的转换工具</div>' +
            '<div class="drop-formats">' +
              '<span class="fmt">PDF</span><span class="fmt">DOCX</span>' +
              '<span class="fmt">XLSX</span><span class="fmt">PPTX</span>' +
              '<span class="fmt">JPG</span><span class="fmt">PNG</span>' +
              '<span class="fmt">MD</span><span class="fmt">TXT</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<input type="file" id="homeFile" hidden multiple />' +
      '</div>' +

      '<div class="container">' +
        '<section class="section">' +
          '<div class="section-head">' +
            '<div>' +
              '<h2>全部工具</h2>' +
              '<p>选一个工具，或者直接把文件拖到上面</p>' +
            '</div>' +
            '<div class="tabs">' + tabs + '</div>' +
          '</div>' +
          '<div class="tool-grid stagger">' + cards + '</div>' +
        '</section>' +

        '<section class="section">' +
          '<div class="section-head"><div><h2>为什么是轻转</h2>' +
            '<p>没有注册、没有上传、没有等待队列</p></div></div>' +
          '<div class="feature-grid stagger">' +
            '<div class="feature"><div class="fi">🔒</div><h4>文件不出浏览器</h4>' +
              '<p>图片与 PDF 的处理全部由本地 Canvas 与 WebAssembly 完成，服务器从头到尾都接触不到你的文件。</p></div>' +
            '<div class="feature"><div class="fi">⚡</div><h4>没有上传等待</h4>' +
              '<p>省掉了上传和下载两个环节，几 MB 的文件基本是点完就出结果，断网也能继续用。</p></div>' +
            '<div class="feature"><div class="fi">🎯</div><h4>打开就能用</h4>' +
              '<p>不需要安装客户端，不需要注册账号，手机电脑打开网页即可，用完关掉不留痕迹。</p></div>' +
          '</div>' +
        '</section>' +
      '</div>' +
    '</div>';
  }

  function bindHome() {
    var dz = document.getElementById('dz');
    var input = document.getElementById('homeFile');
    if (!dz || !input) return;

    dz.addEventListener('click', function () {
      input.click();
    });

    input.addEventListener('change', function () {
      if (input.files && input.files.length) {
        handleIncoming(Array.prototype.slice.call(input.files));
      }
    });

    ['dragenter', 'dragover'].forEach(function (ev) {
      dz.addEventListener(ev, function (e) {
        e.preventDefault();
        e.stopPropagation();
        dz.classList.add('dragging');
      });
    });

    ['dragleave', 'drop'].forEach(function (ev) {
      dz.addEventListener(ev, function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (ev === 'dragleave' && dz.contains(e.relatedTarget)) return;
        dz.classList.remove('dragging');
      });
    });

    dz.addEventListener('drop', function (e) {
      var files = e.dataTransfer && e.dataTransfer.files;
      if (files && files.length) handleIncoming(Array.prototype.slice.call(files));
    });

    // 分类切换
    Array.prototype.forEach.call(document.querySelectorAll('[data-cat]'), function (btn) {
      btn.addEventListener('click', function () {
        state.cat = btn.getAttribute('data-cat');
        render();
      });
    });

    // 工具卡
    Array.prototype.forEach.call(document.querySelectorAll('[data-tool]'), function (card) {
      card.addEventListener('click', function () {
        location.hash = '#/tool/' + card.getAttribute('data-tool');
      });
    });
  }

  function handleIncoming(files) {
    var tool = inferTool(files);
    if (!tool) {
      toast('暂不支持 .' + QZ.extOf(files[0].name) + ' 格式');
      return;
    }
    pendingFiles = files;
    toast('已为你匹配「' + tool.name + '」');
    location.hash = '#/tool/' + tool.id;
  }

  /* ============================================================
     工具页
     ============================================================ */
  function outExt(tool, opts) {
    if (tool.id === 'imgformat') {
      return ['png', 'jpg', 'webp'][opts.target || 0];
    }
    return tool.to;
  }

  function viewTool(id) {
    var tool = QZ.getTool(id);
    if (!tool) {
      location.hash = '#/home';
      return '';
    }
    tool = JSON.parse(JSON.stringify(tool));
    state.tool = tool;
    state.files = [];
    state.options = {};
    tool.options.forEach(function (o) {
      state.options[o.key] = o.value;
    });

    if (pendingFiles && pendingFiles.length) {
      var accepted = pendingFiles.filter(function (f) {
        return tool.accept.indexOf(QZ.extOf(f.name)) > -1;
      });
      state.files = accepted;
      pendingFiles = null;
      if (!accepted.length) {
        toast('文件格式与「' + tool.name + '」不匹配');
      }
    }

    var serverNotice = tool.mode === 'server'
      ? '<div class="notice"><span>⚠️</span><div><b>该工具需要服务端渲染</b>' +
        'Word / Excel / PPT 的版式解析无法在浏览器内完成。你可以在「设置」里填入自己的转换服务地址，' +
        '其余 9 个工具全部本地运行。</div></div>'
      : '';

    return '' +
    '<div class="view page-tool">' +
      '<div class="container">' +
        '<a class="crumb" href="#/home"><i></i>返回全部工具</a>' +

        '<div class="tool-hero">' +
          '<div class="tile lg th-' + tool.theme + glyphClass(tool.glyph) + '">' + esc(tool.glyph) + '</div>' +
          '<div>' +
            '<h1>' + esc(tool.name) + '</h1>' +
            '<p>' + esc(tool.desc) + '</p>' +
          '</div>' +
        '</div>' +

        '<div class="tool-layout">' +
          '<div>' +
            serverNotice +
            '<div class="panel" style="margin-bottom:18px;">' +
              '<div class="panel-head"><h3>选择文件</h3>' +
                '<span>' + esc(tool.acceptText) + (tool.multiple ? ' · 可多选' : '') + '</span></div>' +
              '<div class="panel-body" id="fileArea"></div>' +
            '</div>' +

            (tool.options.length
              ? '<div class="panel">' +
                  '<div class="panel-head"><h3>转换设置</h3><span>默认已适配大多数场景</span></div>' +
                  '<div class="panel-body" id="optArea">' + optionsHTML(tool) + '</div>' +
                '</div>'
              : '') +
          '</div>' +

          '<div class="side-card">' +
            '<div class="panel">' +
              '<div class="panel-head"><h3>转换信息</h3><span id="fileCount"></span></div>' +
              '<div class="panel-body">' +
                '<div class="summary-row"><span class="k">输入文件</span><span class="v" id="sumIn">未选择</span></div>' +
                '<div class="summary-row"><span class="k">输出格式</span><span class="v" id="sumFmt">' +
                  outExt(tool, state.options).toUpperCase() + '</span></div>' +
                '<div class="summary-row"><span class="k">预计文件名</span><span class="v" id="sumName">—</span></div>' +
                '<button class="btn btn-primary btn-block" id="startBtn" style="margin-top:20px;" disabled>开始转换</button>' +
                '<div class="hint"><i></i><span>' +
                  (tool.mode === 'local'
                    ? '全程在本地完成，文件不会上传，关闭页面即自动清理'
                    : '文件将上传至你配置的转换服务') +
                '</span></div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<input type="file" id="toolFile" hidden ' + (tool.multiple ? 'multiple ' : '') +
        'accept="' + tool.accept.map(function (e) { return '.' + e; }).join(',') + '" />' +
    '</div>';
  }

  function optionsHTML(tool) {
    if (!tool.options.length) return '';
    return tool.options.map(function (o, i) {
      if (o.type === 'switch') {
        return '<div class="opt-row"><span class="opt-label">' + esc(o.label) + '</span>' +
          '<button class="switch' + (o.value ? ' on' : '') + '" data-switch="' + i + '"></button></div>';
      }
      return '<div class="opt-row"><span class="opt-label">' + esc(o.label) + '</span>' +
        '<div class="segment">' + o.values.map(function (v, vi) {
          return '<button class="seg-item' + (o.value === vi ? ' on' : '') + '" data-seg="' + i +
            '" data-val="' + vi + '">' + esc(v) + '</button>';
        }).join('') + '</div></div>';
    }).join('');
  }

  function bindTool() {
    var tool = state.tool;
    if (!tool) return;
    var input = document.getElementById('toolFile');
    var startBtn = document.getElementById('startBtn');

    renderFileArea();
    updateSummary();

    input.addEventListener('change', function () {
      if (input.files && input.files.length) {
        addFiles(Array.prototype.slice.call(input.files));
        input.value = '';
      }
    });

    // 选项交互
    Array.prototype.forEach.call(document.querySelectorAll('[data-seg]'), function (btn) {
      btn.addEventListener('click', function () {
        var i = Number(btn.getAttribute('data-seg'));
        var v = Number(btn.getAttribute('data-val'));
        var opt = tool.options[i];
        opt.value = v;
        state.options[opt.key] = v;
        Array.prototype.forEach.call(btn.parentNode.children, function (s) {
          s.classList.remove('on');
        });
        btn.classList.add('on');
        updateSummary();
      });
    });

    Array.prototype.forEach.call(document.querySelectorAll('[data-switch]'), function (btn) {
      btn.addEventListener('click', function () {
        var i = Number(btn.getAttribute('data-switch'));
        var opt = tool.options[i];
        opt.value = !opt.value;
        state.options[opt.key] = opt.value;
        btn.classList.toggle('on', opt.value);
        updateSummary();
      });
    });

    startBtn.addEventListener('click', startConvert);
  }

  function addFiles(list) {
    var tool = state.tool;
    var bad = [];
    list.forEach(function (f) {
      var ext = QZ.extOf(f.name);
      if (tool.accept.indexOf(ext) === -1) {
        bad.push(f.name);
        return;
      }
      state.files.push(f);
    });
    if (bad.length) {
      toast('已跳过 ' + bad.length + ' 个格式不符的文件');
    }
    if (!tool.multiple && state.files.length > 1) {
      state.files = state.files.slice(0, 1);
    }
    renderFileArea();
    updateSummary();
  }

  function renderFileArea() {
    var area = document.getElementById('fileArea');
    var tool = state.tool;
    if (!area || !tool) return;

    if (!state.files.length) {
      area.innerHTML =
        '<div class="uploader" id="uploader">' +
          '<div class="up-ico"></div>' +
          '<b>点击选择文件，或拖拽到这里</b>' +
          '<span>' + esc(tool.acceptText) + '</span>' +
        '</div>';
      var up = document.getElementById('uploader');
      up.addEventListener('click', function () {
        document.getElementById('toolFile').click();
      });
      ['dragenter', 'dragover'].forEach(function (ev) {
        up.addEventListener(ev, function (e) {
          e.preventDefault();
          up.classList.add('dragging');
        });
      });
      ['dragleave', 'drop'].forEach(function (ev) {
        up.addEventListener(ev, function (e) {
          e.preventDefault();
          up.classList.remove('dragging');
        });
      });
      up.addEventListener('drop', function (e) {
        var files = e.dataTransfer && e.dataTransfer.files;
        if (files && files.length) addFiles(Array.prototype.slice.call(files));
      });
      return;
    }

    area.innerHTML =
      '<div class="filelist">' +
        state.files.map(function (f, i) {
          return '<div class="filecard">' +
            '<div class="tile sm th-' + tool.theme + glyphClass(tool.glyph) + '">' + esc(tool.glyph) + '</div>' +
            '<div class="fc-info">' +
              '<div class="fc-name">' + esc(f.name) + '</div>' +
              '<div class="fc-meta">' + fmt(f.size) + ' · ' + QZ.extOf(f.name).toUpperCase() + '</div>' +
            '</div>' +
            '<button class="icon-btn" data-remove="' + i + '"></button>' +
          '</div>';
        }).join('') +
      '</div>' +
      (tool.multiple
        ? '<button class="btn btn-ghost" id="addMore" style="margin-top:14px;height:42px;font-size:13.5px;">继续添加文件</button>'
        : '');

    Array.prototype.forEach.call(area.querySelectorAll('[data-remove]'), function (btn) {
      btn.addEventListener('click', function () {
        state.files.splice(Number(btn.getAttribute('data-remove')), 1);
        renderFileArea();
        updateSummary();
      });
    });

    var more = document.getElementById('addMore');
    if (more) {
      more.addEventListener('click', function () {
        document.getElementById('toolFile').click();
      });
    }
  }

  function updateSummary() {
    var tool = state.tool;
    if (!tool) return;
    var sumIn = document.getElementById('sumIn');
    var sumFmt = document.getElementById('sumFmt');
    var sumName = document.getElementById('sumName');
    var count = document.getElementById('fileCount');
    var startBtn = document.getElementById('startBtn');
    if (!sumIn) return;

    if (!state.files.length) {
      sumIn.textContent = '未选择';
      sumName.textContent = '—';
      count.textContent = '';
      startBtn.disabled = true;
    } else {
      sumIn.textContent = state.files.length === 1
        ? state.files[0].name
        : state.files.length + ' 个文件';
      var base = state.files[0].name.replace(/\.[^.]+$/, '');
      sumName.textContent = base + '.' + outExt(tool, state.options);
      count.textContent = state.files.length > 1 ? state.files.length + ' 个' : '';
      startBtn.disabled = false;
    }
    sumFmt.textContent = outExt(tool, state.options).toUpperCase();
  }

  /* ---------------- 转换流程 ---------------- */
  function startConvert() {
    if (state.converting || !state.files.length) return;
    var tool = state.tool;

    if (tool.mode === 'server' && !Store.getSettings().serverBase) {
      showServerModal();
      return;
    }

    state.converting = true;
    var panel = showProgress(tool);
    var t0 = performance.now();
    var shown = 0;
    var done = false;

    // 缓动逼近目标值：未完成时逼近 92%，完成后快速冲到 100%
    var timer = setInterval(function () {
      var target = done ? 100 : 92;
      shown += (target - shown) * (done ? 0.24 : 0.07);
      if (done && shown > 99.4) shown = 100;
      if (!done && shown > 92) shown = 92;
      panel.set(Math.round(shown));
    }, 60);

    Engine.run(tool, state.files, state.options, function (v) {
      if (!done && v > shown) shown = v;
      panel.set(Math.round(shown));
    })
      .then(function (results) {
        done = true;
        var wait = Math.max(560, 900 - (performance.now() - t0));
        var cost = (performance.now() - t0 + wait) / 1000;
        setTimeout(function () {
          clearInterval(timer);
          panel.close();
          state.converting = false;
          showResult(tool, results, cost);
          if (Store.getSettings().keepHistory) saveRecord(tool, results);
        }, wait);
      })
      .catch(function (err) {
        clearInterval(timer);
        panel.close();
        state.converting = false;
        if (err && err.code === 'NEED_SERVER') {
          showServerModal();
        } else {
          showError(err && err.message ? err.message : '转换失败，请重试');
        }
      });
  }

  function saveRecord(tool, results) {
    var total = results.reduce(function (s, r) {
      return s + (r.blob ? r.blob.size : 0);
    }, 0);
    Store.addHistory({
      id: Store.uid(),
      toolId: tool.id,
      toolName: tool.name,
      theme: tool.theme,
      glyph: tool.glyph,
      fileName: state.files.length === 1 ? state.files[0].name : state.files.length + ' 个文件',
      outName: results.length === 1
        ? results[0].name
        : results[0].name + ' 等 ' + results.length + ' 个',
      outSize: total,
      time: Date.now(),
      mode: tool.mode
    });
  }

  /* ---------------- 进度弹窗 ---------------- */
  function showProgress(tool) {
    var overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML =
      '<div class="modal">' +
        '<div class="loader"><div class="pulse"></div><div class="pulse"></div>' +
          '<div class="core' + glyphClass(tool.glyph) + '">' + esc(tool.glyph) + '</div></div>' +
        '<div class="pct"><span id="pctNum">0</span><small>%</small></div>' +
        '<div class="pstatus" id="pctStatus">正在读取文件<em>...</em></div>' +
        '<div class="bar"><div class="bar-fill" id="barFill"></div></div>' +
        '<div class="modal-note">转换在本地进行，请不要关闭页面</div>' +
      '</div>';
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    var num = overlay.querySelector('#pctNum');
    var status = overlay.querySelector('#pctStatus');
    var fill = overlay.querySelector('#barFill');
    var lastStep = -1;

    var steps = ['正在读取文件', '正在解析内容', '正在转换格式', '正在生成文件'];

    return {
      set: function (v, fromEngine) {
        if (v < 0) v = 0;
        if (v > 100) v = 100;
        num.textContent = v;
        fill.style.width = v + '%';
        var idx = v < 20 ? 0 : v < 50 ? 1 : v < 85 ? 2 : 3;
        if (idx !== lastStep) {
          lastStep = idx;
          status.innerHTML = steps[idx] + '<em>...</em>';
        }
        if (v >= 100) status.innerHTML = '完成';
      },
      close: function () {
        document.body.style.overflow = '';
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }
    };
  }

  /* ---------------- 结果弹窗 ---------------- */
  function showResult(tool, results, cost) {
    var autoDl = Store.getSettings().autoDownload;
    var overlay = document.createElement('div');
    overlay.className = 'overlay';

    var items = results.map(function (r, i) {
      return '<div class="result-item" style="animation-delay:' + (i * 0.05) + 's">' +
        '<div class="tile sm th-' + tool.theme + glyphClass(tool.glyph) + '">' + esc(tool.glyph) + '</div>' +
        '<div class="ri-info">' +
          '<div class="ri-name">' + esc(r.name) + '</div>' +
          '<div class="ri-meta">' + fmt(r.blob.size) + '</div>' +
        '</div>' +
        '<button class="dl-btn" data-dl="' + i + '">下载</button>' +
      '</div>';
    }).join('');

    overlay.innerHTML =
      '<div class="modal">' +
        '<button class="modal-close" data-close></button>' +
        '<div class="check">✓</div>' +
        '<h2>转换完成</h2>' +
        '<div class="sub">共 ' + results.length + ' 个文件 · 用时 ' + cost.toFixed(1) + ' 秒</div>' +
        '<div class="result-list">' + items + '</div>' +
        '<div class="modal-actions">' +
          '<button class="btn btn-ghost" data-again>再转一个</button>' +
          '<button class="btn btn-primary" data-download-all>' +
            (results.length > 1 ? '全部下载' : '下载文件') + '</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    function close() {
      document.body.style.overflow = '';
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }

    overlay.querySelector('[data-close]').addEventListener('click', close);
    overlay.querySelector('[data-again]').addEventListener('click', function () {
      close();
      state.files = [];
      renderFileArea();
      updateSummary();
    });
    overlay.querySelector('[data-download-all]').addEventListener('click', function () {
      results.forEach(function (r, i) {
        setTimeout(function () {
          downloadBlob(r.blob, r.name);
        }, i * 320);
      });
      toast('已开始下载 ' + results.length + ' 个文件');
    });

    Array.prototype.forEach.call(overlay.querySelectorAll('[data-dl]'), function (btn) {
      btn.addEventListener('click', function () {
        var r = results[Number(btn.getAttribute('data-dl'))];
        downloadBlob(r.blob, r.name);
      });
    });

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });

    if (autoDl) {
      setTimeout(function () {
        downloadBlob(results[0].blob, results[0].name);
      }, 500);
    }
  }

  function showError(msg) {
    var overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML =
      '<div class="modal">' +
        '<button class="modal-close" data-close></button>' +
        '<div class="check" style="background:linear-gradient(135deg,#fda4af,#e11d48);box-shadow:0 16px 34px -14px rgba(225,29,72,.9);">!</div>' +
        '<h2>转换失败</h2>' +
        '<div class="sub" style="margin-top:10px;line-height:1.7;">' + esc(msg) + '</div>' +
        '<div class="modal-actions"><button class="btn btn-primary" data-close style="flex:1">知道了</button></div>' +
      '</div>';
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    function close() {
      document.body.style.overflow = '';
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }
    Array.prototype.forEach.call(overlay.querySelectorAll('[data-close]'), function (b) {
      b.addEventListener('click', close);
    });
  }

  function showServerModal() {
    var overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML =
      '<div class="modal">' +
        '<button class="modal-close" data-close></button>' +
        '<div class="check" style="background:linear-gradient(135deg,#fcd34d,#f59e0b);box-shadow:0 16px 34px -14px rgba(245,158,11,.9);">⚙</div>' +
        '<h2>这个格式需要服务端</h2>' +
        '<div class="sub" style="margin-top:10px;line-height:1.75;text-align:left;">' +
          'Word、Excel、PPT 的版式解析依赖 Office 渲染引擎，浏览器里做不到。<br><br>' +
          '你可以在「设置」里填入自己的转换服务地址，接口契约：' +
          '<code style="background:#f4f6fc;padding:2px 6px;border-radius:5px;font-size:11.5px;">POST {地址}/convert</code>' +
        '</div>' +
        '<div class="modal-actions">' +
          '<button class="btn btn-ghost" data-close>稍后</button>' +
          '<button class="btn btn-primary" id="goSettings">去设置</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    function close() {
      document.body.style.overflow = '';
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }
    Array.prototype.forEach.call(overlay.querySelectorAll('[data-close]'), function (b) {
      b.addEventListener('click', close);
    });
    overlay.querySelector('#goSettings').addEventListener('click', function () {
      close();
      location.hash = '#/settings';
    });
  }

  /* ============================================================
     记录页
     ============================================================ */
  function viewHistory() {
    var list = Store.getHistory();
    var totalSize = list.reduce(function (s, i) {
      return s + (i.outSize || 0);
    }, 0);
    var week = list.filter(function (i) {
      return i.time > Date.now() - 7 * 86400000;
    }).length;

    var body;
    if (!list.length) {
      body =
        '<div class="panel"><div class="empty">' +
          '<div class="art"><div class="back"></div><div class="front"><i></i><i></i><i></i></div></div>' +
          '<h3>还没有转换记录</h3>' +
          '<p>选一个工具，体验一次「点完就出结果」</p>' +
          '<a class="btn btn-primary" href="#/home">去转换</a>' +
        '</div></div>';
    } else {
      body = '<div class="panel"><div style="padding:8px 6px;">' +
        list.map(function (r) {
          return '<div class="record">' +
            '<div class="tile sm th-' + r.theme + glyphClass(r.glyph) + '">' + esc(r.glyph) + '</div>' +
            '<div class="rc-info">' +
              '<div class="rc-name">' + esc(r.outName) + '</div>' +
              '<div class="rc-meta">' +
                '<span>' + esc(r.toolName) + '</span><span class="dot">·</span>' +
                '<span>' + fmt(r.outSize) + '</span><span class="dot">·</span>' +
                '<span>' + Store.dateText(r.time) + ' ' + Store.timeText(r.time) + '</span>' +
                (r.mode === 'server' ? '<span class="dot">·</span><span>服务端</span>' : '') +
              '</div>' +
            '</div>' +
            '<div class="rc-actions">' +
              '<button class="dl-btn" data-retry="' + r.toolId + '">再转一次</button>' +
              '<button class="icon-btn" data-del="' + r.id + '"></button>' +
            '</div>' +
          '</div>';
        }).join('') +
      '</div></div>';
    }

    return '' +
    '<div class="view page-simple">' +
      '<div class="container">' +
        '<h1 class="page-title">转换记录</h1>' +
        '<p class="page-desc">只记录转换信息，文件本身不会被保存</p>' +
        '<div class="stat-row">' +
          '<div class="stat-box"><b>' + list.length + '</b><span>累计转换</span></div>' +
          '<div class="stat-box"><b>' + week + '</b><span>最近 7 天</span></div>' +
          '<div class="stat-box"><b>' + fmt(totalSize) + '</b><span>输出总体积</span></div>' +
        '</div>' +
        body +
        (list.length ? '<div style="margin-top:18px;text-align:center;">' +
          '<button class="btn btn-ghost" id="clearAll" style="height:42px;font-size:13.5px;">清空全部记录</button></div>' : '') +
      '</div>' +
    '</div>';
  }

  function bindHistory() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-del]'), function (btn) {
      btn.addEventListener('click', function () {
        Store.removeHistory(btn.getAttribute('data-del'));
        render();
        toast('已删除');
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-retry]'), function (btn) {
      btn.addEventListener('click', function () {
        location.hash = '#/tool/' + btn.getAttribute('data-retry');
      });
    });
    var clear = document.getElementById('clearAll');
    if (clear) {
      clear.addEventListener('click', function () {
        Store.clearHistory();
        render();
        toast('记录已清空');
      });
    }
  }

  /* ============================================================
     设置页
     ============================================================ */
  function viewSettings() {
    var s = Store.getSettings();
    var localCount = QZ.TOOLS.filter(function (t) {
      return t.mode === 'local';
    }).length;

    return '' +
    '<div class="view page-simple">' +
      '<div class="container" style="max-width:820px;">' +
        '<h1 class="page-title">设置</h1>' +
        '<p class="page-desc">' + localCount + ' 个工具本地运行，5 个需要服务端</p>' +

        '<div class="panel" style="margin-top:26px;">' +
          '<div class="panel-head"><h3>转换服务</h3><span>用于 Word / Excel / PPT 等格式</span></div>' +
          '<div class="setting-row">' +
            '<div class="sr-info">' +
              '<div class="sr-name">服务地址</div>' +
              '<div class="sr-desc">填入后，需服务端的工具会向 <code>地址/convert</code> 发起 POST 请求</div>' +
            '</div>' +
            '<input class="text-input" id="serverBase" placeholder="https://api.example.com" value="' + esc(s.serverBase) + '" />' +
          '</div>' +
        '</div>' +

        '<div class="panel" style="margin-top:18px;">' +
          '<div class="panel-head"><h3>偏好</h3></div>' +
          '<div class="setting-row">' +
            '<div class="sr-info"><div class="sr-name">转换完成后自动下载</div>' +
              '<div class="sr-desc">省去再点一次「下载」</div></div>' +
            '<button class="switch' + (s.autoDownload ? ' on' : '') + '" data-set="autoDownload"></button>' +
          '</div>' +
          '<div class="setting-row">' +
            '<div class="sr-info"><div class="sr-name">记录转换历史</div>' +
              '<div class="sr-desc">只保存在这台设备的浏览器里</div></div>' +
            '<button class="switch' + (s.keepHistory ? ' on' : '') + '" data-set="keepHistory"></button>' +
          '</div>' +
        '</div>' +

        '<div class="panel" style="margin-top:18px;">' +
          '<div class="panel-head"><h3>数据</h3></div>' +
          '<div class="setting-row">' +
            '<div class="sr-info"><div class="sr-name">清空本地数据</div>' +
              '<div class="sr-desc">删除转换记录与全部偏好设置</div></div>' +
            '<button class="btn btn-ghost" id="resetAll" style="height:38px;font-size:13px;">清空</button>' +
          '</div>' +
        '</div>' +

        '<div class="panel" style="margin-top:18px;">' +
          '<div class="panel-head"><h3>关于</h3><span>v1.0.0</span></div>' +
          '<div class="setting-row" style="display:block;">' +
            '<div class="sr-desc" style="line-height:1.85;">' +
              '轻转是一个纯前端实现的文档转换工具。图片与 PDF 的处理依赖 Canvas、pdf.js、pdf-lib、jsPDF，' +
              '全部在你的浏览器里运行，文件不会被上传到任何服务器。' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function bindSettings() {
    var input = document.getElementById('serverBase');
    if (input) {
      input.addEventListener('change', function () {
        Store.saveSettings({ serverBase: input.value.trim() });
        toast('服务地址已保存');
      });
    }
    Array.prototype.forEach.call(document.querySelectorAll('[data-set]'), function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-set');
        var s = Store.getSettings();
        var next = !s[key];
        Store.saveSettings({ [key]: next });
        btn.classList.toggle('on', next);
      });
    });
    var reset = document.getElementById('resetAll');
    if (reset) {
      reset.addEventListener('click', function () {
        Store.clearHistory();
        Store.saveSettings({ autoDownload: false, keepHistory: true, serverBase: '' });
        render();
        toast('已恢复默认设置');
      });
    }
  }

  /* ============================================================
     路由
     ============================================================ */
  function currentRoute() {
    var hash = location.hash || '#/home';
    var m = /^#\/tool\/([\w-]+)/.exec(hash);
    if (m) return { name: 'tool', id: m[1] };
    if (/^#\/history/.test(hash)) return { name: 'history' };
    if (/^#\/settings/.test(hash)) return { name: 'settings' };
    return { name: 'home' };
  }

  function setNav(name) {
    Array.prototype.forEach.call(document.querySelectorAll('[data-nav]'), function (a) {
      a.classList.toggle('active', a.getAttribute('data-nav') === name);
    });
  }

  function render() {
    // 切换页面时收起所有弹层，避免状态残留
    Array.prototype.forEach.call(document.querySelectorAll('.overlay'), function (o) {
      if (o.parentNode) o.parentNode.removeChild(o);
    });
    document.body.style.overflow = '';

    var r = currentRoute();
    var html = '';

    if (r.name === 'tool') {
      html = viewTool(r.id);
      if (!html) return;
      setNav('');
    } else if (r.name === 'history') {
      html = viewHistory();
      setNav('history');
    } else if (r.name === 'settings') {
      html = viewSettings();
      setNav('settings');
    } else {
      html = viewHome();
      setNav('home');
    }

    appEl.innerHTML = html;
    window.scrollTo(0, 0);

    if (r.name === 'tool') bindTool();
    else if (r.name === 'history') bindHistory();
    else if (r.name === 'settings') bindSettings();
    else bindHome();
  }

  window.addEventListener('hashchange', render);

  // 阻止浏览器在页面其它区域被拖入文件时直接打开它
  ['dragover', 'drop'].forEach(function (ev) {
    window.addEventListener(ev, function (e) {
      if (!e.target.closest || !e.target.closest('.dropzone, .uploader')) {
        e.preventDefault();
      }
    });
  });

  if (!location.hash) location.hash = '#/home';

  // 顶栏 CTA：不在首页时先回首页，再滚到工具区
  var cta = document.getElementById('headerCta');
  if (cta) {
    cta.addEventListener('click', function (e) {
      e.preventDefault();
      var goTools = function () {
        var el = document.querySelector('.section');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
      if (currentRoute().name !== 'home') {
        location.hash = '#/home';
        setTimeout(goTools, 160);
      } else {
        goTools();
      }
    });
  }

  render();
})();
