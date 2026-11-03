/**
 * Saving what a framed site hands back into the entry the tab opened.
 *
 * The site says when its outputs change; the tab then asks it for every key the
 * record saves, so the RXN file and the drawing that goes with it are written
 * from one moment of the site, never one older than the other. The latest
 * revision of the entry is read first, so a field saved elsewhere since is not
 * undone, and a file is written only when its text changed, so a save that
 * changes nothing makes no revision.
 *
 * Free of the visualizer and of the database — the calls are handed in — so a
 * test drives it with fakes.
 */

const { applyContent, savedChanges } = require('./writers');

/**
 * A saver for one entry.
 *
 * @param {object} options - What is saved, and how.
 * @param {{ save: object }} options.record - The tool record.
 * @param {(keys: string[]) => Promise<object[]>} options.ask - Asks the site
 * for the current value of some outputs.
 * @param {() => Promise<object>} options.fetch - The latest revision of the
 * entry.
 * @param {(entry: object) => Promise<void>} options.update - Writes the entry.
 * @param {(entry: object, attachments: object[]) => Promise<void>}
 * options.attach - Writes files of the entry.
 * @param {object} [options.files] - The text of the entry's files as the tab
 * read them, by name, so one the site gives back unchanged is not written.
 * @returns {{ request: () => Promise<void> }} `request` saves now, or once more
 * after the save under way; it resolves when the entry holds the site's values.
 */
function createEntrySaver(options) {
  const { record, ask, fetch, update, attach, files = {} } = options;
  const written = new Map(Object.entries(files));
  let running = null;
  let again = false;

  async function saveOnce() {
    const items = await ask(Object.keys(record.save));
    const { content, attachments } = savedChanges(items, record.save);
    const changedFiles = attachments.filter(
      (attachment) => written.get(attachment.filename) !== attachment.data,
    );
    if (content.length === 0 && changedFiles.length === 0) return;
    const entry = await fetch();
    if (applyContent(entry, content)) await update(entry);
    if (changedFiles.length > 0) {
      await attach(entry, changedFiles);
      for (const attachment of changedFiles) {
        written.set(attachment.filename, attachment.data);
      }
    }
  }

  return {
    request() {
      if (running !== null) {
        again = true;
        return running;
      }
      running = (async () => {
        try {
          do {
            again = false;
            await saveOnce();
          } while (again);
        } finally {
          running = null;
        }
      })();
      return running;
    },
  };
}

module.exports = { createEntrySaver };
