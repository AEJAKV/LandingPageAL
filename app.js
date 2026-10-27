/* GoLoans AppLovin landing page: amount picker, click-ID handoff, lead event */
(function () {
  'use strict';

  // ---- Settings ---------------------------------------------------------
  // Value sent with generate_lead (CAD). Agree on this number with the team:
  // AppLovin uses it to judge lead quality, and 0 may be ignored.
  var LEAD_VALUE = 1;
  // URL parameters copied onto the application link so attribution survives.
  var PASS_PARAMS = ['aleid', 'alart', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  var COOKIE_NAME = '_axeid';
  var COOKIE_DAYS = 365;

  // ---- Helpers ----------------------------------------------------------
  function getCookie(name) {
    var m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }

  function setCookie(name, value, days) {
    var exp = new Date(Date.now() + days * 864e5).toUTCString();
    var host = location.hostname;
    // Share across every goloans.ca subdomain (including onyx.goloans.ca).
    var domain = /(^|\.)goloans\.ca$/.test(host) ? '; domain=.goloans.ca' : '';
    var secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + exp + '; path=/' + domain + '; SameSite=Lax' + secure;
  }

  function track(eventName, data) {
    if (typeof window.axon === 'function') {
      try { window.axon('track', eventName, data); } catch (e) { /* never block the click */ }
    }
  }

  // ---- 1. Capture AppLovin click ID -----------------------------------
  var params = new URLSearchParams(location.search);
  var aleid = params.get('aleid');
  if (aleid) {
    setCookie(COOKIE_NAME, aleid, COOKIE_DAYS);
  } else {
    aleid = getCookie(COOKIE_NAME);
  }

  // ---- 2. Carry IDs and UTMs onto the application links ----------------
  var applyLinks = document.querySelectorAll('.js-apply');
  applyLinks.forEach(function (link) {
    var url = new URL(link.href);
    PASS_PARAMS.forEach(function (key) {
      var val = key === 'aleid' ? aleid : params.get(key);
      if (val && !url.searchParams.has(key)) url.searchParams.set(key, val);
    });
    link.href = url.toString();
  });

  // ---- 3. Amount picker -------------------------------------------------
  var amountButtons = document.querySelectorAll('.amount');
  var ctaAmount = document.getElementById('cta-amount');
  var selectedAmount = 500;

  amountButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      amountButtons.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
      btn.setAttribute('aria-pressed', 'true');
      selectedAmount = Number(btn.getAttribute('data-amount'));
      if (ctaAmount) {
        ctaAmount.textContent = btn.textContent;
        // Restart the bump animation so the CTA visibly reacts to the new amount.
        ctaAmount.classList.remove('bump');
        void ctaAmount.offsetWidth;
        ctaAmount.classList.add('bump');
      }
    });
  });

  // ---- 4. Scroll reveal and count-ups -----------------------------------
  // Content stays visible as-is without JS, IntersectionObserver or motion.
  // Each block animates once when it scrolls in; styles.css holds the motion.
  var REVEAL_BLOCKS = '.stats-wrap, .section > h2, .steps-wrap, .bento, .secure-note, .cost, .fine, .ratings, .review, .faq, .final';
  // Children of these get --i (their index) so CSS can stagger them.
  var STAGGER_GROUPS = '.stats, .steps, .bento, .pay-segments, .banks, .cost-rows, .faq, .final, svg.rating-mid';
  var motionOK = window.matchMedia('(prefers-reduced-motion: no-preference)').matches;

  function countUp(el, delay) {
    var target = parseFloat(el.getAttribute('data-count'));
    var decimals = Number(el.getAttribute('data-decimals') || 0);
    var prefix = el.getAttribute('data-prefix') || '';
    var suffix = el.getAttribute('data-suffix') || '';
    var finalText = el.textContent;
    el.textContent = prefix + (0).toFixed(decimals) + suffix;
    setTimeout(function () {
      var start = null;
      function step(now) {
        if (start === null) start = now;
        var p = Math.min((now - start) / 1200, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = p < 1 ? prefix + (target * eased).toFixed(decimals) + suffix : finalText;
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }, delay);
  }

  if (motionOK && 'IntersectionObserver' in window) {
    document.querySelectorAll(STAGGER_GROUPS).forEach(function (group) {
      Array.prototype.forEach.call(group.children, function (child, i) {
        child.style.setProperty('--i', i);
      });
    });

    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var block = entry.target;
        revealObserver.unobserve(block);
        // Blocks on screen at load wait for the hero entrance to lead.
        var delay = Math.max(0, 600 - performance.now());
        block.style.setProperty('--rv-delay', delay + 'ms');
        block.classList.add('is-visible');
        block.querySelectorAll('[data-count]').forEach(function (el) { countUp(el, delay + 300); });
      });
    }, { rootMargin: '0px 0px -15% 0px' });

    document.querySelectorAll(REVEAL_BLOCKS).forEach(function (block) {
      block.classList.add('reveal');
      revealObserver.observe(block);
    });
  }

  // ---- 5. Lead event on Apply click -------------------------------------
  // Fires when someone heads to the application. If onyx.goloans.ca can fire
  // generate_lead on submit instead, remove this and use that (more accurate).
  applyLinks.forEach(function (link) {
    link.addEventListener('click', function () {
      track('generate_lead', { currency: 'CAD', value: LEAD_VALUE });
    });
  });
})();
