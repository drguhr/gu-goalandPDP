/* 表單定義、編輯畫面、列印畫面、送出前檢查 */
(function () {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const STATUS = { draft: '未送出', pm: '待主管確認', pa: '待核定', ok: '已完成', ret: '已退回' };
  const ACH = ['超越', '達成', '部分達成', '未達成'];
  const TYPES = [
    ['常態年度設定', '年初設定全年度目標，並於每季季初設定當季目標。'],
    ['前一年度到職｜沿用原計畫', '到職滿週年前沿用到職時設定的原計畫，滿週年後自行設定新目標至 12/31。沿用的目標照樣填入各季，「對應年度目標」選「沿用原計畫」。'],
    ['前一年度到職｜重新設定', '全年度自行設定新目標（1/1 至 12/31），可參考原計畫。'],
    ['當年度到職', '到職 3 個月內與直屬主管確認職位原設定的目標是否合適，並完成至 12/31 的年度目標與當季目標；10/1 以後到職者併入次年度設定。'],
    ['已有專案獎金里程碑', '季度里程碑即為季度目標，各季填寫里程碑摘要與權重即可。']
  ];
  const QDUE = { 1: '1/31（與年度目標一同設定）', 2: '4/15', 3: '7/15', 4: '10/15' };

  const FORMS = {
    F01: {
      id: 'F01', code: 'PDP-F01', title: '年度目標設定表', en: 'Goal Setting',
      stages: ['annual', 'Q1s', 'Q1e', 'Q2s', 'Q2e', 'Q3s', 'Q3e', 'Q4s', 'Q4e', 'year'],
      stageLabel: { annual: '年度目標', Q1s: 'Q1 季初設定', Q1e: 'Q1 季末回顧', Q2s: 'Q2 季初設定', Q2e: 'Q2 季末回顧', Q3s: 'Q3 季初設定', Q3e: 'Q3 季末回顧', Q4s: 'Q4 季初設定', Q4e: 'Q4 季末回顧', year: '年終回顧' },
      short: { annual: '年', Q1s: 'Q1初', Q1e: 'Q1末', Q2s: 'Q2初', Q2e: 'Q2末', Q3s: 'Q3初', Q3e: 'Q3末', Q4s: 'Q4初', Q4e: 'Q4末', year: '年終' },
      tabs: [
        { id: 'annual', label: '年度目標', stages: ['annual'] },
        { id: 'Q1', label: 'Q1', stages: ['Q1s', 'Q1e'] },
        { id: 'Q2', label: 'Q2', stages: ['Q2s', 'Q2e'] },
        { id: 'Q3', label: 'Q3', stages: ['Q3s', 'Q3e'] },
        { id: 'Q4', label: 'Q4', stages: ['Q4s', 'Q4e'] },
        { id: 'year', label: '年終回顧', stages: ['year'] }
      ]
    },
    F02: {
      id: 'F02', code: 'PDP-F02', title: '個人發展計畫表', en: 'Personal Development Plan',
      stages: ['plan', 'Q1', 'Q2', 'Q3', 'Q4'],
      stageLabel: { plan: '計畫設定', Q1: 'Q1 進度回顧', Q2: 'Q2 進度回顧', Q3: 'Q3 進度回顧', Q4: 'Q4 進度回顧（年終）' },
      short: { plan: '計畫', Q1: 'Q1', Q2: 'Q2', Q3: 'Q3', Q4: 'Q4' },
      tabs: [
        { id: 'plan', label: '發展計畫', stages: ['plan'] },
        { id: 'review', label: '季度回顧', stages: ['Q1', 'Q2', 'Q3', 'Q4'] }
      ]
    }
  };

  /* ---------- field helpers ---------- */
  function fld(ctx, key, label, type, opt) {
    opt = opt || {};
    const v = ctx.v(key);
    const id = 'k_' + key.replace(/[^\w]/g, '_');
    const cls = 'f' + (opt.full ? ' full' : '');
    const hint = opt.hint ? ` <span class="hint">${esc(opt.hint)}</span>` : '';
    if (!ctx.canEdit(key)) {
      let show = v;
      if (type === 'pct' && v !== '') show = v + '%';
      return `<div class="${cls}"><span class="lab">${esc(label)}</span><div class="ro${show === '' ? ' empty' : ''}" data-ro="${esc(key)}">${show === '' ? '—' : esc(show)}</div></div>`;
    }
    let input;
    if (type === 'textarea') input = `<textarea id="${id}" data-key="${esc(key)}" rows="${opt.rows || 3}" placeholder="${esc(opt.ph || '')}">${esc(v)}</textarea>`;
    else if (type === 'select') input = `<select id="${id}" data-key="${esc(key)}"><option value="">請選擇</option>${opt.options.map(o => { const val = Array.isArray(o) ? o[0] : o, lab = Array.isArray(o) ? o[1] : o; return `<option value="${esc(val)}"${val === v ? ' selected' : ''}>${esc(lab)}</option>`; }).join('')}</select>`;
    else if (type === 'pct') input = `<input id="${id}" type="number" inputmode="numeric" min="0" max="100" step="5" data-key="${esc(key)}" value="${esc(v)}" placeholder="%">`;
    else if (type === 'qs') {
      const set = v ? v.split(',') : [];
      input = `<div class="checks" data-key="${esc(key)}" data-type="qs">${['Q1', 'Q2', 'Q3', 'Q4'].map(q => `<label><input type="checkbox" value="${q}"${set.includes(q) ? ' checked' : ''}>${q}</label>`).join('')}</div>`;
      return `<div class="${cls}"><span class="lab">${esc(label)}${hint}</span>${input}</div>`;
    } else input = `<input id="${id}" type="text" data-key="${esc(key)}" value="${esc(v)}" placeholder="${esc(opt.ph || '')}">`;
    return `<div class="${cls}"><label for="${id}">${esc(label)}${hint}</label>${input}</div>`;
  }
  const ro = (label, val, full) => `<div class="f${full ? ' full' : ''}"><span class="lab">${esc(label)}</span><div class="ro${val ? '' : ' empty'}">${val ? esc(val) : '—'}</div></div>`;
  const section = (t, small) => `<div class="section"><span>${esc(t)}</span>${small ? `<small>${esc(small)}</small>` : ''}</div>`;

  function basicCard(ctx) {
    const e = ctx.emp;
    return `<div class="card"><div class="grid three">
      ${ro('姓名', e.name)}${ro('職稱', e.title)}${ro('部門／院區', e.dept)}
      ${ro('到職日', e.hireDate)}${ro('直屬主管', e.managerName)}${ro('核定者', ctx.form === 'F02' ? '人力資源部（計畫設定）' : (e.approverName || e.managerName))}
    </div></div>`;
  }

  function annualGoals(ctx) {
    const out = [];
    for (let n = 1; n <= 5; n++) {
      const g = ctx.v(`annual.e.g${n}.goal`);
      if (g) out.push([`第${n}項`, `第${n}項：${g.length > 18 ? g.slice(0, 18) + '…' : g}`]);
    }
    return out;
  }

  /* ---------- F01 tabs ---------- */
  function f01Annual(ctx) {
    const type = ctx.v('annual.e.type');
    const desc = (TYPES.find(t => t[0] === type) || [])[1] || '';
    let h = basicCard(ctx);
    h += section('一、設定類型');
    h += `<div class="card"><div class="grid">${fld(ctx, 'annual.e.type', '設定類型', 'select', { options: TYPES.map(t => t[0]) })}
      <div class="f"><span class="lab">說明</span><div class="ro" id="typeDesc">${esc(desc || '選擇後顯示說明')}</div></div></div></div>`;
    h += section('二、年度目標', '3–5 項｜主管・督導對應集團年度重點；其他同仁對應直屬主管的年度目標');
    for (let n = 1; n <= 5; n++) {
      h += `<div class="card"><h3><span class="goalno">${n}</span>第 ${n} 項${n > 3 ? '<span class="muted">（選填）</span>' : ''}</h3><div class="grid">
        ${fld(ctx, `annual.e.g${n}.target`, '對應目標', 'text', { ph: '例：集團重點「提升顧客體驗」／主管目標第 1 項' })}
        ${fld(ctx, `annual.e.g${n}.qs`, '主要推進季別', 'qs', { hint: '可複選' })}
        ${fld(ctx, `annual.e.g${n}.goal`, '年度目標', 'textarea', { hint: '今年要完成什麼', rows: 2 })}
        ${fld(ctx, `annual.e.g${n}.outcome`, '年底要看到的成果', 'textarea', { hint: '數字、交付物或期限', rows: 2 })}
      </div></div>`;
    }
    h += section('三、部門成效註記', '組織圖上有自己部門、有直屬部屬的主管填寫');
    h += `<div class="card"><div class="grid">
      ${fld(ctx, 'annual.e.dept.name', '部門', 'text')}${fld(ctx, 'annual.e.dept.count', '部屬人數', 'text')}
      ${fld(ctx, 'annual.e.dept.expect', '今年部門希望達到的成效', 'textarea', { full: true, hint: '供核定者年終評核參考' })}
      ${fld(ctx, 'annual.e.dept.links', '對應的年度目標項次', 'text', { ph: '例：第 1、3 項' })}
    </div></div>`;
    h += ctx.stageBar('annual');
    return h;
  }

  function f01Quarter(ctx, q) {
    const s = `Q${q}s`, e = `Q${q}e`;
    const opts = annualGoals(ctx).concat([['沿用原計畫', '沿用原計畫']]);
    let h = `<div class="note blue">季初設定：${QDUE[q]} 前完成｜季末回顧：季末當月底前完成。每季 3–5 項，權重合計 100%。</div>`;
    h += section(`Q${q} 季初設定`);
    for (let k = 1; k <= 5; k++) {
      h += `<div class="card"><h3><span class="goalno">${k}</span>第 ${k} 項${k > 3 ? '<span class="muted">（選填）</span>' : ''}</h3><div class="grid">
        ${fld(ctx, `${s}.e.g${k}.map`, '對應年度目標', 'select', { options: opts.length > 1 ? opts : [['第1項', '第1項'], ['第2項', '第2項'], ['第3項', '第3項'], ['第4項', '第4項'], ['第5項', '第5項'], ['沿用原計畫', '沿用原計畫']] })}
        ${fld(ctx, `${s}.e.g${k}.weight`, '權重（%）', 'pct')}
        ${fld(ctx, `${s}.e.g${k}.goal`, '本季目標', 'textarea', { hint: '這一季要完成什麼', rows: 2 })}
        ${fld(ctx, `${s}.e.g${k}.measure`, '衡量標準', 'textarea', { hint: '怎樣算達成', rows: 2 })}
      </div></div>`;
    }
    const tot = weightTotal(ctx, s);
    h += `<p><span class="total${tot.count && tot.sum !== 100 ? ' bad' : ''}" data-total="${s}">權重合計：${tot.sum}%</span></p>`;
    h += ctx.stageBar(s);

    h += section(`Q${q} 季末回顧`);
    if ((ctx.status[s] || 'draft') !== 'ok') {
      h += `<div class="note">季初設定完成簽核後，才能填寫季末回顧。</div>`;
      return h;
    }
    for (let k = 1; k <= 5; k++) {
      const goal = ctx.v(`${s}.e.g${k}.goal`);
      if (!goal) continue;
      h += `<div class="card"><h3><span class="goalno">${k}</span>${esc(goal)}</h3>
        <p class="muted" style="margin:-4px 0 10px">衡量標準：${esc(ctx.v(`${s}.e.g${k}.measure`) || '—')}｜權重 ${esc(ctx.v(`${s}.e.g${k}.weight`) || '—')}%</p><div class="grid">
        ${fld(ctx, `${e}.e.g${k}.result`, '實際成果', 'textarea', { hint: '數字、交付物或完成日期', rows: 2, full: false })}
        ${fld(ctx, `${e}.m.g${k}.ach`, '達成程度（主管評定）', 'select', { options: ACH })}
      </div></div>`;
    }
    h += `<div class="card"><div class="grid">
      ${fld(ctx, `${e}.m.overall`, '本季整體達成程度（主管評定）', 'select', { options: ACH })}
      ${fld(ctx, `${e}.m.comment`, '主管季末評語', 'textarea', { hint: '含下季提醒與調整方向', full: true })}
    </div></div>`;
    h += ctx.stageBar(e);
    return h;
  }

  function f01Year(ctx) {
    let h = section('一、四季結果彙整');
    h += '<div class="card">';
    for (let q = 1; q <= 4; q++) {
      h += `<div class="grid" style="margin-bottom:12px">
        ${fld(ctx, `year.e.qsum.Q${q}`, `Q${q} 重點成果摘要`, 'textarea', { rows: 2 })}
        ${ro(`Q${q} 整體達成程度（自動帶入）`, ctx.v(`Q${q}e.m.overall`))}
      </div>`;
    }
    h += '</div>';
    h += section('二、年度目標達成情形');
    for (let n = 1; n <= 5; n++) {
      const g = ctx.v(`annual.e.g${n}.goal`);
      if (!g) continue;
      h += `<div class="card"><h3><span class="goalno">${n}</span>${esc(g)}</h3>
        <p class="muted" style="margin:-4px 0 10px">年底要看到的成果：${esc(ctx.v(`annual.e.g${n}.outcome`) || '—')}</p><div class="grid">
        ${fld(ctx, `year.e.g${n}.result`, '年底實際成果', 'textarea', { rows: 2 })}
        ${fld(ctx, `year.m.g${n}.ach`, '達成程度（主管評定）', 'select', { options: ACH })}
      </div></div>`;
    }
    h += section('三、年度評定');
    h += '<div class="card"><div class="grid">';
    if (ctx.v('annual.e.dept.expect')) {
      h += ro('年初註記：部門希望達到的成效', ctx.v('annual.e.dept.expect'), true);
      h += fld(ctx, 'year.e.dept', '部門成效達成情形', 'textarea', { full: true });
    }
    h += fld(ctx, 'year.m.overall', '主管年度整體評定', 'select', { options: ACH });
    h += fld(ctx, 'year.m.comment', '主管年度評語', 'textarea', { full: true });
    h += '</div></div>';
    h += ctx.stageBar('year');
    return h;
  }

  /* ---------- F02 tabs ---------- */
  function f02Plan(ctx) {
    let h = basicCard(ctx);
    h += `<div class="note">PDP 規劃的是「能力的成長」，不納入考核，也不與獎金連動。請聚焦 2–3 項發展目標；行動計畫約 70% 來自工作中的實作、20% 向他人學習、10% 來自課程與閱讀。</div>`;
    h += section('一、我的職涯意向');
    h += `<div class="card"><div class="grid">
      ${fld(ctx, 'plan.e.dir', '職涯方向', 'select', { options: ['在現職持續發展', '考慮新的職位'] })}
      ${fld(ctx, 'plan.e.ready', '預計何時準備好', 'select', { options: ['0–12 個月內', '尚未準備好／12 個月以上'] })}
      ${fld(ctx, 'plan.e.newRole', '若考慮新職位，想從事的職務類型', 'textarea', { full: true, rows: 2 })}
    </div></div>`;
    h += section('二、我的發展重點');
    h += `<div class="card"><div class="grid">
      ${fld(ctx, 'plan.e.focus', '發展重點', 'select', { options: [['勝任', '勝任｜在現職站穩、做到熟練'], ['拓寬', '拓寬｜跨部門、跨領域學習'], ['深化', '深化｜成為領域專家、能指導他人']] })}
    </div></div>`;
    h += section('三、優勢與待發展領域');
    h += `<div class="card"><div class="grid">
      ${fld(ctx, 'plan.e.strengths', '我的優勢', 'textarea', { hint: '可以帶到目標上繼續發揮的能力' })}
      ${fld(ctx, 'plan.e.gaps', '我的待發展領域', 'textarea', { hint: '要達成職涯意向，還需要補強的能力' })}
    </div></div>`;
    h += section('四、我的發展計畫', '目標 1、2 必填，目標 3 選填');
    for (let n = 1; n <= 3; n++) {
      h += `<div class="card"><h3><span class="goalno">${n}</span>發展目標 ${n}</h3><div class="grid">
        ${fld(ctx, `plan.e.g${n}.obj`, '發展目標', 'textarea', { rows: 2, hint: '技能、知識或領導能力' })}
        ${fld(ctx, `plan.e.g${n}.cat`, '類別', 'select', { options: ['領導', '專業', '其他'] })}
        ${fld(ctx, `plan.e.g${n}.success`, '我的成果', 'textarea', { full: true, rows: 2, hint: '做到時，我能「做到、看到、聽到、說出」什麼' })}
      </div>`;
      for (let m = 1; m <= 3; m++) {
        h += `<div class="grid" style="margin-top:12px;padding-top:12px;border-top:1px dashed var(--line)">
          ${fld(ctx, `plan.e.g${n}.a${m}.act`, `行動 ${m}`, 'textarea', { rows: 2, full: true })}
          ${fld(ctx, `plan.e.g${n}.a${m}.method`, '學習方式', 'select', { options: ['實作', '向人學', '課程'] })}
          ${fld(ctx, `plan.e.g${n}.a${m}.measure`, '衡量方式', 'text')}
          ${fld(ctx, `plan.e.g${n}.a${m}.time`, '完成時程', 'text', { ph: '例：2027/6/30、每月' })}
        </div>`;
      }
      h += '</div>';
    }
    h += section('五、我需要的支持');
    h += `<div class="card"><div class="grid">
      ${fld(ctx, 'plan.e.who', '需要誰的協助', 'textarea', { rows: 2, hint: '直屬主管、導師或其他同仁' })}
      ${fld(ctx, 'plan.e.res', '需要的資源', 'textarea', { rows: 2, hint: '時間、預算、課程、輪調或代理機會' })}
    </div></div>`;
    h += ctx.stageBar('plan');
    return h;
  }

  function f02Review(ctx) {
    let h = `<div class="note blue">每季季末與年度目標的季末回顧一起進行。計畫設定完成簽核後才能填寫。</div>`;
    if ((ctx.status.plan || 'draft') !== 'ok') return h + `<div class="note">發展計畫尚未完成簽核。</div>`;
    for (let q = 1; q <= 4; q++) {
      h += section(`Q${q} 進度回顧`, q === 4 ? '12 月，含年終回顧' : `${q * 3} 月`);
      h += `<div class="card"><div class="grid">
        ${fld(ctx, `Q${q}.e.progress`, '發展進度與調整', 'textarea', { full: true })}
        ${fld(ctx, `Q${q}.m.comment`, '主管回饋', 'textarea', { full: true })}
      </div></div>`;
      h += ctx.stageBar(`Q${q}`);
    }
    return h;
  }

  function renderTab(ctx, tabId) {
    if (ctx.form === 'F01') {
      if (tabId === 'annual') return f01Annual(ctx);
      if (tabId === 'year') return f01Year(ctx);
      return f01Quarter(ctx, Number(tabId.slice(1)));
    }
    return tabId === 'review' ? f02Review(ctx) : f02Plan(ctx);
  }

  function weightTotal(ctx, s) {
    let sum = 0, count = 0;
    for (let k = 1; k <= 5; k++) {
      const w = ctx.v(`${s}.e.g${k}.weight`);
      if (w !== '' && !isNaN(Number(w))) { sum += Number(w); count++; }
    }
    return { sum: Math.round(sum * 100) / 100, count };
  }

  /* ---------- validation ---------- */
  function validate(ctx, stage, role) {
    const v = k => (ctx.v(k) || '').trim();
    if (ctx.form === 'F01') {
      if (role === 'e') {
        if (stage === 'annual') {
          if (!v('annual.e.type')) return '請選擇設定類型';
          let n = 0;
          for (let i = 1; i <= 5; i++) {
            const has = v(`annual.e.g${i}.goal`);
            if (has) { n++; if (!v(`annual.e.g${i}.outcome`)) return `第 ${i} 項請填寫「年底要看到的成果」`; }
          }
          if (n < 3) return '年度目標至少需要 3 項';
        }
        if (/^Q\ds$/.test(stage)) {
          let n = 0;
          for (let k = 1; k <= 5; k++) {
            if (v(`${stage}.e.g${k}.goal`)) {
              n++;
              if (!v(`${stage}.e.g${k}.measure`)) return `第 ${k} 項請填寫衡量標準`;
              if (!v(`${stage}.e.g${k}.weight`)) return `第 ${k} 項請填寫權重`;
              if (!v(`${stage}.e.g${k}.map`)) return `第 ${k} 項請選擇對應年度目標`;
            }
          }
          if (n < 3) return '本季目標至少需要 3 項';
          if (weightTotal(ctx, stage).sum !== 100) return '權重合計需為 100%';
        }
        if (/^Q\de$/.test(stage)) {
          const s = stage.replace('e', 's');
          for (let k = 1; k <= 5; k++) if (v(`${s}.e.g${k}.goal`) && !v(`${stage}.e.g${k}.result`)) return `第 ${k} 項請填寫實際成果`;
        }
        if (stage === 'year') {
          for (let n = 1; n <= 5; n++) if (v(`annual.e.g${n}.goal`) && !v(`year.e.g${n}.result`)) return `年度目標第 ${n} 項請填寫年底實際成果`;
        }
      }
      if (role === 'm') {
        if (/^Q\de$/.test(stage)) {
          const s = stage.replace('e', 's');
          for (let k = 1; k <= 5; k++) if (v(`${s}.e.g${k}.goal`) && !v(`${stage}.m.g${k}.ach`)) return `第 ${k} 項請評定達成程度`;
          if (!v(`${stage}.m.overall`)) return '請評定本季整體達成程度';
        }
        if (stage === 'year') {
          for (let n = 1; n <= 5; n++) if (v(`annual.e.g${n}.goal`) && !v(`year.m.g${n}.ach`)) return `年度目標第 ${n} 項請評定達成程度`;
          if (!v('year.m.overall')) return '請選擇年度整體評定';
        }
      }
    } else {
      if (role === 'e' && stage === 'plan') {
        if (!v('plan.e.dir')) return '請選擇職涯方向';
        if (!v('plan.e.focus')) return '請選擇發展重點';
        for (let n = 1; n <= 2; n++) {
          if (!v(`plan.e.g${n}.obj`)) return `請填寫發展目標 ${n}`;
          if (!v(`plan.e.g${n}.a1.act`)) return `發展目標 ${n} 至少需要一個行動`;
        }
      }
      if (role === 'e' && /^Q\d$/.test(stage) && !v(`${stage}.e.progress`)) return '請填寫發展進度與調整';
    }
    return '';
  }

  /* ---------- print ---------- */
  function printDoc(ctx) {
    const F = FORMS[ctx.form], d = k => ctx.v(k);
    const cell = (x) => `<td>${esc(x || '')}</td>`;
    const lab = (x) => `<td class="lab">${esc(x)}</td>`;
    const e = ctx.emp;
    let h = `<div class="printdoc"><div class="phead"><span class="badge">①格式表格</span>
      <div class="muted" style="font-size:11px;letter-spacing:2px">● 顧家醫療集團 GU+ MEDICAL GROUP</div>
      <h1>${esc(F.title)}　<span style="font-size:13px;font-weight:400;color:var(--muted)">${esc(F.en)}</span></h1>
      <div class="sub">表單編號 ${F.code}｜適用年度 ${ctx.year}｜列印時間 ${new Date().toLocaleString('zh-TW', { hour12: false })}</div></div>`;
    h += `<h2>基本資料</h2><table><tr>${lab('姓名')}${cell(e.name)}${lab('職稱')}${cell(e.title)}${lab('部門／院區')}${cell(e.dept)}</tr>
      <tr>${lab('到職日')}${cell(e.hireDate)}${lab('直屬主管')}${cell(e.managerName)}${lab('核定者')}${cell(ctx.form === 'F02' ? '人力資源部' : (e.approverName || e.managerName))}</tr></table>`;
    const st = s => STATUS[ctx.status[s] || 'draft'];
    if (ctx.form === 'F01') {
      h += `<h2>年度目標（${st('annual')}）</h2><table><tr>${lab('設定類型')}<td colspan="5">${esc(d('annual.e.type'))}</td></tr></table>`;
      h += `<table><tr><th style="width:5%">項次</th><th style="width:20%">對應目標</th><th style="width:30%">年度目標</th><th style="width:33%">年底要看到的成果</th><th>推進季別</th></tr>`;
      for (let n = 1; n <= 5; n++) if (d(`annual.e.g${n}.goal`)) h += `<tr>${cell(n)}${cell(d(`annual.e.g${n}.target`))}${cell(d(`annual.e.g${n}.goal`))}${cell(d(`annual.e.g${n}.outcome`))}${cell((d(`annual.e.g${n}.qs`) || '').replace(/,/g, '、'))}</tr>`;
      h += '</table>';
      if (d('annual.e.dept.expect')) h += `<table><tr>${lab('部門')}${cell(d('annual.e.dept.name'))}${lab('部屬人數')}${cell(d('annual.e.dept.count'))}${lab('對應項次')}${cell(d('annual.e.dept.links'))}</tr><tr>${lab('部門希望達到的成效')}<td colspan="5">${esc(d('annual.e.dept.expect'))}</td></tr></table>`;
      for (let q = 1; q <= 4; q++) {
        const s = `Q${q}s`, en = `Q${q}e`;
        let any = false; for (let k = 1; k <= 5; k++) if (d(`${s}.e.g${k}.goal`)) any = true;
        if (!any) continue;
        h += `<h2>Q${q}｜季初設定（${st(s)}）・季末回顧（${st(en)}）</h2>`;
        h += `<table><tr><th style="width:5%">項次</th><th style="width:9%">對應</th><th style="width:22%">本季目標</th><th style="width:22%">衡量標準</th><th style="width:6%">權重</th><th style="width:24%">實際成果</th><th>達成程度</th></tr>`;
        for (let k = 1; k <= 5; k++) if (d(`${s}.e.g${k}.goal`)) h += `<tr>${cell(k)}${cell(d(`${s}.e.g${k}.map`))}${cell(d(`${s}.e.g${k}.goal`))}${cell(d(`${s}.e.g${k}.measure`))}${cell(d(`${s}.e.g${k}.weight`) ? d(`${s}.e.g${k}.weight`) + '%' : '')}${cell(d(`${en}.e.g${k}.result`))}${cell(d(`${en}.m.g${k}.ach`))}</tr>`;
        h += `</table><table><tr>${lab('本季整體達成程度')}${cell(d(`${en}.m.overall`))}${lab('主管季末評語')}<td colspan="3">${esc(d(`${en}.m.comment`))}</td></tr></table>`;
      }
      if (ctx.status.year || d('year.m.overall')) {
        h += `<h2 class="pagebreak">年終回顧（${st('year')}）</h2><table><tr><th style="width:10%">季別</th><th>重點成果摘要</th><th style="width:16%">整體達成程度</th></tr>`;
        for (let q = 1; q <= 4; q++) h += `<tr>${cell('Q' + q)}${cell(d(`year.e.qsum.Q${q}`))}${cell(d(`Q${q}e.m.overall`))}</tr>`;
        h += `</table><table><tr><th style="width:5%">項次</th><th style="width:35%">年度目標</th><th>年底實際成果</th><th style="width:14%">達成程度</th></tr>`;
        for (let n = 1; n <= 5; n++) if (d(`annual.e.g${n}.goal`)) h += `<tr>${cell(n)}${cell(d(`annual.e.g${n}.goal`))}${cell(d(`year.e.g${n}.result`))}${cell(d(`year.m.g${n}.ach`))}</tr>`;
        h += `</table><table>${d('year.e.dept') ? `<tr>${lab('部門成效達成情形')}<td colspan="3">${esc(d('year.e.dept'))}</td></tr>` : ''}<tr>${lab('主管年度整體評定')}${cell(d('year.m.overall'))}${lab('主管年度評語')}${cell(d('year.m.comment'))}</tr></table>`;
      }
    } else {
      h += `<h2>職涯意向與發展重點（${st('plan')}）</h2><table>
        <tr>${lab('職涯方向')}${cell(d('plan.e.dir'))}${lab('預計何時準備好')}${cell(d('plan.e.ready'))}${lab('發展重點')}${cell(d('plan.e.focus'))}</tr>
        <tr>${lab('想從事的職務類型')}<td colspan="5">${esc(d('plan.e.newRole'))}</td></tr>
        <tr>${lab('我的優勢')}<td colspan="2">${esc(d('plan.e.strengths'))}</td>${lab('待發展領域')}<td colspan="2">${esc(d('plan.e.gaps'))}</td></tr></table>`;
      h += `<h2>發展計畫</h2><table><tr><th style="width:15%">發展目標</th><th style="width:6%">類別</th><th style="width:20%">我的成果</th><th style="width:25%">我的行動</th><th style="width:8%">學習方式</th><th style="width:14%">衡量方式</th><th>完成時程</th></tr>`;
      for (let n = 1; n <= 3; n++) {
        if (!d(`plan.e.g${n}.obj`)) continue;
        for (let m = 1; m <= 3; m++) {
          if (m > 1 && !d(`plan.e.g${n}.a${m}.act`)) continue;
          h += `<tr>${m === 1 ? cell(d(`plan.e.g${n}.obj`)) + cell(d(`plan.e.g${n}.cat`)) + cell(d(`plan.e.g${n}.success`)) : '<td></td><td></td><td></td>'}${cell(d(`plan.e.g${n}.a${m}.act`))}${cell(d(`plan.e.g${n}.a${m}.method`))}${cell(d(`plan.e.g${n}.a${m}.measure`))}${cell(d(`plan.e.g${n}.a${m}.time`))}</tr>`;
        }
      }
      h += `</table><table><tr>${lab('需要誰的協助')}${cell(d('plan.e.who'))}${lab('需要的資源')}${cell(d('plan.e.res'))}</tr></table>`;
      h += `<h2>季度進度回顧</h2><table><tr><th style="width:8%">季別</th><th style="width:12%">狀態</th><th>發展進度與調整</th><th style="width:34%">主管回饋</th></tr>`;
      for (let q = 1; q <= 4; q++) h += `<tr>${cell('Q' + q)}${cell(st('Q' + q))}${cell(d(`Q${q}.e.progress`))}${cell(d(`Q${q}.m.comment`))}</tr>`;
      h += '</table>';
    }
    h += `<h2>簽核紀錄</h2><table><tr><th style="width:16%">時間</th><th style="width:16%">階段</th><th style="width:14%">動作</th><th style="width:14%">執行者</th><th>意見</th></tr>`;
    (ctx.history || []).forEach(x => { h += `<tr>${cell(x.time)}${cell(F.stageLabel[x.stage] || x.stage)}${cell(x.action)}${cell(x.actor)}${cell(x.comment)}</tr>`; });
    if (!(ctx.history || []).length) h += '<tr><td colspan="5">尚無紀錄</td></tr>';
    h += '</table></div>';
    return h;
  }

  window.GUForms = { FORMS, STATUS, renderTab, validate, printDoc, weightTotal, esc, TYPES };
})();
