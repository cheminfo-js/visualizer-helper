import md5 from '../../util/md5';
import { createTree } from '../libs/jcampconverter';

export function splitJcamp(file) {
  const jcamp = file.content;
  const newFiles = [];

  let tree = createTree(jcamp, { flatten: true });
  // keep oll FID and SPECTUM
  tree = tree.filter(
    (spectrum) =>
      spectrum.dataType &&
      spectrum.dataType.replaceAll(' ', '').match(/NMR(SPECTRUM|FID)/i),
  );

  // we group FID and SPECTRUM if both are presents
  // need to deal with only FID, only SPECTRUM or both
  const groups = [];
  let currentGroup;
  let lastKind = null;
  for (const entry of tree) {
    if (entry.dataType.match(/FID/i)) {
      if (lastKind === 'fid' || !currentGroup) {
        currentGroup = { fid: '', spectrum: '' };
        groups.push(currentGroup);
      }
      currentGroup.fid = entry;
      lastKind = 'fid';
    } else if (entry.dataType.match(/SPECTRUM/i)) {
      if (lastKind === 'spectrum' || !currentGroup) {
        currentGroup = { fid: '', spectrum: '' };
        groups.push(currentGroup);
      }
      currentGroup.spectrum = entry;
      lastKind = 'spectrum';
      // we assume that if both are presents, SPECTRUM is after FID
      currentGroup = null;
    }
  }

  // add md5
  for (const group of groups) {
    group.md5 = md5(group.fid.jcamp + group.spectrum.jcamp).slice(0, 5);
  }

  const baseFilename = file.filename.replace(/(\.fid|\.j?dx)/gi, '');
  console.log(file);
  for (const group of groups) {
    if (group.fid) {
      newFiles.push({
        content: group.fid.jcamp,
        contentType: 'chemical/x-jcamp-dx',
        filename: `${baseFilename  }.${  group.md5  }.fid.jdx`,
        mimetype: 'chemical/x-jcamp-dx',
        encoding: 'text',
      });
    }
    if (group.spectrum) {
      newFiles.push({
        content: group.spectrum.jcamp,
        contentType: 'chemical/x-jcamp-dx',
        filename: `${baseFilename  }.${  group.md5  }.jdx`,
        mimetype: 'chemical/x-jcamp-dx',
        encoding: 'text',
      });
    }
  }

  return newFiles;
}
