// Ambient declarations for AMD path aliases resolved by RequireJS at runtime.
// These modules live in the npellet/visualizer source tree and are not
// available as local files — declare them as `any` so the IDE does not report
// "Cannot find module" errors.

declare module 'src/main/datas' {
  const value: any;
  export default value;
}

declare module 'src/util/api' {
  const value: any;
  export default value;
}

declare module 'src/util/color' {
  const value: any;
  export default value;
}

declare module 'src/util/couchdbAttachments' {
  const value: any;
  export default value;
}

declare module 'src/util/IDBKeyValue' {
  const value: any;
  export default value;
}

declare module 'src/util/tree' {
  const value: any;
  export default value;
}

declare module 'src/util/twig' {
  const value: any;
  export default value;
}

declare module 'src/util/typerenderer' {
  const value: any;
  export function addType(...args: any[]): any;
  export default value;
}

declare module 'src/util/ui' {
  const value: any;
  export function confirm(...args: any[]): any;
  export default value;
}

declare module 'src/util/util' {
  const value: any;
  export default value;
}

declare module 'src/util/versioning' {
  const value: any;
  export default value;
}
