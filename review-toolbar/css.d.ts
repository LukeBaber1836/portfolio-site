// esbuild loads .css as a string (see scripts/build-review-toolbar.mjs) for the shadow-root <style>.
declare module "*.css" {
  const css: string;
  export default css;
}
