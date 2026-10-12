/**
 * The sites a tool tab can frame, under the name a tile gives in `data.tool`.
 *
 * A record says which site to frame, what the tab reads from the sample for it,
 * and where a result the site hands back is saved. A tile may override any of
 * its fields, so one ELN can save what another only shows.
 */

const TOOLS = {
  '3d': {
    title: '3D model',
    url: 'https://3d.cheminfo.org/?embed=1',
    read: ['structure'],
  },
};

/**
 * The record a tile asks for: the registry's record for `data.tool`, with the
 * tile's own fields over it.
 *
 * @param {object | string} [data] - The tile's `data`, as the tab receives it:
 * an object, or the same as JSON text when a tiles grid column edits it.
 * @returns {{ title: string, url: string, read: string[], save: object }} The
 * record.
 * @throws {Error} When the tile's data is not JSON, names a tool this version
 * does not know, gives neither a tool nor a `url`, or gives a `url` that is not
 * an http(s) address.
 */
function toolRecord(data = {}) {
  const { tool, ...overrides } = tileData(data);
  if (tool !== undefined && !Object.hasOwn(TOOLS, tool)) {
    throw new Error(
      `No tool is named "${tool}" in this version of visualizer-helper, so nothing was opened.`,
    );
  }
  const record = {
    read: ['structure'],
    save: {},
    ...(tool === undefined ? {} : TOOLS[tool]),
    ...overrides,
  };
  if (typeof record.url !== 'string') {
    throw new Error(
      'The tile names no tool and gives no url, so nothing was opened.',
    );
  }
  const url = parseAddress(record.url);
  if (url === null || (url.protocol !== 'https:' && url.protocol !== 'http:')) {
    throw new Error(
      `"${record.url}" is not an http(s) address, so nothing was opened.`,
    );
  }
  return {
    title: record.title ?? url.host,
    url: record.url,
    read: [...record.read],
    save: { ...record.save },
  };
}

function tileData(data) {
  if (data === null || data === '') return {};
  if (typeof data !== 'string') return data;
  try {
    return JSON.parse(data);
  } catch (error) {
    throw new Error(
      `The tile's data is not JSON (${data}), so nothing was opened.`,
      { cause: error },
    );
  }
}

// `URL.parse` would do, but it is too recent for the browsers some labs keep.
function parseAddress(text) {
  try {
    return new URL(text);
  } catch {
    return null;
  }
}

module.exports = { TOOLS, toolRecord };
