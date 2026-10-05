import { checkReleaseRef } from "./lib/release";
await checkReleaseRef(process.env.ELE_RELEASE_TAG ?? "");
console.log("Tag, wersja, checkout i przynależność do main: OK.");
