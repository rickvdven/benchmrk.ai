// Font files are imported as binary data (esbuild loader "binary").
declare module '*.ttf' {
  const data: Uint8Array;
  export default data;
}
declare module '*.woff' {
  const data: Uint8Array;
  export default data;
}
