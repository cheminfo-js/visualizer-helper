export function getReadmeForSample(
  sample,
  depositionUrl = 'https://zenodo.org/',
) {
  sample = JSON.parse(JSON.stringify(sample));

  const md = [];

  sample.$content = sample.$content || {};
  const general = sample.$content.general || {};
  const physical = sample.$content.physical || {};
  const bps = physical.bp || [];
  const mps = physical.mp || [];
  const densities = physical.density || [];
  const spectra = sample.$content.spectra || {};

  const names = [];
  if (general.title) names.push(general.title);
  if (general.name) {
    for (const name of general.name) {
      if (name.value) names.push(name.value);
    }
  }

  md.push(
    `# 'Analytical Characterization of Chemical Compound for ${depositionUrl}'`,
    '',
  );

  if (names.length > 0) {
    const compoundName = names.join('; ');
    md.push(`**Compound Name:** ${compoundName}`, '');
  }

  if (general.doi) {
    md.push(
      `[![DOI](https://zenodo.org/badge/DOI/${general.doi}.svg)](https://doi.org/${general.doi})`,
      '',
    );
  }

  if (general.description) {
    md.push(`## Description`, '');
    md.push(`${general.description}`, '');
  }

  md.push(
    `## Compound Information`,
    '',
    `| Property | Value |`,
    `|----------|-------|`,
  );

  if (general.mf) {
    md.push(`| **Molecular Formula** | ${general.mf} |`);
  }

  if (general.mw) {
    md.push(`| **Molecular Weight** | ${general.mw} g·mol⁻¹ |`);
  }

  if (general.em) {
    md.push(`| **Exact Mass** | ${general.em} Da |`);
  }

  md.push('');

  const hasPhysicalData =
    bps.length > 0 || mps.length > 0 || densities.length > 0;

  if (hasPhysicalData) {
    md.push(
      `## Physical Properties`,
      '',
      `| Property | Value | Conditions |`,
      `|----------|-------|------------|`,
    );
    for (const bp of bps) {
      md.push(
        `| **Boiling Point** | ${bp.low}${
          bp.high !== undefined && bp.high !== bp.low ? ' - ' + bp.high : ''
        } °C | ${bp.pressure || 'Standard atmospheric pressure'} |`,
      );
    }
    for (const mp of mps) {
      md.push(
        `| **Melting Point** | ${mp.low}${
          mp.high !== undefined && mp.high !== mp.low ? ' - ' + mp.high : ''
        } °C | |`,
      );
    }
    for (const density of densities) {
      md.push(
        `| **Density** | ${density.low}${
          density.high !== undefined && density.high !== density.low
            ? ' - ' + density.high
            : ''
        } g·cm⁻³ | |`,
      );
    }

    md.push('');
  }

  const hasSpectralData = spectra.ir || spectra.chromatogram || spectra.nmr;

  if (hasSpectralData) {
    const summary = `
### Analytical Data Availability

`;

    md.push(summary);

    const spectraHeader = {
      method: 'Analytical Method',
      available: 'Data Available',
      format: 'File Format',
    };

    const spectraRows = [
      {
        method: '**Infrared (IR)**',
        available: spectra.ir ? '✓' : '✗',
        format: '',
      },
      {
        method: '**NMR**',
        available: spectra.nmr ? '✓' : '✗',
        format: '',
      },
      {
        method: '**Chromatography**',
        available: spectra.chromatogram ? '✓' : '✗',
        format: '',
      },
    ];

    md.push(getMDTable(spectraHeader, spectraRows));
  }

  if (general.molfile) {
    md.push('```' + general.molfile + '```');
  }

  return md.join('\n');
}

export function getReadmeForDeposition(dep) {
  const md = [];
  const meta = dep.metadata || {};

  md.push(`# ${meta.title || dep.title || 'Research Dataset'}`);

  const generalDOI = dep.conceptdoi || meta.prereserve_doi.doi || '';
  if (generalDOI) {
    md.push(
      '',
      `**This version's DOI:** [https://doi.org/${meta.prereserve_doi.doi}](https://doi.org/${meta.prereserve_doi.doi})`,
      '',
    );
  }
  if (dep.conceptdoi) {
    md.push(
      `**All version's DOI:** [https://doi.org/${dep.conceptdoi}](https://doi.org/${dep.conceptdoi})`,
      '',
    );
  }

  const infoHeader = { field: 'Field', value: 'Value' };
  const infoRows = [
    { field: '**Deposition ID**', value: dep.id || 'N/A' },
    { field: '**State**', value: dep.state || 'N/A' },
    { field: '**Access Right**', value: meta.access_right || 'N/A' },
    { field: '**License**', value: meta.license || 'N/A' },
    { field: '**Upload Type**', value: meta.upload_type || 'N/A' },
    { field: '**Publisher**', value: meta.imprint_publisher || 'N/A' },
    { field: '**Publication Date**', value: meta.publication_date || 'N/A' },
  ];

  md.push(
    `## Dataset Information`,
    '',
    getMDTable(infoHeader, infoRows),
    '',
    `## Creators`,
  );
  if (Array.isArray(meta.creators) && meta.creators.length > 0) {
    for (const [i, c] of meta.creators.entries()) {
      md.push(
        `- [**${c.name}**${c.affiliation ? ` (${c.affiliation})` : ''}](${
          c.orcid ? `https://orcid.org/${c.orcid}` : ''
        })`,
      );
    }
  } else {
    md.push('_No creators listed._');
  }
  if (Array.isArray(meta.contributors) && meta.contributors.length > 0) {
    md.push('', `## Contributors`);
    for (const [i, c] of meta.contributors.entries()) {
      md.push(
        `- [**${c.name}**${
          c.affiliation ? ` (${c.affiliation}) - ${c.role}` : ''
        }](${c.orcid ? `https://orcid.org/${c.orcid}` : ''})`,
      );
    }
  } else {
    md.push('', `## Contributors`, '_No contributors listed._');
  }

  md.push('', `## Links`);
  if (dep.links && typeof dep.links === 'object') {
    if (dep.links.latest_html)
      md.push(`- [Zenodo Page](${dep.links.latest_html})`);
    if (dep.links.latest) md.push(`- [API Resource](${dep.links.latest})`);
  }
  md.push('', `## Files`);
  if (Array.isArray(dep.files) && dep.files.length > 0) {
    // Build the header and rows for the files table
    const filesHeader = {
      filename: 'Filename',
      filesize: 'Size',
      checksum: 'Checksum',
    };

    const filesRows = dep.files.map((f) => ({
      filename: `[${f.filename}](${f.links.downloads})`,
      filesize: formatBytes(f.filesize),
      checksum: `\`${f.checksum}\``,
    }));

    // Append the table to your md array
    md.push(getMDTable(filesHeader, filesRows));
  } else {
    md.push('_No files uploaded._');
  }
  md.push('');

  if (
    Array.isArray(meta.related_identifiers) &&
    meta.related_identifiers.length > 0
  ) {
    md.push(`## Related Identifiers`, '');
    md.push('This dataset is related to the following identifiers:');
    for (const rel of meta.related_identifiers) {
      const relType = rel.resource_type || 'unknown';
      const relId = rel.identifier || 'N/A';
      const cites = rel.cites || '';
      const scheme = rel.scheme || 'unknown';
      md.push(`- **${relType}**: [${scheme}:${relId}](${relId}) ${cites}`);
    }
  } else {
    md.push(`## Related Identifiers`, '_No related identifiers._');
  }

  if (Array.isArray(meta.creators) && meta.creators.length > 0) {
    const year = meta.publication_date;
    const authors = meta.creators.map((c) => c.name).join(', ');
    const title = meta.title || dep.title || 'Research Dataset';

    md.push(
      `## Citation`,
      '',
      'If you use this dataset in your research, please cite it as:',
      '',
      `> ${authors}. &#96;*${title}*&#96;. Zenodo, ${year}. https://doi.org/${generalDOI}.`,
    );

    if (dep.links && dep.links.parent_doi) {
      md.push(dep.links.parent_doi);
    }

    md.push('');
  }

  md.push(
    `---`,
    '',
    `*Dataset generated automatically on ${
      new Date().toISOString().split('T')[0]
    }* using the [Zenodo NPM Library](https://github.com/cheminfo/zenodo)`,
  );

  return md.join('\n');
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

/**
 *
 * @param {Record<string, string>} header
 * @param {Array<Record<string, any>>} rows
 * @returns
 */
export function getMDTable(header, rows) {
  const keys = Object.keys(header); // ['name', 'surname']
  const labels = Object.values(header); // ['Firstname', 'Lastname']

  // Prepare all rows: first row is the header labels, followed by data rows as arrays of strings
  const allRows = [
    labels,
    ...rows.map((row) =>
      keys.map((k) => {
        const val = row[k];
        return val != null ? String(val) : '';
      }),
    ),
  ];

  // Compute max width for each column
  const colWidths = keys.map((_, i) =>
    Math.max(...allRows.map((row) => row[i].length)),
  );

  // Helper to pad strings (left-align)
  const pad = (str, len) => str + ' '.repeat(len - str.length);

  // Build header row
  const headerRow =
    '| ' +
    labels.map((label, i) => pad(label, colWidths[i])).join(' | ') +
    ' |';

  // Build divider row (---)
  const dividerRow =
    '|-' + colWidths.map((w) => '-'.repeat(w)).join('-|-') + '-|';

  // Build data rows
  const dataRows = rows.map(
    (row) =>
      '| ' +
      keys
        .map((k, i) => pad(row[k] != null ? String(row[k]) : '', colWidths[i]))
        .join(' | ') +
      ' |',
  );

  // Join all parts
  return [headerRow, dividerRow, ...dataRows].join('\n');
}
