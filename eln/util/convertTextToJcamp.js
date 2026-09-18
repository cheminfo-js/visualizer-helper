import { fromJSON } from '../libs/convertToJcamp';
import { parseXYAndKeepInfo } from '../libs/parseXY';

/**
 * Converts the content of a csv, tsv or txt spectrum to a JCAMP-DX string.
 *
 * @param {string} text - Content of the text file
 * @param {object} [meta] - Metadata describing the spectrum
 * @param {string} [meta.title=''] - Title of the spectrum
 * @param {string} [meta.type=''] - JCAMP data type, e.g. 'IR SPECTRUM'
 * @param {string} [meta.xUnit=''] - Units of the horizontal axis
 * @param {string} [meta.yUnit=''] - Units of the vertical axis
 * @returns {string} The JCAMP-DX file
 */
export function convertTextToJcamp(text, meta = {}) {
  const { info, data } = parseXYAndKeepInfo(text);

  return fromJSON(data, {
    info: {
      title: meta.title || '',
      dataType: meta.type || '',
      xUnits: meta.xUnit || '',
      yUnits: meta.yUnit || '',
    },
    meta: { header: info.map((entry) => entry.value).join('\n') },
  });
}
