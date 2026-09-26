// Progressive reading enhancements; the content remains usable without JavaScript.
(() => {
  const portuguese = document.documentElement.lang.startsWith('pt');
  const labels = portuguese
    ? {
        example: 'Exemplo de código',
        table: 'Tabela',
        copy: 'Copiar',
        copied: 'Copiado',
        copyCode: 'Copiar código',
        codeCopied: 'Código copiado',
        top: 'Voltar ao topo',
      }
    : {
        example: 'Code example',
        table: 'Table',
        copy: 'Copy',
        copied: 'Copied',
        copyCode: 'Copy code',
        codeCopied: 'Code copied',
        top: 'Back to top',
      };

  // Headings get ids so a section can be linked.
  function identifyHeadings() {
    document.querySelectorAll('.article-body h2').forEach((heading, index) => {
      if (!heading.id) heading.id = `section-${index + 1}`;
    });
  }

  // Safari's default is that Tab skips links and buttons (a setting in Safari > Settings > Advanced; Option+Tab
  // always works). An explicit tabindex makes them reachable with plain Tab there, and changes nothing elsewhere.
  function makeReachableInSafari() {
    const safari = /^((?!chrome|chromium|android|crios|fxios|edg).)*safari/i.test(navigator.userAgent);
    if (!safari) return;
    document.querySelectorAll('a[href], button, summary').forEach((element) => {
      if (!element.hasAttribute('tabindex')) element.tabIndex = 0;
    });
  }

  function wrapTables() {
    document.querySelectorAll('.prose table').forEach((table) => {
      if (table.closest('.concept-figure, .table-scroll')) return;
      const wrapper = document.createElement('div');
      wrapper.className = 'table-scroll';
      wrapper.setAttribute('role', 'group');
      wrapper.setAttribute('aria-label', table.querySelector('caption')?.textContent.trim() || labels.table);
      table.before(wrapper);
      wrapper.append(table);
    });
  }

  // One polite live region tells screen reader users that the copy worked; the button label alone would not.
  function announcer() {
    const region = document.createElement('p');
    region.className = 'sr-only';
    region.setAttribute('role', 'status');
    document.body.append(region);
    return (message) => {
      region.textContent = message;
      setTimeout(() => {
        region.textContent = '';
      }, 1500);
    };
  }

  function addCopyButtons() {
    if (!navigator.clipboard) return;
    const announce = announcer();
    document.querySelectorAll('.prose pre').forEach((pre) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'code-copy';
      button.textContent = labels.copy;
      button.setAttribute('aria-label', labels.copyCode);
      button.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(pre.querySelector('code')?.textContent ?? pre.textContent);
          button.textContent = labels.copied;
          announce(labels.codeCopied);
        } catch {
          return;
        }
        setTimeout(() => {
          button.textContent = labels.copy;
        }, 1500);
      });
      pre.append(button);
    });
  }

  // Articles are long: a button to return to the top appears once the reader has scrolled a while.
  function addBackToTop() {
    if (!document.querySelector('[data-article]')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'to-top';
    button.hidden = true;
    button.setAttribute('aria-label', labels.top);
    button.title = labels.top;
    button.addEventListener('click', () => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
      // Keyboard users continue from the top of the page instead of from the hidden button.
      document.getElementById('main')?.focus({ preventScroll: true });
    });
    document.body.append(button);
    let queued = false;
    window.addEventListener(
      'scroll',
      () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => {
          queued = false;
          button.hidden = window.scrollY < window.innerHeight;
        });
      },
      { passive: true },
    );
  }

  identifyHeadings();
  wrapTables();
  // A code block only becomes a keyboard stop when it scrolls; otherwise there is nothing to reach with the arrow keys.
  const syncScrollable = () =>
    document.querySelectorAll('.prose pre, .prose .table-scroll').forEach((box) => {
      if (box.scrollWidth > box.clientWidth) box.tabIndex = 0;
      else box.removeAttribute('tabindex');
    });
  window.addEventListener('resize', syncScrollable);
  document.querySelectorAll('.prose pre').forEach((pre) => {
    pre.setAttribute('role', 'group');
    pre.setAttribute('aria-label', labels.example);
  });
  syncScrollable();
  addCopyButtons();
  addBackToTop();
  makeReachableInSafari();
})();
