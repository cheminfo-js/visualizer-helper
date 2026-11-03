/**
 * What a tool tab reads from an entry — a sample, a reaction — for the site it
 * frames: typed items, in the kinds of the cheminfo host protocol.
 *
 * A reader is named in a tool record's `read`. It takes the entry as plain JSON,
 * with the text of the attachments it needs, and returns the items it can make
 * of them — none when the entry has nothing of that sort. The site keeps the
 * kinds it accepts and ignores the others.
 */

const READERS = {
  structure: readStructure,
  reaction: readReaction,
  drawing: readDrawing,
};

/** The attachments a reader needs, fetched by the tab before it reads. */
const READER_FILES = {
  drawing: ['overview.svg'],
};

/**
 * The items a list of readers makes of an entry.
 *
 * @param {object} entry - The entry, as plain JSON.
 * @param {string[]} names - The readers, in the order the record lists them.
 * @param {object} [files] - The text of the attachments fetched for them, by
 * name; one the entry does not have is absent.
 * @returns {object[]} The items, each `{ kind, value, label? }`.
 * @throws {Error} When a name is not a reader.
 */
function readItems(entry, names, files = {}) {
  const items = [];
  for (const name of names) {
    if (!Object.hasOwn(READERS, name)) {
      throw new Error(
        `No reader is named "${name}"; the readers are ${Object.keys(READERS).join(', ')}.`,
      );
    }
    items.push(...READERS[name](entry, files));
  }
  return items;
}

/**
 * The attachments a list of readers needs, among those the entry has.
 *
 * @param {object} entry - The entry, as plain JSON.
 * @param {string[]} names - The readers.
 * @returns {string[]} The attachment names to fetch, each once.
 */
function filesToRead(entry, names) {
  const present = entry?._attachments ?? {};
  const wanted = new Set();
  for (const name of names) {
    for (const file of READER_FILES[name] ?? []) {
      if (Object.hasOwn(present, file)) wanted.add(file);
    }
  }
  return [...wanted];
}

/**
 * The `load` a tool tab sends a site for an entry, without its `type` and `id`,
 * which the connection adds.
 *
 * @param {object} options - The entry, where it is kept, and the site's record.
 * @param {string} options.database - The CouchDB database holding the entry.
 * @param {string} options.uuid - The entry's uuid.
 * @param {object} options.entry - The entry, as plain JSON.
 * @param {object} [options.files] - The text of its attachments the readers
 * need, by name (see {@link filesToRead}).
 * @param {{ read: string[], save: object }} options.record - The tool record.
 * @returns {{ document: string, items: object[], accept: string[] }} The
 * request; `document` names the entry, so the site applies it once, and
 * `accept` the keys the tab saves, which the site then sends back as they
 * change.
 */
function entryLoad({ database, uuid, entry, files, record }) {
  return {
    document: `${database}:${uuid}`,
    items: readItems(entry, record.read, files),
    accept: Object.keys(record.save),
  };
}

/**
 * The sample's structure, in the three forms the ELN keeps of it. The molfile
 * goes as it is stored: its first lines are a fixed-length header, and a trim
 * would lose them.
 *
 * @param {object} sample - The sample entry, as plain JSON.
 * @returns {object[]} `chem.molfile.2d`, `chem.ocl.id` and `chem.mf`, each only
 * when the sample has it.
 */
function readStructure(sample) {
  const general = sample?.$content?.general ?? {};
  const label = sampleLabel(general);
  const items = [];
  if (isFilled(general.molfile)) {
    items.push(
      labelled(
        { kind: 'chem.molfile.2d', value: { molfile: general.molfile } },
        label,
      ),
    );
  }
  const ocl = general.ocl ?? {};
  if (isFilled(ocl.value)) {
    const coordinates =
      typeof ocl.coordinates === 'string' ? ocl.coordinates : '';
    items.push(
      labelled(
        { kind: 'chem.ocl.id', value: { idCode: ocl.value, coordinates } },
        label,
      ),
    );
  }
  if (isFilled(general.mf)) {
    items.push({ kind: 'chem.mf', value: { mf: general.mf.trim() } });
  }
  return items;
}

/**
 * The reaction's RXN file, as it is stored: like a molfile, its first lines are
 * fixed-length, and a trim would lose them.
 *
 * @param {object} entry - The reaction entry, as plain JSON.
 * @returns {object[]} `chem.rxn`, when the reaction has one.
 */
function readReaction(entry) {
  const content = entry?.$content ?? {};
  if (!isFilled(content.reactionRXN)) return [];
  const label = isFilled(content.title)
    ? content.title.trim()
    : entryCode(entry);
  return [
    labelled({ kind: 'chem.rxn', value: { rxn: content.reactionRXN } }, label),
  ];
}

/**
 * The picture the entry shows on its page, `overview.svg`. A site keeps only a
 * drawing it wrote itself, and opens the RXN file otherwise.
 *
 * @param {object} entry - The entry, as plain JSON.
 * @param {object} files - The text of its attachments, by name.
 * @returns {object[]} `image.svg`, when the entry has that picture.
 */
function readDrawing(entry, files) {
  const svg = files['overview.svg'];
  return isFilled(svg) ? [{ kind: 'image.svg', value: { svg } }] : [];
}

/** The entry's code, `$id`, which rest-on-couch may keep as a list of parts. */
function entryCode(entry) {
  const code = Array.isArray(entry?.$id) ? entry.$id.join(' ') : entry?.$id;
  return isFilled(code) ? code.trim() : undefined;
}

/** The sample's title, or else its first name, for the site to show. */
function sampleLabel(general) {
  if (isFilled(general.title)) return general.title.trim();
  const names = Array.isArray(general.name) ? general.name : [];
  for (const name of names) {
    if (isFilled(name?.value)) return name.value.trim();
  }
  return undefined;
}

function labelled(item, label) {
  return label === undefined ? item : { ...item, label };
}

function isFilled(value) {
  return typeof value === 'string' && value.trim() !== '';
}

module.exports = { READERS, entryLoad, filesToRead, readItems };
