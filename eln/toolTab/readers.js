/**
 * What a tool tab reads from a sample for the site it frames: typed items, in
 * the kinds of the cheminfo host protocol.
 *
 * A reader is named in a tool record's `read`. It takes the sample as plain
 * JSON and returns the items it can make of it — none when the sample has
 * nothing of that sort. The site keeps the kinds it accepts and ignores the
 * others.
 */

const READERS = {
  structure: readStructure,
};

/**
 * The items a list of readers makes of a sample.
 *
 * @param {object} sample - The sample entry, as plain JSON.
 * @param {string[]} names - The readers, in the order the record lists them.
 * @returns {object[]} The items, each `{ kind, value, label? }`.
 * @throws {Error} When a name is not a reader.
 */
function readItems(sample, names) {
  const items = [];
  for (const name of names) {
    if (!Object.hasOwn(READERS, name)) {
      throw new Error(
        `No reader is named "${name}"; the readers are ${Object.keys(READERS).join(', ')}.`,
      );
    }
    items.push(...READERS[name](sample));
  }
  return items;
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

module.exports = { READERS, readItems };
