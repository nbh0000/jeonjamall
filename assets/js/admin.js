/* 전자몰 관리자 스크립트 */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  // 확인창
  $$('form[data-confirm]').forEach((f) => f.addEventListener('submit', (e) => { if (!confirm(f.dataset.confirm)) e.preventDefault(); }));
  // 전체 선택
  $$('[data-check-all]').forEach((c) => c.addEventListener('change', () => {
    $$('input[name="ids[]"]', c.closest('form')).forEach((x) => { x.checked = c.checked; });
  }));

  // 복사
  const copy = async (text, btn) => {
    try { await navigator.clipboard.writeText(text); } catch { const t = document.createElement('textarea'); t.value = text; document.body.append(t); t.select(); document.execCommand('copy'); t.remove(); }
    if (btn) { const o = btn.textContent; btn.textContent = '복사됨'; setTimeout(() => { btn.textContent = o; }, 1200); }
  };
  $$('[data-copy]').forEach((b) => b.addEventListener('click', () => copy(b.dataset.copy, b)));
  $$('[data-copy-from]').forEach((b) => b.addEventListener('click', () => copy($(b.dataset.copyFrom).value, b)));

  // 파일 고르면 미리보기
  document.addEventListener('change', (e) => {
    const inp = e.target;
    if (!(inp instanceof HTMLInputElement) || inp.type !== 'file' || !inp.files?.[0]) return;
    const pv = inp.closest('.imgf')?.querySelector('.imgf__pv');
    if (pv) pv.innerHTML = `<img src="${URL.createObjectURL(inp.files[0])}" alt="">`;
  });

  // 반복 줄 추가: data-tpl 줄을 복제하고 [번호] 를 새 번호로
  $$('[data-rep-add]').forEach((btn) => btn.addEventListener('click', () => {
    const box = $(`[data-rep="${btn.dataset.repAdd}"]`);
    const tpl = $('[data-tpl]', box);
    const n = $$('.rep__row', box).length + Date.now() % 1000;
    const row = tpl.cloneNode(true);
    row.removeAttribute('data-tpl');
    $$('[name]', row).forEach((el) => {
      el.name = el.name.replace(/\[\d+\]/, `[${n}]`);
      if (el.type === 'checkbox') el.checked = false; else if (el.type !== 'hidden' || el.name.endsWith('[image]') || el.name.endsWith('[image_mo]')) el.value = el.tagName === 'SELECT' ? el.options[0].value : '';
    });
    $$('.imgf__pv', row).forEach((p) => { p.textContent = '없음'; });
    box.append(row);
  }));

  // 상품 묶음 규칙에 따라 칸 보이기
  const rule = $('[data-rule]');
  if (rule) {
    const sync = () => $$('[data-rule-show]').forEach((el) => { el.hidden = el.dataset.ruleShow !== rule.value; });
    rule.addEventListener('change', sync); sync();
  }

  // 섹션 순서 바꾸기 (위·아래 화살표) → 바로 저장
  const order = $('[data-order]');
  if (order) {
    const save = async () => {
      const fd = new FormData();
      fd.append('_csrf', window.CSRF);
      $$('[data-zone]', order).forEach((z) => $$('.bl', z).forEach((b) => fd.append(`zones[${z.dataset.zone}][]`, b.dataset.id)));
      await fetch('/admin/pages/order', { method: 'POST', body: fd, headers: { Accept: 'application/json' } });
    };
    order.addEventListener('click', (e) => {
      const b = e.target.closest('[data-move]');
      if (!b) return;
      const row = b.closest('.bl');
      if (b.dataset.move === '-1' && row.previousElementSibling) row.parentNode.insertBefore(row, row.previousElementSibling);
      else if (b.dataset.move === '1' && row.nextElementSibling) row.parentNode.insertBefore(row.nextElementSibling, row);
      else return;
      row.animate([{ background: '#eef2fd' }, { background: '#fff' }], 600);
      save();
    });
  }

  // 광고 링크 미리보기
  const utm = $('[data-utm]');
  if (utm) {
    const val = (k) => $(`[data-u="${k}"]`, utm)?.value.trim() || '';
    const sync = () => {
      const srcSel = $('[data-u="source"]', utm), medSel = $('[data-u="medium"]', utm);
      $('[data-u="source_custom"]', utm).hidden = srcSel.value !== '_custom';
      $('[data-u="medium_custom"]', utm).hidden = medSel.value !== '_custom';
      const src = srcSel.value === '_custom' ? val('source_custom') : srcSel.value;
      const med = medSel.value === '_custom' ? val('medium_custom') : medSel.value;
      const p = new URLSearchParams();
      if (src) p.set('utm_source', src.toLowerCase());
      if (med) p.set('utm_medium', med.toLowerCase());
      if (val('campaign')) p.set('utm_campaign', val('campaign').replace(/\s+/g, '_'));
      if (val('content')) p.set('utm_content', val('content').replace(/\s+/g, '_'));
      $('[data-u-out]', utm).value = utm.dataset.base.replace(/\/$/, '') + val('target') + '?' + p.toString();
    };
    utm.addEventListener('input', sync); utm.addEventListener('change', sync); sync();
  }

  // 정보글 간이 편집기
  const ed = $('[data-editor]');
  if (ed) {
    const wrap = (before, after) => {
      const s = ed.selectionStart, e2 = ed.selectionEnd, t = ed.value.slice(s, e2) || '글자';
      ed.setRangeText(before + t + after, s, e2, 'select');
      ed.focus();
    };
    $$('[data-wrap]').forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.wrap;
      if (k === 'a') { const u = prompt('링크 주소 (예: /p/airpods-pro-2-lightning/right)'); if (u) wrap(`<a href="${u}">`, '</a>'); return; }
      if (k === 'ul') { const s = ed.selectionStart, e2 = ed.selectionEnd; const lines = (ed.value.slice(s, e2) || '항목').split('\n').map((l) => `<li>${l}</li>`).join('\n'); ed.setRangeText(`<ul>\n${lines}\n</ul>`, s, e2, 'end'); return; }
      wrap(`<${k}>`, `</${k}>`);
    }));
    $('[data-editor-img]')?.addEventListener('change', async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const fd = new FormData();
      fd.append('_csrf', window.CSRF); fd.append('file', f); fd.append('dir', 'post');
      const r = await fetch('/admin/upload', { method: 'POST', body: fd, headers: { Accept: 'application/json' } }).then((x) => x.json());
      if (!r.ok) { alert(r.message); return; }
      ed.setRangeText(`\n<img src="${r.url}" alt="">\n`, ed.selectionStart, ed.selectionStart, 'end');
      e.target.value = '';
    });
  }
})();
