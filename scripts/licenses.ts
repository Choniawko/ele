import { mkdir, copyFile } from "node:fs/promises";
await mkdir("public/licenses",{recursive:true});
for (const name of ["@joint/core","@joint/react","react","react-dom","dexie","zustand","zod","lucide-react"])
  await copyFile(`node_modules/${name}/LICENSE`,`public/licenses/${name.replaceAll("/","-").replace("@","")}.txt`);
