define([
  'src/util/api',
  './PrinterInstance',
  './printProcessors',
  './printServerFactory',
  '../../../rest-on-couch/Roc',
], (API, Printer, processors, printServerFactory, Roc) => {
  const SECOND = 1000;
  const MINUTE = 60 * SECOND;
  const LIMIT = 11 * MINUTE;
  return async function stockPrinter(opts) {
    let printerRoc,
      formatsRoc,
      printServerRoc,
      printers,
      printFormats,
      printServers,
      allIds;
    let onlineServers, onlinePrinters;

    const exports = {
      getDBPrinters() {
        return printers;
      },

      async refresh() {
        allIds = new Set();
        printerRoc = new Roc(opts);
        formatsRoc = new Roc(opts);
        printServerRoc = new Roc(opts);
        printers = await printerRoc.view('entryByKind', {
          key: 'printer',
          varName: 'labelPrinters',
          sort: (a, b) => b.$modificationDate - a.$modificationDate,
        });
        printFormats = await formatsRoc.view('entryByKind', {
          key: 'printFormat',
          varName: 'labelPrintFormats',
          sort: (a, b) => b.$modificationDate - a.$modificationDate,
        });

        printServers = await printServerRoc.view('printServerByMacAddress', {
          varName: 'printServers',
          sort: (a, b) => b.$modificationDate - a.$modificationDate,
        });
        onlineServers = printServers.filter(
          (ps) =>
            ps.$content.isOnline !== false &&
            Date.now() - ps.$modificationDate < LIMIT,
        );
        onlinePrinters = printers.filter((p) =>
          onlineServers.find(
            (ps) => ps.$content.macAddress === p.$content.macAddress,
          ),
        );

        await Promise.all(
          onlineServers.map((ps) => {
            return exports
              .getConnectedPrinters(ps.$content)
              .then((ids) => {
                ps.ids = ids;
                ids.forEach((id) => allIds.add(id));
                ps.responds = true;
                ps.color = 'lightgreen';
              })
              .catch(() => {
                ps.ids = [];
                ps.responds = false;
                ps.color = 'pink';
              })
              .then(() => {
                ps.triggerChange();
              });
          }),
        );

        API.createData('allIds', Array.from(allIds));
        const printerModels = new Set();
        printers.forEach((p) => printerModels.add(String(p.$content.model)));
        API.createData('printerModels', Array.from(printerModels));
      },

      async getConnectedPrinters(s) {
        const printServer = printServerFactory(s, opts);
        return printServer.getDeviceIds();
      },

      // printerFormat: uuid of the printer format or printer format document
      async print(printer, printFormat, data) {
        const dbPrinter = await printerRoc.get(printer);
        if (printFormat.resurrect) {
          printFormat = printFormat.resurrect();
        }
        if (typeof printFormat === 'string') {
          printFormat = await formatsRoc.get(printFormat);
        }

        const printServer = printServers.find(
          (ps) =>
            String(ps.$content.macAddress) ===
            String(dbPrinter.$content.macAddress),
        );
        const p = new Printer(dbPrinter.$content, printServer.$content, opts);
        await p.print(printFormat.$content, data);
      },

      async createPrinter(printer) {
        printer.$kind = 'printer';
        await printerRoc.create(printer);
        await exports.refresh();
      },

      async createFormat(format) {
        format.$kind = 'printFormat';
        await formatsRoc.create(format);
      },

      async updateFormat(format) {
        await formatsRoc.update(format);
      },

      async updatePrinter(printer) {
        await printerRoc.update(printer);
      },

      async deletePrinter(printer) {
        await printerRoc.delete(printer);
      },

      async deleteFormat(format) {
        await formatsRoc.delete(format);
      },

      async deletePrintServer(printServer) {
        await printServerRoc.delete(printServer);
      },

      // get online printers that can print a given format
      async getPrinters(format) {
        if (!format) return onlinePrinters;
        const dbFormat = await formatsRoc.get(format);
        const onlineMacAdresses = onlinePrinters.map(
          (ps) => ps.$content.macAddress,
        );
        return printers
          .filter((p) => onlineMacAdresses.includes(p.$content.macAddress))
          .filter((p) => {
            return (
              dbFormat.$content.models.filter(
                (m) => String(m.name) === String(p.$content.model),
              ).length > 0
            );
          });
      },

      async getFormats(printer, type) {
        let formats;
        if (!printer) {
          formats = printFormats.filter((f) => {
            return onlinePrinters.some((printer) =>
              f.$content.models.some(
                (m) => String(m.name) === String(printer.$content.model),
              ),
            );
          });
        } else {
          const dbPrinter = await printerRoc.get(printer);
          formats = printFormats.filter((f) =>
            f.$content.models.some(
              (m) => String(m.name) === String(dbPrinter.$content.model),
            ),
          );
        }
        if (type) {
          formats = formats.filter((f) => String(f.$content.type) === type);
        }
        return formats;
      },

      getProcessors() {
        return Object.keys(processors);
      },

      async getTypes(...args) {
        let formats = await exports.getFormats.apply(null, args);
        let s = new Set();
        for (let format of formats) {
          s.add(String(format.$content.type));
        }
        return Array.from(s);
      },
    };

    await exports.refresh();
    return exports;
  };
});
