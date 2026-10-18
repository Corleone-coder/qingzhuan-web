/* ============================================================
   轻转 Web · 本地存储与格式化
   ============================================================ */
(function () {
  'use strict';

  var HISTORY_KEY = 'qz_web_history_v1';
  var SETTINGS_KEY = 'qz_web_settings_v1';

  var DEFAULT_SETTINGS = {
    autoDownload: false,
    keepHistory: true,
    serverBase: ''
  };

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      var val = JSON.parse(raw);
      return val == null ? fallback : val;
    } catch (e) {
      return fallback;
    }
  }

  function write(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
      return true;
    } catch (e) {
      return false;
    }
  }

  var Store = {
    getHistory: function () {
      var list = read(HISTORY_KEY, []);
      return Array.isArray(list) ? list : [];
    },

    addHistory: function (item) {
      var list = Store.getHistory();
      list.unshift(item);
      if (list.length > 200) list = list.slice(0, 200);
      write(HISTORY_KEY, list);
      return list;
    },

    removeHistory: function (id) {
      var list = Store.getHistory().filter(function (i) {
        return i.id !== id;
      });
      write(HISTORY_KEY, list);
      return list;
    },

    clearHistory: function () {
      write(HISTORY_KEY, []);
    },

    getSettings: function () {
      var s = read(SETTINGS_KEY, {});
      var out = {};
      for (var k in DEFAULT_SETTINGS) {
        out[k] = s[k] === undefined ? DEFAULT_SETTINGS[k] : s[k];
      }
      return out;
    },

    saveSettings: function (patch) {
      var next = Store.getSettings();
      for (var k in patch) next[k] = patch[k];
      write(SETTINGS_KEY, next);
      return next;
    },

    formatSize: function (bytes) {
      var n = Number(bytes) || 0;
      if (n < 1024) return n + ' B';
      if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
      if (n < 1073741824) return (n / 1048576).toFixed(1) + ' MB';
      return (n / 1073741824).toFixed(2) + ' GB';
    },

    timeText: function (ts) {
      var d = new Date(ts);
      var p = function (n) {
        return n < 10 ? '0' + n : '' + n;
      };
      return p(d.getHours()) + ':' + p(d.getMinutes());
    },

    dateText: function (ts) {
      var d = new Date(ts);
      var now = new Date();
      var start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      if (ts >= start) return '今天';
      if (ts >= start - 86400000) return '昨天';
      if (d.getFullYear() === now.getFullYear()) return d.getMonth() + 1 + ' 月 ' + d.getDate() + ' 日';
      return d.getFullYear() + ' 年 ' + (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日';
    },

    uid: function () {
      return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }
  };

  window.QZ = window.QZ || {};
  window.QZ.Store = Store;
})();
