import printer from './printer';

module.exports = function printerFactor(opts, cb) {
  if (typeof opts === 'function') {
    cb = opts;
    opts = {};
  }
  if (typeof IframeBridge !== 'undefined') {
    self.IframeBridge.onMessage(async (data) => {
      if (data.type === 'tab.data') {
        let optsCopy = { ...opts };
        if (data.message.printer && data.message.printer.couchDB) {
          optsCopy.proxy = data.message.printer.proxy;
          const options = { ...data.message.printer.couchDB, ...optsCopy };
          let p = await printer(options);
          cb(p, data.message.printer);
        }
      }
    });
  } else {
    cb(null);
  }
};
