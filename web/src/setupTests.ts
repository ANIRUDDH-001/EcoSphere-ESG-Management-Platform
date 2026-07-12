// Patch for AbortSignal compatibility issues in JSDOM + React Router v7 / Hono test suites
if (typeof window !== 'undefined') {
  // Override node global and window fetch API classes to use undici implementations,
  // resolving AbortSignal validation checks inside React Router v7.
  const { Request, Response, Headers, fetch } = require('undici');
  
  (global as any).Request = Request;
  (global as any).Response = Response;
  (global as any).Headers = Headers;
  (global as any).fetch = fetch;

  window.Request = Request;
  window.Response = Response;
  window.Headers = Headers;
  window.fetch = fetch;

  // Retrieve native AbortSignal prototype from undici
  const NativeAbortSignal = new Request('https://a').signal.constructor;

  // Create custom AbortController wrapper that returns native-prototype-aligned signals
  class CustomAbortController {
    private controller: any;
    public signal: any;

    constructor() {
      // Create JSDOM abort controller instance
      const JSDOMAbortController = (window as any)._OriginalAbortController || (window as any).AbortController;
      this.controller = new JSDOMAbortController();
      this.signal = this.controller.signal;
      // Re-assign prototype to match native AbortSignal
      Object.setPrototypeOf(this.signal, NativeAbortSignal.prototype);
    }

    abort(reason?: any) {
      this.controller.abort(reason);
    }
  }

  // Backup JSDOM original AbortController if not already backed up
  if (!(window as any)._OriginalAbortController) {
    (window as any)._OriginalAbortController = window.AbortController;
  }

  (global as any).AbortController = CustomAbortController;
  window.AbortController = CustomAbortController as any;
}
