import {load} from 'cheerio';

// Adapter for the existing selector-based HTML renderer; mutations use a parser,
// not string replacements. Snapshot matches before modifying parents or head.
export class NodeHtmlRewriter {
  handlers = [];
  on(selector, handler) { this.handlers.push({selector, handler}); return this; }
  async transform(response) {
    const $ = load(await response.text());
    const matches = $('*').toArray().map(node => ({node, handlers:this.handlers.filter(h => $(node).is(h.selector))}));
    for (const {node, handlers} of matches) {
      const item = $(node);
      const element = {
        getAttribute:name => item.attr(name),
        setAttribute:(name, value) => item.attr(name, String(value ?? '')),
        removeAttribute:name => item.removeAttr(name),
        setInnerContent:(value, options) => options?.html ? item.html(String(value)) : item.text(String(value)),
        append:(value, options) => item.append(options?.html ? String(value) : $('<span>').text(String(value)).html()),
        remove:() => item.remove()
      };
      for (const {handler} of handlers) await handler.element(element);
    }
    const headers = new Headers(response.headers);
    headers.delete('Content-Length');
    return new Response($.html(), {status:response.status, headers});
  }
}
