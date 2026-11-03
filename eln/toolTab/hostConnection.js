/**
 * The host's side of the cheminfo host protocol, version 1, for one framed
 * site: answer its `hello` with a private port, send it the entry's items, ask
 * it for its outputs, and hand back what else it says.
 *
 * Free of the visualizer and of the DOM — the frame's window and the message
 * listener are handed in — so a test drives it with a fake frame and a real
 * `MessageChannel`.
 */

const PROTOCOL_VERSION = 1;

/** How the tab introduces itself to a site unless told otherwise. */
const DEFAULT_HOST_NAME = 'SciPeaks';
const HELLO_TYPE = 'cheminfo:hello';
const CONNECT_TYPE = 'cheminfo:connect';

/** How long a site has to answer a `get` before the tab gives up, in ms. */
const GET_TIMEOUT = 15000;

const noop = () => {
  /* noop */
};

/**
 * Serve one framed site.
 *
 * Call it before the frame's `src` is set, so the site's `hello` cannot be
 * missed. A site that loads again — a link inside it, a reload — says `hello`
 * again, and gets a new port and the current load once more.
 *
 * @param {object} options - Where the site is, and what to do with it.
 * @param {() => object | null} options.target - The frame's window, read each
 * time a message arrives.
 * @param {string} options.origin - The site's origin; a message from any other
 * is ignored, and nothing is ever posted to another.
 * @param {string} [options.name] - How the host calls itself to the site.
 * Defaults to {@link DEFAULT_HOST_NAME}.
 * @param {(listener: (event: MessageEvent) => void) => () => void} options.listen
 * - Subscribes to this window's messages and returns the unsubscribe.
 * @param {(answer: object) => void} [options.onAnswer] - Receives each message
 * the site sends through the port, but the answers to a `get`.
 * @param {number} [options.timeout] - How long a `get` waits for its answer,
 * in ms. Defaults to {@link GET_TIMEOUT}.
 * @returns {{ load: (request: object) => void, get: (keys: string[]) =>
 * Promise<object[]>, close: () => void }} `load` sends a `{ document, items,
 * accept }` now or as soon as the site connects; `get` asks the connected site
 * for the current value of some outputs and resolves with its items; `close`
 * stops listening and closes the port.
 */
function connectSite(options) {
  const {
    target,
    origin,
    name = DEFAULT_HOST_NAME,
    listen,
    onAnswer = noop,
    timeout = GET_TIMEOUT,
  } = options;
  let port = null;
  let current = null;
  let sent = 0;
  let asked = 0;
  const pending = new Map();

  function settle(id, outcome) {
    const request = pending.get(id);
    if (request === undefined) return;
    pending.delete(id);
    clearTimeout(request.timer);
    if (outcome instanceof Error) request.reject(outcome);
    else request.resolve(outcome);
  }

  function abandon(reason) {
    for (const id of [...pending.keys()]) settle(id, new Error(reason));
  }

  function send() {
    if (port === null || current === null) return;
    sent++;
    port.postMessage({ type: 'load', id: `load-${sent}`, ...current });
  }

  const stopListening = listen((event) => {
    const frameWindow = target();
    if (frameWindow === null || event.source !== frameWindow) return;
    if (event.origin !== origin) return;
    const { data } = event;
    if (data?.type !== HELLO_TYPE || data.version !== PROTOCOL_VERSION) return;
    const channel = new MessageChannel();
    if (port !== null) port.close();
    abandon('The site reloaded before it answered.');
    port = channel.port1;
    port.addEventListener('message', (message) => {
      const answer = message.data;
      if (answer?.type === 'result' && pending.has(answer.id)) {
        settle(
          answer.id,
          answer.ok === true
            ? Array.isArray(answer.items)
              ? answer.items
              : []
            : new Error(answer.error?.message ?? 'The site could not answer.'),
        );
        return;
      }
      onAnswer(answer);
    });
    port.start();
    frameWindow.postMessage(
      { type: CONNECT_TYPE, version: PROTOCOL_VERSION, host: { name } },
      origin,
      [channel.port2],
    );
    send();
  });

  return {
    load(request) {
      current = request;
      send();
    },
    get(keys) {
      if (port === null) {
        return Promise.reject(new Error('The site is not connected yet.'));
      }
      asked++;
      const id = `get-${asked}`;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          settle(id, new Error('The site did not answer in time.'));
        }, timeout);
        pending.set(id, { resolve, reject, timer });
        port.postMessage({ type: 'get', id, keys: [...keys] });
      });
    },
    close() {
      stopListening();
      abandon('The tab closed before the site answered.');
      if (port !== null) port.close();
      port = null;
    },
  };
}

module.exports = {
  DEFAULT_HOST_NAME,
  GET_TIMEOUT,
  PROTOCOL_VERSION,
  connectSite,
};
