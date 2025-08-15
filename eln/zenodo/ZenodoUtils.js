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

export function getReadmeForDeposition(ZenodoDeposition) {
  const deposition = ZenodoDeposition.value || ZenodoDeposition;
  const host = ZenodoDeposition.zenodo.host || 'zenodo.org';
  const md = [];
  const meta = deposition.metadata || {};

  md.push(`# ${meta.title || deposition.title || 'Research Dataset'}`);

  const doi =
    deposition.links && deposition.links.doi ? deposition.links.doi : '';
  if (doi) {
    md.push('', `**This version's DOI:** [${doi}](${doi})`, '');
  }

  const parentDOI =
    deposition.links && deposition.links.parent_doi
      ? deposition.links.parent_doi
      : doi.replace(/(\d+)(?!.*\d)/, (match) => Number(match) - 1);
  if (parentDOI) {
    md.push(`**All version's DOI:** [${parentDOI}](${parentDOI})`, '');
  }

  md.push(
    `**Explore data interactively:** [https://fair.cheminfo.org/v1/${host}/${deposition.id}](https://fair.cheminfo.org/v1/${host}/${deposition.id})`,
    '',
  );

  const infoHeader = { field: 'Field', value: 'Value' };
  const infoRows = [
    { field: '**Deposition ID**', value: deposition.id || 'N/A' },
    { field: '**License**', value: meta.rights[0].id || 'N/A' },
    { field: '**Upload Type**', value: meta.resource_type.title.en || 'N/A' },
    { field: '**Publisher**', value: meta.publisher || 'N/A' },
    { field: '**Publication Date**', value: meta.publication_date || 'N/A' },
  ];

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
      const identifiers = c.person_or_org.identifiers || [];
      if (identifiers.length === 0) {
        identifiers.push({ scheme: 'orcid', identifier: '' });
      }
      const affiliations = c.affiliations || [];
      if (affiliations.length === 0) {
        affiliations.push({ name: '' });
      }
      md.push(
        `- [**${c.person_or_org.name}**${
          affiliations[0].name
            ? ` (${affiliations[0].name}) - ${c.role.title.en}`
            : ''
        }](${
          identifiers[0].scheme === 'orcid'
            ? `https://orcid.org/${identifiers[0].identifier}`
            : ''
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
        `- [**${c.person_or_org.name}**${
          c.affiliations[0].name
            ? ` (${c.affiliations[0].name}) - ${c.role.title.en}`
            : ''
        }](${
          c.orcid
            ? `https://orcid.org/${c.person_or_org.identifiers[0].identifier}`
            : ''
        })`,
      );
    }
  } else {
    md.push('', `## Contributors`, '', '_No contributors listed._');
  }

  if (Array.isArray(meta.funding) && meta.funding.length > 0) {
    md.push('', `## Funding`, '');
    for (const fund of meta.funding) {
      const funder = fund.funder.name || 'Unknown Funder';
      const award = fund.award.title.en || 'No Award Number';
      const acronym = fund.award.acronym ? `(${fund.award.acronym})` : '';
      md.push(`- **${funder}** ${acronym}: ${award}`);
    }
  }

  if (deposition.links && typeof deposition.links === 'object') {
    md.push('', `## Links`, '');
    if (deposition.links.self_html) {
      md.push(`- [Zenodo Page](${deposition.links.self_html})`);
    }
    if (deposition.links.self) {
      const publishedLink = deposition.links.self.replace('/draft', '');
      md.push(`- [API Resource](${publishedLink})`);
    }
  }
  md.push('', `## Files`, '');
  const files = Object.values(deposition.files.entries);
  if (Array.isArray(files) && files.length > 0) {
    // Build the header and rows for the files table
    const filesHeader = {
      filename: 'Filename',
      filesize: 'Size',
      checksum: 'Checksum (md5)',
    };

    // remove draft from the link
    const publishedLink = deposition.links.self.replace('/draft', '');
    const filesRows = files.map((f) => ({
      filename: `[${f.key}](${publishedLink}/files/${f.key}/content)`,
      filesize: formatBytes(f.size),
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
      const relType = rel.resource_type.id || 'unknown';
      const relId = rel.identifier || 'N/A';
      const cites = rel.relation_type.title.en || '';
      const scheme = rel.scheme || 'unknown';
      md.push(
        `- This publication -> ${cites} -> **${relType}**: ${scheme}: [${relId}](https://doi.org/${relId})`,
      );
    }
  } else {
    md.push(`## Related Identifiers`, '', '_No related identifiers._', '');
  }

  if (Array.isArray(meta.creators) && meta.creators.length > 0) {
    const year = meta.publication_date;
    const authors = meta.creators.map((c) => c.person_or_org.name).join(', ');
    const title = meta.title || deposition.title || 'Research Dataset';

    md.push(
      `## Citation`,
      '',
      'If you use this dataset in your research, please cite it as:',
      '',
      `> ${authors}. &#96;*${title}*&#96;. Zenodo, ${year}. ${deposition.links.doi}.`,
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
      if (next && next.tagName.toLowerCase() === 'p' && next.textContent) {
        outputHTML = next.outerHTML;
      }
      break;
    }
  }
}

export function getKeywordsForDeposition(samples) {
  const keywords = new Set();
  keywords.add('SciPeaks');
  keywords.add('Molecules characterization');
  keywords.add('Dataset of chemicals');
  for (const sample of samples) {
    if (sample.$content && sample.$content.spectra) {
      if (
        sample.$content.spectra.nmr &&
        sample.$content.spectra.nmr.length > 0
      ) {
        keywords.add('NMR Spectrum');
        keywords.add('Nuclear Magnetic Resonance');
      }
      if (sample.$content.spectra.ir && sample.$content.spectra.ir.length > 0) {
        keywords.add('IR Spectrum');
        keywords.add('Infrared');
      }
      if (sample.$content.spectra.uv && sample.$content.spectra.uv.length > 0) {
        keywords.add('UV Spectrum');
        keywords.add('Ultra-violet');
      }
      if (
        sample.$content.spectra.mass &&
        sample.$content.spectra.mass.length > 0
      ) {
        keywords.add('Mass Spectrum');
      }
      if (sample._attachments && sample._attachments.length > 0) {
        for (const key of Object.keys(sample._attachments) || []) {
          if (key.endsWith('.dx')) {
            keywords.add('JCAMP-DX');
          }
        }
      }
    }
  }
  return Array.from(keywords).map((subject) => ({ subject }));
}
