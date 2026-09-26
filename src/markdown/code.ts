import { defineHastPlugin, htmlToHast } from 'satteri';
import hljs from 'highlight.js';

const language = (code: any) =>
  (Array.isArray(code.properties?.className) ? code.properties.className : [])
    .find((name: unknown) => typeof name === 'string' && name.startsWith('language-'))
    ?.slice('language-'.length) as string | undefined;

/** Pinta os blocos ``` no build, para o leitor não baixar um realçador nem depender de JavaScript. */
export const highlightCode = defineHastPlugin({
  name: 'highlight-code',
  element: {
    filter: ['pre'],
    visit(node, ctx) {
      const code = node.children?.find((child: any) => child.type === 'element' && child.tagName === 'code') as any;
      const name = code && language(code);
      if (!name || !hljs.getLanguage(name)) return;
      const html = hljs.highlight(ctx.textContent(code), { language: name, ignoreIllegals: true }).value;
      const tree: any = htmlToHast(
        `<pre><code class="hljs language-${name}" data-highlighted="yes">${html}</code></pre>`,
        { fragment: true },
      );
      return tree.children[0];
    },
  },
});
