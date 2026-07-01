import { bundleVanillaWebApp } from "@aurobore/build";

await bundleVanillaWebApp(process.cwd());
console.log("[build:web] bundled camera-demo → dist/");
