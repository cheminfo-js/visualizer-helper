export function getReadmeForSample(sample) {
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

  md.push(`# ${'Analytical Characterization of Chemical Compound'}`, '');

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

| Analytical Method | Data Available | File Format |
|-------------------|----------------|-------------|
| **Infrared (IR)** | ${spectra.ir ? '✓' : '✗'} |  |
| **NMR** | ${spectra.nmr ? '✓' : '✗'} | 
| **Chromatography** | ${spectra.chromatogram ? '✓' : '✗'} |
`;

    md.push(summary);
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

  if (meta.prereserve_doi && meta.prereserve_doi.doi) {
    md.push('', `**DOI:** https://doi.org/${meta.prereserve_doi.doi}`, '');
  }

  if (Array.isArray(meta.creators) && meta.creators.length > 0) {
    const authorList = meta.creators
      .map((c) => {
        let authorStr = c.name;
        if (c.affiliation) {
          authorStr += ` (${c.affiliation})`;
        }
        if (c.orcid) {
          authorStr += ` [ORCID: ${c.orcid}]`;
        }
        return authorStr;
      })
      .join(', ');

    md.push(`**Authors:** ${authorList}`, '');
  }

  if (meta.publication_date) {
    md.push(`**Publication Date:** ${meta.publication_date}`);
  }

  if (meta.license) {
    md.push(`**License:** ${meta.license}`);
  }

  if (meta.access_right) {
    md.push(
      `**Access:** ${
        meta.access_right.charAt(0).toUpperCase() + meta.access_right.slice(1)
      } access`,
    );
  }

  md.push('');

  if (meta.description) {
    md.push(`## Abstract`, '', meta.description, '');
  }

  md.push(
    `## Dataset Information`,
    '',
    `| Field         | Value |`,
    `|-------------- |-------|`,
    `| **Deposition ID** | ${dep.id || 'N/A'} |`,
    `| **State**         | ${dep.state || 'N/A'} |`,
    `| **Access Right**  | ${meta.access_right || 'N/A'} |`,
    `| **License**       | ${meta.license || 'N/A'} |`,
    `| **Upload Type**   | ${meta.upload_type || 'N/A'} |`,
    `| **Publisher**     | ${meta.imprint_publisher || 'N/A'} |`,
    `| **Publication Date** | ${meta.publication_date || 'N/A'} |`,
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
  md.push('', `## Links`);
  if (dep.links && typeof dep.links === 'object') {
    if (dep.links.html) md.push(`- [Zenodo Page](${dep.links.html})`);
    if (dep.links.self) md.push(`- [API Resource](${dep.links.self})`);
    if (dep.links.bucket) md.push(`- [Bucket](${dep.links.bucket})`);
  }
  md.push('', `## Files`);
  if (Array.isArray(dep.files) && dep.files.length > 0) {
    md.push(`| Filename | Size | Checksum |`, `|----------|------|----------|`);
    for (const f of dep.files) {
      md.push(
        `| ${f.filename} | ${formatBytes(f.filesize)} | \`${f.checksum}\` |`,
      );
    }
  } else {
    md.push('_No files uploaded._');
  }
  md.push('');

  if (Array.isArray(meta.creators) && meta.creators.length > 0) {
    const year = meta.publication_date
      ? new Date(meta.publication_date).getFullYear()
      : new Date().getFullYear();
    const authors = meta.creators.map((c) => c.name).join(', ');
    const title = meta.title || dep.title || 'Research Dataset';

    md.push(
      `## Citation`,
      '',
      'If you use this dataset in your research, please cite it as:',
      '',
      `${authors} (${year}). *${title}*. Zenodo.`,
    );

    if (meta.prereserve_doi && meta.prereserve_doi.doi) {
      md.push(` https://doi.org/${meta.prereserve_doi.doi}`);
    }

    md.push('');
  }

  md.push(
    `---`,
    '',
    `*Dataset documentation generated automatically on ${
      new Date().toISOString().split('T')[0]
    }*`,
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
