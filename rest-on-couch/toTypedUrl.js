define(() => {
  function toTypedUrl(documents, couchUrl, database) {
    if (!Array.isArray(documents)) throw new Error('Array expected');

    for (let i = 0; i < documents.length; i++) {
      let content = documents[i].$content;
      processObject(content, documents[i]);
    }

    function processObject(obj, documents) {
      if (obj instanceof Object) {
        if (typeof obj.filename === 'string' && typeof obj.type === 'string') {
          obj.url = `${couchUrl}/db/${database}/${documents._id}/${obj.filename}`;
        }
        for (let key in obj) {
          processObject(obj[key], documents);
        }
      } else if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
          processObject(obj[i], documents);
        }
      }
    }

    return documents;
  }

  return toTypedUrl;
});
