/**
 * Where a tool tab keeps what the site it frames hands back: the changes to
 * make to the entry, worked out from the site's items and the record's `save`.
 *
 * `save` maps a key the site sends to a writer and its place. Two writers
 * exist: `content`, a field of the entry's `$content` at `jpath`, and
 * `attachment`, a file of the entry named `filename`. Both keep the text the
 * item carries — the RXN file of a `chem.rxn`, the SVG of an `image.svg`.
 *
 *   save: {
 *     reaction: { writer: 'content', jpath: ['reactionRXN'] },
 *     drawing: { writer: 'attachment', filename: 'overview.svg' },
 *   }
 *
 * Free of the visualizer, so a test checks every change without a database.
 */

/** The field of an item's value that holds its text, and the file type. */
const TEXT_KINDS = [
  { kind: 'chem.rxn', field: 'rxn', contentType: 'chemical/x-mdl-rxnfile' },
  { kind: 'image.svg', field: 'svg', contentType: 'image/svg+xml' },
  {
    kind: 'chem.molfile',
    field: 'molfile',
    contentType: 'chemical/x-mdl-molfile',
  },
];

const WRITERS = ['content', 'attachment'];

/**
 * The changes the site's items ask for. An item whose key the record does not
 * save is left out, and so is one carrying no text.
 *
 * @param {object[]} items - The items, each with the `key` the site sent it
 * under, as a `get` answers or an `output` carries them.
 * @param {object} save - The record's `save`.
 * @returns {{ content: { jpath: string[], value: string }[], attachments: {
 * filename: string, contentType: string, data: string }[] }} The fields to set
 * and the files to write.
 * @throws {Error} When `save` names a writer that does not exist, or gives one
 * no place to write.
 */
function savedChanges(items, save) {
  const content = [];
  const attachments = [];
  for (const item of items) {
    if (typeof item?.key !== 'string' || !Object.hasOwn(save, item.key)) {
      continue;
    }
    const place = save[item.key];
    const text = textOf(item);
    if (!WRITERS.includes(place?.writer)) {
      throw new Error(
        `No writer is named "${place?.writer}"; the writers are ${WRITERS.join(', ')}.`,
      );
    }
    if (text === undefined) continue;
    if (place.writer === 'content') {
      if (!isPath(place.jpath)) {
        throw new Error(`"${item.key}" is saved in $content with no jpath.`);
      }
      content.push({ jpath: [...place.jpath], value: text.value });
    } else {
      if (typeof place.filename !== 'string' || place.filename === '') {
        throw new Error(`"${item.key}" is saved as a file with no filename.`);
      }
      attachments.push({
        filename: place.filename,
        contentType: text.contentType,
        data: text.value,
      });
    }
  }
  return { content, attachments };
}

/**
 * Set the fields of an entry's `$content`, making the objects on their way.
 *
 * @param {object} entry - The entry, changed in place.
 * @param {{ jpath: string[], value: string }[]} content - The fields, as
 * {@link savedChanges} gives them.
 * @returns {boolean} Whether any field changed, so an unchanged entry needs no
 * new revision.
 */
function applyContent(entry, content) {
  let changed = false;
  for (const { jpath, value } of content) {
    let target = entry.$content;
    for (const key of jpath.slice(0, -1)) {
      if (typeof target[key] !== 'object' || target[key] === null) {
        target[key] = {};
      }
      target = target[key];
    }
    const last = jpath.at(-1);
    if (target[last] !== value) {
      target[last] = value;
      changed = true;
    }
  }
  return changed;
}

function textOf(item) {
  const kind = typeof item.kind === 'string' ? item.kind : '';
  for (const { kind: base, field, contentType } of TEXT_KINDS) {
    if (kind !== base && !kind.startsWith(`${base}.`)) continue;
    const value = item.value?.[field];
    return typeof value === 'string' && value.trim() !== ''
      ? { value, contentType }
      : undefined;
  }
  return undefined;
}

const RESERVED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function isPath(jpath) {
  return (
    Array.isArray(jpath) &&
    jpath.length > 0 &&
    jpath.every(
      (key) => typeof key === 'string' && key !== '' && !RESERVED_KEYS.has(key),
    )
  );
}

module.exports = { WRITERS, applyContent, savedChanges };
