import Sample from './ExtSample';

export async function extSample(options = {}) {
  let sample = new Sample({}, options);
  await sample._initialized;
  return sample;
}
