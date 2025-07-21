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
    `# Analytical Characterization of Chemical Compound for [Zenodo Deposition](${depositionUrl})`,
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

  // Define the header
  const compoundInfoHeader = {
    property: 'Property',
    value: 'Value',
  };

  // Collect rows conditionally
  const compoundInfoRows = [];

  if (general.mf) {
    compoundInfoRows.push({
      property: '**Molecular Formula**',
      value: general.mf,
    });
  }
  if (general.mw) {
    compoundInfoRows.push({
      property: '**Molecular Weight**',
      value: `${general.mw.toFixed(2)} g·mol⁻¹`,
    });
  }
  if (general.em) {
    compoundInfoRows.push({
      property: '**Exact Mass**',
      value: `${general.em.toFixed(4)} Da`,
    });
  }

  // Push the section with the formatted table
  md.push(
    `## Compound Information`,
    '',
    getMDTable(compoundInfoHeader, compoundInfoRows),
    '',
  );

  md.push('');

  if (bps.length > 0 || mps.length > 0 || densities.length > 0) {
    const propertiesHeader = {
      property: 'Property',
      value: 'Value',
      conditions: 'Conditions',
    };

    const propertiesRows = [
      ...bps.map((bp) => ({
        property: '**Boiling Point**',
        value: `${bp.low}${
          bp.high !== undefined && bp.high !== bp.low ? ' - ' + bp.high : ''
        } °C`,
        conditions: bp.pressure || 'Standard atmospheric pressure',
      })),
      ...mps.map((mp) => ({
        property: '**Melting Point**',
        value: `${mp.low}${
          mp.high !== undefined && mp.high !== mp.low ? ' - ' + mp.high : ''
        } °C`,
        conditions: '',
      })),
      ...densities.map((density) => ({
        property: '**Density**',
        value: `${density.low}${
          density.high !== undefined && density.high !== density.low
            ? ' - ' + density.high
            : ''
        } g·cm⁻³`,
        conditions: '',
      })),
    ];

    md.push(
      `## Physical Properties`,
      '',
      getMDTable(propertiesHeader, propertiesRows),
      '',
    );

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
    };

    const spectraRows = [
      {
        method: '**NMR**',
        available: spectra.nmr ? '✓' : '✗',
      },
      {
        method: '**Mass spectra**',
        available: spectra.mass ? '✓' : '✗',
      },
      {
        method: '**IR spectrum**',
        available: spectra.ir ? '✓' : '✗',
      },
      {
        method: '**Chromatography**',
        available: spectra.chromatogram ? '✓' : '✗',
      },
    ];

    md.push(getMDTable(spectraHeader, spectraRows));
    md.push('');
  }

  if (general.molfile) {
    md.push('```' + general.molfile + '```');
  }

  return md.join('\n');
}

export function getReadmeForDeposition(deposition) {
  const md = [];
  const meta = deposition.metadata || {};

  md.push(`# ${meta.title || deposition.title || 'Research Dataset'}`);

  const generalDOI =
    deposition.conceptdoi ||
    (meta.prereserve_doi && meta.prereserve_doi.doi) ||
    '';
  if (generalDOI) {
    md.push(
      '',
      `**This version's DOI:** [https://doi.org/${meta.prereserve_doi.doi}](https://doi.org/${meta.prereserve_doi.doi})`,
      '',
    );
  }
  if (deposition.conceptdoi) {
    md.push(
      `**All version's DOI:** [https://doi.org/${deposition.conceptdoi}](https://doi.org/${deposition.conceptdoi})`,
      '',
    );
  }

  const infoHeader = { field: 'Field', value: 'Value' };
  const infoRows = [
    { field: '**Deposition ID**', value: deposition.id || 'N/A' },
    { field: '**State**', value: deposition.state || 'N/A' },
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
    '',
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
    md.push('', `## Contributors`, '');
    for (const [i, c] of meta.contributors.entries()) {
      md.push(
        `- [**${c.name}**${
          c.affiliation ? ` (${c.affiliation}) - ${c.role}` : ''
        }](${c.orcid ? `https://orcid.org/${c.orcid}` : ''})`,
      );
    }
  } else {
    md.push('', `## Contributors`, '', '_No contributors listed._');
  }

  if (meta.description) {
    const description = !meta.description.startsWith('<h1>')
      ? meta.description
      : getAdditionalDescription(meta.description);
    md.push('', `## Additional Description`, '', description, '');
  } else {
    md.push(
      '',
      `## Additional Description`,
      '',
      '_No additional description provided._',
      '',
    );
  }

  md.push('', `## Links`, '');
  if (deposition.links && typeof deposition.links === 'object') {
    if (deposition.links.latest_html)
      md.push(`- [Zenodo Page](${deposition.links.latest_html})`);
    if (deposition.links.latest)
      md.push(`- [API Resource](${deposition.links.latest})`);
  }
  md.push('', `## Files`, '');
  if (Array.isArray(deposition.files) && deposition.files.length > 0) {
    // Build the header and rows for the files table
    const filesHeader = {
      filename: 'Filename',
      filesize: 'Size',
      checksum: 'Checksum',
    };

    const filesRows = deposition.files.map((f) => ({
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
    md.push(`## Related Identifiers`, '', '_No related identifiers._', '');
  }

  if (Array.isArray(meta.creators) && meta.creators.length > 0) {
    const year = meta.publication_date;
    const authors = meta.creators.map((c) => c.name).join(', ');
    const title = meta.title || deposition.title || 'Research Dataset';

    md.push(
      `## Citation`,
      '',
      'If you use this dataset in your research, please cite it as:',
      '',
      `> ${authors}. &#96;*${title}*&#96;. Zenodo, ${year}. https://doi.org/${generalDOI}.`,
    );

    if (deposition.links && deposition.links.parent_doi) {
      md.push(deposition.links.parent_doi);
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

function getAdditionalDescription(description) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(description, 'text/html');

  const h2Elements = doc.querySelectorAll('h2');
  let outputHTML = '';

  for (const h2 of h2Elements) {
    if (h2.textContent && h2.textContent.trim() === 'Additional Description') {
      const next = h2.nextElementSibling;
      if (
        next &&
        next.tagName.toLowerCase() === 'p' &&
        next.textContent &&
        next.textContent.trim() === 'No additional description provided.'
      ) {
        outputHTML = next.outerHTML;
      }
      break;
    }
  }

  console.log(outputHTML);
}
