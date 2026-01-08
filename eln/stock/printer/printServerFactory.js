import CognitivePrintServer from './PrintServer';
import ZebraPrintServer from './ZebraPrintServer';

module.exports = function printServerFactory(s, opts) {
  if (String(s.kind) === 'zebra') {
    return new ZebraPrintServer(s, opts);
  } else {
    return new CognitivePrintServer(s, opts);
  }
};
