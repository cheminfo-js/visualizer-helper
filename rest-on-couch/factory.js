define(['./Roc'], (Roc) => {
  return function rocFactory(opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = {};
    }
    if (typeof IframeBridge !== 'undefined') {
      self.IframeBridge.onMessage((data) => {
        if (data.type === 'tab.data') {
          if (data.message.couchDB) {
            const options = { ...data.message.couchDB, ...opts };
            let roc = new Roc(options);
            cb(roc, data.message.couchDB);
          }
        }
      });
    } else {
      cb(null);
    }
  };
});
