/**
 * The host's side of the cheminfo host protocol, version 1, for one framed
 * site: answer its `hello` with a private port, send it the sample's items, and
 * hand back what it answers.
 *
 * Free of the visualizer and of the DOM — the frame's window and the message
 * listener are handed in — so a test drives it with a fake frame and a real
 * `MessageChannel`.
 */

const PROTOCOL_VERSION = 1;
const HELLO_TYPE = 'cheminfo:hello';
const CONNECT_TYPE = 'cheminfo:connect';

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
 * @param {string} options.name - How the host calls itself to the site.
 * @param {(listener: (event: MessageEvent) => void) => () => void} options.listen
 * - Subscribes to this window's messages and returns the unsubscribe.
 * @param {(answer: object) => void} [options.onAnswer] - Receives each message
 * the site sends through the port.
 * @returns {{ load: (request: object) => void, close: () => void }} `load` sends
 * a `{ document, items, accept }` now or as soon as the site connects; `close`
 * stops listening and closes the port.
 */
function connectSite(options) {
  const { target, origin, name, listen, onAnswer = noop } = options;
  let port = null;
  let current = null;
  let sent = 0;

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
    port = channel.port1;
    port.addEventListener('message', (message) => {
      onAnswer(message.data);
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
    close() {
      stopListening();
      if (port !== null) port.close();
      port = null;
    },
  };
}

module.exports = { PROTOCOL_VERSION, connectSite };
