/* 顧家醫療集團｜年度目標與 PDP 線上填寫系統 — 前端 */
(function () {
  const { FORMS, STATUS, renderTab, validate, printDoc, weightTotal, esc } = window.GUForms;
  const $app = document.getElementById('app');
  const $nav = document.getElementById('topnav');
  const FALLBACK_API = 'https://script.google.com/macros/s/AKfycbxVqh1xY-bBL6CyNB_3J14HTTmxB9GPtvyJvDTeH2YG-LiyzhLcxbHy2_L-5-zzLwaEqA/exec';
  const CFG = window.GU_CONFIG;
  const CFG_URL = CFG && CFG.API_URL;
  const API = (CFG_URL && /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(CFG_URL)) ? CFG_URL : FALLBACK_API;

  const store = {
    get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  };
  const S = { token: store.get('gu_token'), me: null, year: Number(store.get('gu_year')) || null, form: null, dirty: false };

  /* ---------- utils ---------- */
  function toast(msg, bad) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.className = 'toast show' + (bad ? ' bad' : '');
    clearTimeout(toast._t); toast._t = setTimeout(() => { t.className = 'toast' + (bad ? ' bad' : ''); }, bad ? 4500 : 2600);
  }
  const chip = (st, label) => `<span class="chip ${st || 'draft'}">${esc(label || STATUS[st || 'draft'])}</span>`;
  const head = (title, sub, badge) => `<div class="pagehead">${badge ? `<span class="badge">${esc(badge)}</span>` : ''}<h1>${esc(title)}</h1>${sub ? `<div class="sub">${sub}</div>` : ''}</div>`;
  const loading = () => { $app.innerHTML = '<div class="spinner">載入中…</div>'; };

  async function api(action, payload) {
    if (!API) throw new Error('尚未設定後端網址');
    const body = Object.assign({ action, token: S.token }, payload || {});
    let res;
    try {
      res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), redirect: 'follow' });
    } catch (e) { throw new Error('連線失敗，請確認網路後再試'); }
    let j;
    try { j = await res.json(); } catch (e) { throw new Error('伺服器回應格式錯誤'); }
    if (!j.ok) {
      if (/登入已逾時|帳號已停用/.test(j.error || '')) { logoutLocal(); location.hash = '#/login'; }
      throw new Error(j.error || '發生錯誤');
    }
    return j.data;
  }

  function logoutLocal() { S.token = null; S.me = null; store.set('gu_token', null); }

  function setNav() {
    if (!S.me) { $nav.innerHTML = ''; return; }
    const links = ['<a href="#/">我的表單</a>'];
    if (S.me.hasTeam || S.me.isHR) links.push(`<a href="#/team">${S.me.isHR ? '後台總覽' : '團隊總覽'}</a>`);
    links.push('<a href="#/password">修改密碼</a>', '<button type="button" id="logoutBtn">登出</button>');
    $nav.innerHTML = links.join('');
    document.getElementById('logoutBtn').onclick = async () => {
      if (S.dirty && !confirm('有尚未儲存的內容，確定要登出嗎？')) return;
      try { await api('logout'); } catch (e) { /* ignore */ }
      logoutLocal(); S.dirty = false; location.hash = '#/login';
    };
  }

  async function ensureMe(force) {
    if (!S.token) return false;
    if (S.me && !force) return true;
    S.me = await api('me', { year: S.year });
    if (!S.year) S.year = S.me.year;
    setNav();
    return true;
  }

  /* ---------- router ---------- */
  async function route() {
    const parts = (location.hash || '#/').slice(2).split('/');
    const view = parts[0] || '';
    try {
      if (view === 'login') return viewLogin();
      if (!(await ensureMe())) { location.hash = '#/login'; return; }
      if (view === '') return viewHome();
      if (view === 'form') return viewForm(parts[1], parts[2], parts[3]);
      if (view === 'print') return viewPrint(parts[1], parts[2]);
      if (view === 'team') return viewTeam();
      if (view === 'password') return viewPassword();
      location.hash = '#/';
    } catch (e) {
      $app.innerHTML = `<div class="card"><p class="err">${esc(e.message)}</p><a class="btn ghost" href="#/">回首頁</a></div>`;
    }
  }
  let lastHash = location.hash;
  window.addEventListener('hashchange', () => {
    if (S.dirty && !confirm('有尚未儲存的內容，離開後會遺失。確定要離開嗎？')) { history.replaceState(null, '', lastHash); return; }
    S.dirty = false; lastHash = location.hash; route();
  });
  window.addEventListener('beforeunload', e => { if (S.dirty) { e.preventDefault(); e.returnValue = ''; } });

  /* ---------- login ---------- */
  function viewLogin() {
    setNav();
    $app.innerHTML = `<div class="login">
      ${head('年度目標與 PDP', '請輸入姓名、生日與人力資源部提供的密碼')}
      <form class="card" id="loginForm" autocomplete="on">
        <div class="f" style="margin-bottom:12px"><label for="lname">姓名</label><input id="lname" type="text" autocomplete="name" required></div>
        <div class="f" style="margin-bottom:12px"><label for="lbd">生日</label><input id="lbd" type="date" required></div>
        <div class="f" style="margin-bottom:16px"><label for="lpw">密碼</label><input id="lpw" type="password" autocomplete="current-password" required></div>
        <p id="loginErr" class="err" role="alert"></p>
        <button class="btn" style="width:100%" type="submit">登入</button>
        <p class="muted center" style="font-size:13px;margin-top:14px">忘記密碼請聯絡人力資源部重設</p>
      </form></div>`;
    document.getElementById('loginForm').onsubmit = async ev => {
      ev.preventDefault();
      const btn = ev.target.querySelector('button'); btn.disabled = true;
      document.getElementById('loginErr').textContent = '';
      try {
        const r = await api('login', { name: document.getElementById('lname').value, birthday: document.getElementById('lbd').value, password: document.getElementById('lpw').value });
        S.token = r.token; store.set('gu_token', r.token); S.me = null; S.year = null; store.set('gu_year', null);
        location.hash = '#/';
      } catch (e) { document.getElementById('loginErr').textContent = e.message; btn.disabled = false; }
    };
  }

  /* ---------- home ---------- */
  function stageChips(form, status) {
    const F = FORMS[form];
    return `<div class="chips">${F.stages.map(s => `<span title="${esc(F.stageLabel[s])}：${esc(STATUS[status[s] || 'draft'])}">${chip(status[s], F.short[s])}</span>`).join('')}</div>`;
  }

  function nextStep(form, status) {
    const F = FORMS[form];
    for (const s of F.stages) {
      const st = status[s] || 'draft';
      if (st === 'ret') return `${F.stageLabel[s]}被退回，請修改後再送出`;
      if (st === 'draft') return `下一步：${F.stageLabel[s]}`;
      if (st === 'pm' || st === 'pa') return `${F.stageLabel[s]}：${STATUS[st]}`;
    }
    return '本年度已全部完成';
  }

  async function viewHome() {
    loading();
    await ensureMe(true);
    const m = S.me, u = m.user;
    let h = head(`${u.name}，您好`, `${esc(u.dept)}　${esc(u.title)}｜年度 ${m.year}`);
    h += '<div class="section"><span>我的表單</span></div>';
    const cards = [];
    [['F01', u.f01], ['F02', u.f02]].forEach(([f, need]) => {
      if (!need) return;
      const F = FORMS[f], st = m.myStatus[f] || {};
      cards.push(`<div class="card"><h3>${F.code}｜${F.title}</h3>${stageChips(f, st)}
        <p class="muted" style="margin:10px 0">${esc(nextStep(f, st))}</p>
        <div class="btns"><a class="btn" href="#/form/${f}/${u.id}">開啟填寫</a><a class="btn ghost" href="#/print/${f}/${u.id}">列印</a></div></div>`);
    });
    h += cards.length ? cards.join('') : '<div class="card muted">本年度沒有需要您填寫的表單。</div>';
    if (m.todo.length) {
      h += `<div class="section"><span>待我簽核</span><small>${m.todo.length} 件</small></div><div class="tablewrap"><table class="list"><tr><th>姓名</th><th>部門</th><th>表單</th><th>階段</th><th>狀態</th><th></th></tr>`;
      m.todo.forEach(t => {
        const F = FORMS[t.form], tab = F.tabs.find(x => x.stages.includes(t.stage)).id;
        h += `<tr><td>${esc(t.name)}</td><td>${esc(t.dept)}</td><td>${F.code}</td><td>${esc(F.stageLabel[t.stage])}</td><td>${chip(t.status)}</td><td><a class="btn ghost" href="#/form/${t.form}/${t.empId}/${tab}">前往簽核</a></td></tr>`;
      });
      h += '</table></div>';
    }
    if (m.hasTeam || m.isHR) h += `<p style="margin-top:16px"><a class="btn ghost" href="#/team">${m.isHR ? '後台總覽：全部人員' : '團隊總覽：我的部屬'}</a></p>`;
    $app.innerHTML = h;
  }

  /* ---------- form ---------- */
  async function viewForm(form, empId, tabId) {
    if (!FORMS[form]) { location.hash = '#/'; return; }
    loading();
    const r = await api('getForm', { form, empId, year: S.year });
    const F = FORMS[form];
    tabId = tabId && F.tabs.some(t => t.id === tabId) ? tabId : F.tabs[0].id;
    const data = Object.assign({}, r.data);
    const ctx = {
      form, year: r.year, emp: r.emp, rel: r.rel, status: r.status, data, history: r.history, approvers: r.approvers,
      v: k => (data[k] == null ? '' : String(data[k])),
      canEdit(key) {
        const [stage, owner] = key.split('.');
        const st = r.status[stage] || 'draft';
        if (owner === 'e') return r.rel.self && (st === 'draft' || st === 'ret');
        if (owner === 'm') return r.rel.manager && st === 'pm';
        return false;
      },
      stageBar: s => stageBar(ctx, s)
    };
    S.form = ctx;
    const who = r.rel.self ? '' : `｜${esc(r.emp.name)}（${esc(r.emp.dept)}）`;
    let h = head(`${F.title}`, `${F.code}｜年度 ${r.year}${who}`, '①格式表格');
    h += `<div class="toolbar no-print"><a class="btn ghost" href="#/print/${form}/${r.emp.id}">列印／匯出</a>${r.rel.self ? '' : `<a class="btn ghost" href="#/team">回總覽</a>`}</div>`;
    h += `<nav class="tabs" aria-label="分頁">${F.tabs.map(t => {
      const sts = t.stages.map(s => r.status[s] || 'draft');
      const flag = sts.includes('ret') ? 'ret' : sts.some(x => x === 'pm' || x === 'pa') ? 'pm' : sts.every(x => x === 'ok') ? 'ok' : '';
      return `<a href="#/form/${form}/${r.emp.id}/${t.id}" class="${t.id === tabId ? 'on' : ''}">${esc(t.label)}${flag ? chip(flag, flag === 'ok' ? '✓' : flag === 'ret' ? '退回' : '待簽') : ''}</a>`;
    }).join('')}</nav>`;
    h += `<div id="tabbody">${renderTab(ctx, tabId)}</div>`;
    $app.innerHTML = h;
    bindForm(ctx, tabId);
  }

  function stageBar(ctx, s) {
    const F = FORMS[ctx.form], st = ctx.status[s] || 'draft', rel = ctx.rel;
    const hist = (ctx.history || []).filter(x => x.stage === s);
    let actions = '';
    if (rel.self && (st === 'draft' || st === 'ret')) {
      actions = `<div class="btns"><button class="btn ghost" data-act="save" data-stage="${s}">儲存草稿</button><button class="btn" data-act="submit" data-stage="${s}">送出給主管</button></div>`;
    } else if ((st === 'pm' && rel.manager) || (st === 'pa' && ctx.approvers[s] && ctx.approvers[s].me)) {
      const okLabel = st === 'pm' ? '確認' : '核定';
      actions = `<textarea data-comment="${s}" placeholder="意見（退回時必填）"></textarea>
        <div class="btns">${st === 'pm' ? `<button class="btn ghost" data-act="msave" data-stage="${s}">儲存評定</button>` : ''}<button class="btn" data-act="ok" data-stage="${s}">${okLabel}</button><button class="btn danger" data-act="ret" data-stage="${s}">退回修改</button></div>`;
    } else if (st === 'pm') actions = `<span class="muted">等待直屬主管（${esc(ctx.emp.managerName || '—')}）確認</span>`;
    else if (st === 'pa') actions = `<span class="muted">等待核定</span>`;
    if (rel.hr && st !== 'draft') actions += `<div class="btns" style="margin-top:8px"><button class="btn ghost" data-act="reopen" data-stage="${s}">人資：重新開放此階段</button></div>`;
    const lastRet = hist.filter(x => /退回/.test(x.action)).pop();
    return `<div class="stagebar"><div class="row"><div class="title">${esc(F.stageLabel[s])} ${chip(st)}</div></div>
      ${st === 'ret' && lastRet ? `<p class="err" style="margin:8px 0 0">退回原因：${esc(lastRet.comment || '—')}（${esc(lastRet.actor)}）</p>` : ''}
      <div style="margin-top:8px">${actions}</div>
      ${hist.length ? `<ul class="hist">${hist.map(x => `<li>${esc(x.time)}　<b>${esc(x.actor)}</b> ${esc(x.action)}${x.comment ? `：${esc(x.comment)}` : ''}</li>`).join('')}</ul>` : ''}</div>`;
  }

  function collect(ctx, prefix) {
    const p = {};
    Object.keys(ctx.data).forEach(k => { if (k.indexOf(prefix) === 0) p[k] = ctx.data[k]; });
    return p;
  }

  function bindForm(ctx, tabId) {
    const body = document.getElementById('tabbody');
    const onInput = ev => {
      const el = ev.target;
      const box = el.closest('[data-type="qs"]');
      if (box) {
        ctx.data[box.dataset.key] = [...box.querySelectorAll('input:checked')].map(x => x.value).join(',');
      } else if (el.dataset.key) {
        ctx.data[el.dataset.key] = el.value;
      } else return;
      S.dirty = true;
      const key = (box || el).dataset.key;
      if (key === 'annual.e.type') {
        const t = window.GUForms.TYPES.find(x => x[0] === el.value);
        const d = document.getElementById('typeDesc'); if (d) d.textContent = t ? t[1] : '選擇後顯示說明';
      }
      const m = key.match(/^(Q\ds)\.e\.g\d\.weight$/);
      if (m) {
        const tot = weightTotal(ctx, m[1]);
        const el2 = body.querySelector(`[data-total="${m[1]}"]`);
        if (el2) { el2.textContent = `權重合計：${tot.sum}%`; el2.className = 'total' + (tot.count && tot.sum !== 100 ? ' bad' : ''); }
      }
    };
    body.addEventListener('input', onInput);
    body.addEventListener('change', onInput);
    body.addEventListener('click', async ev => {
      const b = ev.target.closest('button[data-act]');
      if (!b) return;
      const s = b.dataset.stage, act = b.dataset.act;
      const commentEl = body.querySelector(`[data-comment="${s}"]`);
      const comment = commentEl ? commentEl.value.trim() : '';
      const base = { form: ctx.form, empId: ctx.emp.id, year: ctx.year, stage: s };
      try {
        if (act === 'submit' || act === 'ok') {
          const err = validate(ctx, s, act === 'submit' ? 'e' : (ctx.status[s] === 'pm' ? 'm' : 'a'));
          if (err) { toast(err, true); return; }
        }
        if (act === 'ret' && !comment) { toast('退回時請填寫原因', true); commentEl && commentEl.focus(); return; }
        if (act === 'submit' && !confirm('送出後就不能再修改，除非主管退回。確定送出？')) return;
        if (act === 'reopen' && !confirm('重新開放後，本人可以再次修改並重新送出。確定？')) return;
        b.disabled = true;
        if (act === 'save') await api('save', Object.assign(base, { patch: collect(ctx, `${s}.e.`) }));
        if (act === 'msave') await api('save', Object.assign(base, { patch: collect(ctx, `${s}.m.`) }));
        if (act === 'submit') await api('submit', Object.assign(base, { patch: collect(ctx, `${s}.e.`) }));
        if (act === 'ok' || act === 'ret') {
          const role = ctx.status[s] === 'pm' ? 'm' : 'a';
          await api('review', Object.assign(base, { decision: act, comment, patch: collect(ctx, `${s}.${role}.`) }));
        }
        if (act === 'reopen') await api('reopen', base);
        S.dirty = false;
        toast({ save: '已儲存草稿', msave: '已儲存評定', submit: '已送出', ok: '已完成簽核', ret: '已退回', reopen: '已重新開放' }[act]);
        await viewForm(ctx.form, ctx.emp.id, tabId);
        S.me = null;
      } catch (e) { toast(e.message, true); b.disabled = false; }
    });
  }

  /* ---------- print ---------- */
  async function viewPrint(form, empId) {
    if (!FORMS[form]) { location.hash = '#/'; return; }
    loading();
    const r = await api('getForm', { form, empId, year: S.year });
    const data = r.data;
    const ctx = { form, year: r.year, emp: r.emp, status: r.status, history: r.history, v: k => (data[k] == null ? '' : String(data[k])) };
    $app.innerHTML = `<div class="toolbar no-print"><button class="btn" id="printBtn">列印／另存 PDF</button><a class="btn ghost" href="#/form/${form}/${r.emp.id}">回到表單</a></div>${printDoc(ctx)}`;
    document.getElementById('printBtn').onclick = () => window.print();
  }

  /* ---------- team / admin ---------- */
  async function viewTeam() {
    loading();
    const r = await api('list', { year: S.year });
    const depts = [...new Set(r.rows.map(x => x.dept).filter(Boolean))];
    let h = head(r.isHR ? '後台總覽' : '團隊總覽', r.isHR ? '全部人員的填寫與簽核進度' : '您的部屬與需要您核定的同仁');
    h += `<div class="toolbar no-print">
      <input type="text" id="q" placeholder="搜尋姓名或員工編號" aria-label="搜尋">
      <select id="dept" aria-label="部門"><option value="">全部部門</option>${depts.map(d => `<option>${esc(d)}</option>`).join('')}</select>
      ${r.isHR ? `<select id="year" aria-label="年度">${r.years.map(y => `<option${y === r.year ? ' selected' : ''}>${y}</option>`).join('')}</select>` : ''}
      <button class="btn ghost" id="csv">匯出 CSV</button></div>`;
    h += `<div class="tablewrap"><table class="list" id="tbl"><thead><tr><th>員工編號</th><th>姓名</th><th>部門</th><th>職稱</th><th>F01 年度目標</th><th>F02 PDP</th><th></th></tr></thead><tbody></tbody></table></div>`;
    h += `<p class="muted" style="font-size:13px">狀態縮寫：年＝年度目標、Q1初／Q1末＝季初設定／季末回顧、計畫＝PDP 計畫設定。灰色＝未送出、黃色＝待簽核、綠色＝已完成、紅色＝退回。</p>`;
    $app.innerHTML = h;
    const tbody = $app.querySelector('#tbl tbody');
    const draw = () => {
      const q = document.getElementById('q').value.trim(), d = document.getElementById('dept').value;
      const rows = r.rows.filter(x => (!q || x.name.includes(q) || x.id.includes(q)) && (!d || x.dept === d));
      tbody.innerHTML = rows.map(x => `<tr><td class="nw">${esc(x.id)}</td><td class="nw">${esc(x.name)}</td><td class="nw">${esc(x.dept)}</td><td class="nw">${esc(x.title)}</td>
        <td>${x.f01 ? stageChips('F01', x.status.F01) : '<span class="muted">不需填寫</span>'}</td>
        <td>${x.f02 ? stageChips('F02', x.status.F02) : '<span class="muted">不需填寫</span>'}</td>
        <td class="nw">${x.f01 ? `<a class="btn ghost sm" href="#/form/F01/${esc(x.id)}">F01</a> <a class="btn ghost sm" href="#/print/F01/${esc(x.id)}" title="列印 F01">列印</a>` : ''}${x.f02 ? `<br><a class="btn ghost sm" href="#/form/F02/${esc(x.id)}">F02</a> <a class="btn ghost sm" href="#/print/F02/${esc(x.id)}" title="列印 F02">列印</a>` : ''}</td></tr>`).join('') || '<tr><td colspan="7" class="muted">沒有符合的人員</td></tr>';
    };
    draw();
    document.getElementById('q').oninput = draw;
    document.getElementById('dept').onchange = draw;
    const y = document.getElementById('year');
    if (y) y.onchange = () => { S.year = Number(y.value); store.set('gu_year', S.year); S.me = null; viewTeam(); };
    document.getElementById('csv').onclick = () => {
      const cols = ['員工編號', '姓名', '部門', '職稱'];
      FORMS.F01.stages.forEach(s => cols.push('F01 ' + FORMS.F01.stageLabel[s]));
      FORMS.F02.stages.forEach(s => cols.push('F02 ' + FORMS.F02.stageLabel[s]));
      const lines = [cols];
      r.rows.forEach(x => {
        const line = [x.id, x.name, x.dept, x.title];
        FORMS.F01.stages.forEach(s => line.push(x.f01 ? STATUS[x.status.F01[s] || 'draft'] : '不需填寫'));
        FORMS.F02.stages.forEach(s => line.push(x.f02 ? STATUS[x.status.F02[s] || 'draft'] : '不需填寫'));
        lines.push(line);
      });
      const csv = '﻿' + lines.map(l => l.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      a.download = `GU_goal_status_${r.year}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
    };
  }

  /* ---------- password ---------- */
  function viewPassword() {
    $app.innerHTML = `<div class="login">${head('修改密碼', '新密碼 6–20 個字元')}
      <form class="card" id="pwForm">
        <div class="f" style="margin-bottom:12px"><label for="p0">目前的密碼</label><input id="p0" type="password" autocomplete="current-password" required></div>
        <div class="f" style="margin-bottom:12px"><label for="p1">新密碼</label><input id="p1" type="password" autocomplete="new-password" required></div>
        <div class="f" style="margin-bottom:16px"><label for="p2">再輸入一次新密碼</label><input id="p2" type="password" autocomplete="new-password" required></div>
        <p id="pwErr" class="err" role="alert"></p><button class="btn" style="width:100%" type="submit">更新密碼</button></form></div>`;
    document.getElementById('pwForm').onsubmit = async ev => {
      ev.preventDefault();
      const e = document.getElementById('pwErr'), p1 = document.getElementById('p1').value;
      if (p1 !== document.getElementById('p2').value) { e.textContent = '兩次輸入的新密碼不一致'; return; }
      try { await api('changePassword', { oldPassword: document.getElementById('p0').value, newPassword: p1 }); toast('密碼已更新'); location.hash = '#/'; }
      catch (x) { e.textContent = x.message; }
    };
  }

  route();
})();
