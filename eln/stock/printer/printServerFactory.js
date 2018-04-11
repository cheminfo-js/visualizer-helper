import ZebraPrintServer from './ZebraPrintServer';
import CognitivePrintServer from './PrintServer';

module.exports = function printServerFactory(s, opts) {
    if (s.kind === 'zebra') {
        return new ZebraPrintServer(s, opts);
    } else {
        return new CognitivePrintServer(s, opts);
    }
};
