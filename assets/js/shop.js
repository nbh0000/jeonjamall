/* 전자몰 고객 화면 스크립트 */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const won = (n) => n.toLocaleString('ko-KR') + '원';

  const toast = (msg, link) => {
    const t = $('[data-toast]');
    if (!t) return;
    t.innerHTML = '';
    t.append(document.createTextNode(msg));
    if (link) { const a = document.createElement('a'); a.href = link.href; a.textContent = link.text; t.append(a); }
    t.hidden = false;
    clearTimeout(t._h);
    t._h = setTimeout(() => { t.hidden = true; }, 3200);
  };

  // ── 전체 메뉴 ─────────────────────────────
  const drawer = $('[data-drawer]');
  if (drawer) {
    const open = () => { drawer.hidden = false; document.body.style.overflow = 'hidden'; };
    const close = () => { drawer.hidden = true; document.body.style.overflow = ''; };
    $$('[data-drawer-open]').forEach((b) => b.addEventListener('click', open));
    $$('[data-drawer-close]').forEach((b) => b.addEventListener('click', close));
    drawer.addEventListener('click', (e) => { if (e.target === drawer) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !drawer.hidden) close(); });
  }

  // ── 메인 배너 슬라이드 ─────────────────────
  $$('[data-slider]').forEach((root) => {
    const track = $('[data-track]', root);
    const n = track.children.length;
    if (n < 2) return;
    let i = 0, timer;
    const cur = $('[data-cur]', root);
    const go = (k) => { i = (k + n) % n; track.style.transform = `translateX(${-100 * i}%)`; if (cur) cur.textContent = i + 1; };
    const auto = () => { clearInterval(timer); if (!matchMedia('(prefers-reduced-motion: reduce)').matches) timer = setInterval(() => go(i + 1), 5000); };
    $('[data-prev]', root)?.addEventListener('click', () => { go(i - 1); auto(); });
    $('[data-next]', root)?.addEventListener('click', () => { go(i + 1); auto(); });
    let x0 = null, y0 = null;
    track.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    track.addEventListener('touchend', (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { go(i + (dx < 0 ? 1 : -1)); auto(); }
      x0 = null;
    });
    root.addEventListener('mouseenter', () => clearInterval(timer));
    root.addEventListener('mouseleave', auto);
    auto();
  });

  // ── 상품 사진 ─────────────────────────────
  const main = $('[data-gallery-main]');
  $$('[data-gallery-thumb]').forEach((b) => b.addEventListener('click', () => {
    if (main) main.src = b.dataset.galleryThumb;
    $$('[data-gallery-thumb]').forEach((x) => x.classList.toggle('is-on', x === b));
  }));

  // ── 옵션 선택 ─────────────────────────────
  const form = $('[data-opt]');
  if (form) {
    const cfg = JSON.parse($('[data-variants]', form).textContent);
    const groups = $$('[data-group]', form);
    const linesEl = $('[data-lines]', form);
    const totalWrap = $('[data-total-wrap]', form);
    const totalEl = $('[data-total]', form);
    const picks = [];
    const lines = new Map(); // variant id → qty

    const match = (prefix) => cfg.variants.filter((v) => prefix.every((p, k) => v.o[k] === p));
    const stockOf = (prefix) => match(prefix).reduce((s, v) => s + Math.max(0, v.stock), 0);

    const paint = () => {
      groups.forEach((g, gi) => {
        const enabled = gi <= picks.length;
        g.classList.toggle('is-dim', !enabled);
        $('[data-picked]', g).textContent = picks[gi] ? picks[gi] : (!enabled ? `${$('legend', groups[gi - 1]).firstChild.textContent.trim()} 선택 후 ${$('legend', g).firstChild.textContent.trim()}별 가격 표시` : '');
        $$('.opt__btn', g).forEach((btn) => {
          const val = btn.dataset.val;
          const prefix = [...picks.slice(0, gi), val];
          const vs = match(prefix);
          const stock = stockOf(prefix);
          const last = gi === groups.length - 1;
          btn.classList.toggle('is-on', picks[gi] === val);
          btn.disabled = !enabled || vs.length === 0;
          btn.classList.toggle('is-wait', !enabled);
          btn.classList.toggle('is-out', enabled && vs.length > 0 && stock <= 0);
          const sub = $('[data-sub]', btn);
          if (last && vs.length === 1 && gi <= picks.length) {
            sub.textContent = vs[0].stock > 0 ? won(vs[0].price) : '품절';
          } else if (vs.length && stock <= 0) {
            sub.textContent = '품절';
          } else {
            sub.textContent = '';
          }
          btn.hidden = gi > 0 && gi <= picks.length && vs.length === 0;
        });
      });
    };

    const render = () => {
      linesEl.innerHTML = '';
      let total = 0;
      lines.forEach((qty, id) => {
        const v = cfg.variants.find((x) => x.id === id);
        total += v.price * qty;
        const li = document.createElement('li');
        li.className = 'opt__line';
        li.innerHTML = `<span>${v.o.join(' / ')}</span>
          <div class="qty"><button type="button" data-d="-1" aria-label="수량 빼기"><svg class="ic"><use href="#i-minus"/></svg></button><input type="number" name="items[${id}]" value="${qty}" min="1" max="${v.stock}" aria-label="수량" readonly><button type="button" data-d="1" aria-label="수량 더하기"><svg class="ic"><use href="#i-plus"/></svg></button></div>
          <span style="display:flex;align-items:center;gap:2px"><b>${won(v.price * qty)}</b><button type="button" class="x" aria-label="삭제"><svg class="ic"><use href="#i-x"/></svg></button></span>`;
        li.querySelectorAll('[data-d]').forEach((b) => b.addEventListener('click', () => {
          const q = Math.min(v.stock, Math.max(1, qty + Number(b.dataset.d)));
          if (q === qty && Number(b.dataset.d) > 0) toast(`재고가 ${v.stock}개 남았습니다.`);
          lines.set(id, q); render();
        }));
        li.querySelector('.x').addEventListener('click', () => { lines.delete(id); render(); });
        linesEl.append(li);
      });
      totalWrap.hidden = lines.size === 0;
      totalEl.textContent = won(total);
    };

    const addVariant = (v) => {
      if (v.stock <= 0) { toast('품절된 옵션입니다.'); return; }
      if (!lines.has(v.id)) lines.set(v.id, 1); else toast('이미 담은 옵션입니다. 수량은 아래에서 조절합니다.');
      render(); paint();
    };

    groups.forEach((g, gi) => {
      $$('.opt__btn', g).forEach((btn) => btn.addEventListener('click', () => {
        picks.length = gi;
        picks[gi] = btn.dataset.val;
        if (gi === groups.length - 1) {
          const vs = match(picks);
          if (vs.length === 1) { addVariant(vs[0]); return; }
        }
        paint();
      }));
    });

    if (cfg.preset) {
      const v = cfg.variants.find((x) => x.id === cfg.preset);
      if (v && v.stock > 0) lines.set(v.id, 1);
    }
    if (cfg.part && !cfg.preset) picks[0] = cfg.part;
    render(); paint();

    const submit = async (mode) => {
      if (lines.size === 0) {
        const g = groups[Math.min(picks.length, groups.length - 1)];
        toast(g ? `${$('legend', g).firstChild.textContent.trim()} 선택이 남아 있습니다.` : '판매 중인 옵션이 없습니다.');
        (g || groups[0])?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      if (window.JJ_STATIC) { toast('미리보기 화면에서는 주문할 수 없습니다.'); return; }
      const fd = new FormData(form);
      fd.set('mode', mode);
      try {
        const r = await fetch('/cart/add', { method: 'POST', body: fd, headers: { Accept: 'application/json' } });
        const j = await r.json();
        if (!j.ok) { toast(j.message || '담지 못했습니다.'); return; }
        if (j.redirect) { location.href = j.redirect; return; }
        const c = $('[data-cart-count]');
        if (c) { c.textContent = j.count; c.hidden = false; }
        toast('장바구니에 담았습니다.', { href: '/cart', text: '장바구니 보기' });
        if (window.fbq) fbq('track', 'AddToCart');
      } catch (e) { form.submit(); }
    };
    form.addEventListener('submit', (e) => { e.preventDefault(); submit(e.submitter?.value || 'cart'); });

    // 모바일 하단 구매 바
    const bar = $('[data-buybar]');
    if (bar) {
      document.body.classList.add('has-buybar');
      const btns = $('.opt__btns', form);
      bar.querySelectorAll('[data-buybar-go]').forEach((b) => b.addEventListener('click', () => {
        if (lines.size === 0) { form.scrollIntoView({ behavior: 'smooth', block: 'start' }); toast('옵션을 선택해 주세요.'); return; }
        submit(b.dataset.buybarGo);
      }));
      if ('IntersectionObserver' in window && btns) {
        new IntersectionObserver(([en]) => bar.classList.toggle('is-hidden', en.isIntersecting)).observe(btns);
      }
    }
  }

  // ── 상세 탭 ───────────────────────────────
  const tabs = $('[data-tabs]');
  if (tabs && 'IntersectionObserver' in window) {
    const links = $$('a', tabs);
    const targets = links.map((a) => document.getElementById(a.hash.slice(1))).filter(Boolean);
    const io = new IntersectionObserver((ens) => {
      ens.forEach((en) => {
        if (en.isIntersecting) links.forEach((a) => a.classList.toggle('is-on', a.hash === '#' + en.target.id));
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    targets.forEach((t) => io.observe(t));
  }

  // ── 주문서 ────────────────────────────────
  const co = $('[data-checkout]');
  if (co) {
    const same = $('[data-same]', co);
    const recv = $('[data-receiver]', co);
    const sync = () => { recv.hidden = same.checked; recv.querySelectorAll('input').forEach((i) => { i.required = !same.checked; }); };
    same.addEventListener('change', sync); sync();
    const openPost = () => {
      if (!window.daum?.Postcode) { alert('주소 검색을 불러오는 중입니다. 잠시 후 다시 눌러 주세요.'); return; }
      new daum.Postcode({
        oncomplete: (d) => {
          $('[data-zip]', co).value = d.zonecode;
          $('[data-addr1]', co).value = d.roadAddress || d.jibunAddress;
          $('[data-addr2]', co).focus();
        },
      }).open();
    };
    $('[data-postcode]', co).addEventListener('click', openPost);
    $('[data-zip]', co).addEventListener('click', openPost);
    $('[data-addr1]', co).addEventListener('click', openPost);
    co.addEventListener('submit', (e) => {
      if (!$('[data-zip]', co).value) { e.preventDefault(); toast('주소 찾기로 배송지를 입력해 주세요.'); }
    });
    // 적립금: 이름·휴대폰으로 잔액 조회 → 상품금액 안에서 사용
    const use = $('[data-points-use]', co);
    if (use) {
      const won = (n) => n.toLocaleString('ko-KR') + '원';
      const totalEl = $('[data-total]', co);
      const base = Number(totalEl.dataset.total), items = Number(totalEl.dataset.items);
      const msg = $('[data-points-msg]', co);
      const apply = () => {
        const max = Number(use.max) || 0;
        let v = Math.max(0, Math.min(max, Math.floor(Number(use.value) || 0)));
        if (String(v) !== use.value) use.value = v;
        $('[data-points-row]', co).hidden = v === 0;
        $('[data-points-amt]', co).textContent = '-' + won(v);
        totalEl.textContent = won(base - v);
        $('[data-pay-amt]', co).textContent = won(base - v);
      };
      use.addEventListener('input', apply);
      use.addEventListener('change', apply);
      $('[data-points-check]', co).addEventListener('click', async () => {
        const name = co.elements.buyer_name.value.trim(), phone = co.elements.phone.value.trim();
        if (!name || !phone) { msg.textContent = '주문자 이름과 휴대폰 번호를 먼저 입력해 주세요.'; return; }
        const fd = new FormData();
        fd.append('_csrf', co.elements._csrf.value); fd.append('name', name); fd.append('phone', phone);
        try {
          const r = await fetch('/points', { method: 'POST', body: fd, headers: { Accept: 'application/json' } }).then((x) => x.json());
          if (!r.ok) { msg.textContent = r.message || '조회하지 못했습니다.'; return; }
          const max = Math.min(r.balance, items);
          use.max = max; use.disabled = max === 0;
          if (max > 0) { use.value = max; msg.textContent = '사용 가능한 적립금 ' + won(r.balance) + (r.balance > items ? ' (이번 주문에는 상품금액 ' + won(items) + '까지)' : ''); }
          else { use.value = 0; msg.textContent = '사용할 수 있는 적립금이 없습니다.'; }
          apply();
        } catch { msg.textContent = '조회하지 못했습니다. 잠시 후 다시 시도해 주세요.'; }
      });
    }
  }

  // ── 토스페이먼츠 결제창 ─────────────────────
  const payBtn = $('[data-toss-pay]');
  if (payBtn) {
    const d = payBtn.dataset;
    const base = { orderId: d.orderId, orderName: d.orderName, successUrl: d.success, failUrl: d.fail, customerName: d.customerName, customerMobilePhone: d.customerPhone };
    if (d.customerEmail) base.customerEmail = d.customerEmail;
    let widgets = null;
    // 결제위젯 키: 결제수단·약관 위젯을 페이지에 그린다
    if (d.widget && window.TossPayments) {
      payBtn.disabled = true;
      (async () => {
        try {
          widgets = TossPayments(d.clientKey).widgets({ customerKey: TossPayments.ANONYMOUS });
          await widgets.setAmount({ currency: 'KRW', value: Number(d.amount) });
          await Promise.all([
            widgets.renderPaymentMethods({ selector: '#payment-method', variantKey: 'DEFAULT' }),
            widgets.renderAgreement({ selector: '#agreement', variantKey: 'AGREEMENT' }),
          ]);
          payBtn.disabled = false;
        } catch (e) { toast(e.message || '결제 화면을 불러오지 못했습니다.'); }
      })();
    }
    payBtn.addEventListener('click', async () => {
      if (!window.TossPayments) { toast('결제 모듈을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.'); return; }
      if (widgets) {
        payBtn.disabled = true;
        try { await widgets.requestPayment(base); }
        catch (e) { if (e && e.code !== 'USER_CANCEL') toast(e.message || '결제를 시작하지 못했습니다.'); }
        finally { payBtn.disabled = false; }
        return;
      }
      payBtn.disabled = true;
      try {
        const payment = TossPayments(d.clientKey).payment({ customerKey: TossPayments.ANONYMOUS });
        const req = {
          method: 'CARD',
          amount: { currency: 'KRW', value: Number(d.amount) },
          orderId: d.orderId, orderName: d.orderName,
          successUrl: d.success, failUrl: d.fail,
          customerName: d.customerName, customerMobilePhone: d.customerPhone,
          card: { useEscrow: false, flowMode: 'DEFAULT', useCardPoint: false, useAppCardOnly: false },
        };
        if (d.customerEmail) req.customerEmail = d.customerEmail;
        await payment.requestPayment(req);
      } catch (e) {
        if (e && e.code !== 'USER_CANCEL') toast(e.message || '결제를 시작하지 못했습니다.');
      } finally {
        payBtn.disabled = false;
      }
    });
  }
})();
