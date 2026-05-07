/**
 * Migrations for sample data structure changes
 */

/**
 * Migrates sequence data from the old location to the new biology structure.
 * Old location: $content.general.sequence
 * New location: $content.biology.peptidic[0].seq[0].sequence
 * By default we expect it is a peptidic sequence.
 *
 * @param {object} sample - The sample object to migrate
 */
function migrateSequence(sample) {
  if (!sample.$content.general) {
    sample.$content.general = {};
  }

  if (sample.$content.general.sequence) {
    // eslint-disable-next-line no-console
    console.log('Migrating sequence', sample.$content.general.sequence);
    if (!sample.$content.biology) sample.$content.biology = {};
    if (!sample.$content.biology.peptidic) {
      sample.$content.biology.peptidic = [];
    }
    if (!sample.$content.biology.peptidic.length > 0) {
      sample.$content.biology.peptidic[0] = {};
    }
    if (!sample.$content.biology.peptidic[0].seq) {
      sample.$content.biology.peptidic[0].seq = [];
    }
    if (!sample.$content.biology.peptidic[0].seq.length > 0) {
      sample.$content.biology.peptidic[0].seq[0] = {};
    }
    sample.setChildSync(
      ['$content', 'biology', 'peptidic', 0, 'seq', 0, 'sequence'],
      sample.$content.general.sequence,
    );
    sample.$content.general.sequence = undefined;
  }
}

/**
 * Migrates thermogravimetric analysis metadata from "zone" to "zones".
 * Old location: $content.spectra.thermogravimetricAnalysis[].meta.zone
 * New location: $content.spectra.thermogravimetricAnalysis[].meta.zones
 *
 * @param {object} sample - The sample object to migrate
 */
function migrateTGAZones(sample) {
  const tgaEntries = sample.$content?.spectra?.thermogravimetricAnalysis;
  if (!Array.isArray(tgaEntries)) return;

  for (const entry of tgaEntries) {
    if (entry.zone && !entry.zones) {
      // eslint-disable-next-line no-console
      console.log('Migrating TGA zone to zones');
      entry.zones = entry.zone;
      delete entry.zone;
    }
  }
}

/**
 * Migrates name entries from boolean kind to string kind.
 * Old: kind: true → New: kind: 'iupac'
 * Old: kind: false → New: kind: 'trivial'
 * Old: kind: undefined → New: kind: 'iupac'
 *
 * @param {object} sample - The sample object to migrate
 */
function migrateIupac(sample) {
  const iupacEntries = sample.$content?.general?.name;
  if (!Array.isArray(iupacEntries)) return;

  for (const entry of iupacEntries) {
    if (entry.kind === true || entry.kind === undefined) {
      entry.kind = 'iupac';
    } else if (entry.kind === false) {
      entry.kind = 'trivial';
    }
  }
}

/**
 * Run all migrations on a sample
 *
 * @param {object} sample - The sample object to migrate
 */
function updateSample(sample) {
  migrateSequence(sample);
  migrateTGAZones(sample);
  migrateIupac(sample);
}

module.exports = { migrateIupac, updateSample };
