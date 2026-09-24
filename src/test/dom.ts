import { JSDOM } from 'jsdom'

export const installDom = () => {
  const dom = new JSDOM('<!doctype html><html lang="ru"><body></body></html>', {
    url: 'http://localhost/',
  })
  const globalObject = globalThis as unknown as Record<string, unknown>
  const values: Record<string, unknown> = {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    HTMLInputElement: dom.window.HTMLInputElement,
    HTMLTextAreaElement: dom.window.HTMLTextAreaElement,
    Node: dom.window.Node,
    Event: dom.window.Event,
    KeyboardEvent: dom.window.KeyboardEvent,
    MouseEvent: dom.window.MouseEvent,
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
    IS_REACT_ACT_ENVIRONMENT: true,
  }
  const previousValues = new Map<string, unknown>()

  for (const [key, value] of Object.entries(values)) {
    previousValues.set(key, globalObject[key])
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value,
    })
  }

  Object.defineProperty(dom.window.HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: () => undefined,
  })
  Object.defineProperty(dom.window.HTMLElement.prototype, 'attachEvent', {
    configurable: true,
    value: () => undefined,
  })
  Object.defineProperty(dom.window.HTMLElement.prototype, 'detachEvent', {
    configurable: true,
    value: () => undefined,
  })
  Object.defineProperty(dom.window, 'matchMedia', {
    configurable: true,
    value: () => ({ matches: false }),
  })

  return {
    document: dom.window.document,
    cleanup: () => {
      dom.window.close()
      for (const [key, value] of previousValues) {
        if (value === undefined) delete globalObject[key]
        else globalObject[key] = value
      }
    },
  }
}
