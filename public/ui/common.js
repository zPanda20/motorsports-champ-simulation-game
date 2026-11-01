// Small helpers shared by the pages: escaping, links between pages, tables, bars.

export const esc = (s) => String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// every name in the game is a link to its page
export const href = (kind, id) => `#/${kind}/${id}`;
export const link = (kind, id, text) => `<a class="lk" href="${href(kind, id)}">${esc(text)}</a>`;

export function table(head, rows, cls = '') {
  return `<table class="${cls}"><thead><tr>` + head.map((h) => `<th class="${h.num ? 'num' : ''}">${esc(typeof h === 'object' ? h.t : h)}</th>`).join('') + '</tr></thead><tbody>' +
    rows.map((r) => {
      const cells = Array.isArray(r) ? r : r.cells;
      return `<tr class="${Array.isArray(r) ? '' : r.cls || ''}"${!Array.isArray(r) && r.style ? ` style="${esc(r.style)}"` : ''}>` + cells.map((c, i) => `<td class="${head[i] && head[i].num ? 'num' : ''}">${c}</td>`).join('') + '</tr>';
    }).join('') + '</tbody></table>';
}

export function bar(v, max = 100, label) {
  const w = Math.max(0, Math.min(100, (v / max) * 100));
  return `<span class="meter" title="${esc(label || Math.round(v))}"><span style="width:${w.toFixed(0)}%"></span></span>`;
}

export function kv(pairs) {
  return '<dl class="kv">' + pairs.filter((p) => p && p[1] !== undefined && p[1] !== null && p[1] !== '').map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join('') + '</dl>';
}

export const panel = (title, body, cls = '') => `<section class="panel ${cls}">${title ? `<h3>${title}</h3>` : ''}${body}</section>`;
export const small = (s) => `<div class="small">${s}</div>`;
export const tag = (s, cls = '') => `<span class="tag ${cls}">${esc(s)}</span>`;

export const pct = (v) => Math.round(v * 100) + '%';
export const ordinal = (n) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };

export const NAT = (n) => esc(n);

// a rating shown as a coarse word in the early years, when nobody measured things exactly
export function band(v) {
  return v >= 80 ? 'exceptional' : v >= 68 ? 'very good' : v >= 56 ? 'good' : v >= 44 ? 'average' : v >= 32 ? 'poor' : 'weak';
}

// a row of links under a page title: [[href, label, on]]
export const subtabs = (items) => '<nav class="subtabs">' + items.map(([h, l, on]) => `<a href="${h}" class="${on ? 'on' : ''}">${esc(l)}</a>`).join('') + '</nav>';
