import type { Product } from "./index";
import type { MountingInfo } from "@model/distribution";
// Conservative explicit allowlist of renderer profiles. Unverified industrial
// fronts are excluded even when the product can mount on a DIN rail.
const modular = new Set([
  "hager-mbn116e",
  "edu-rcd",
  "edu-rcbo",
  "edu-mcb3",
  "edu-isolator",
  "edu-mcb-adjustable",
  "edu-indicator-green-230",
  "edu-bistable",
  "edu-staircase",
  "edu-timer",
]);
const terminals = new Set([
  "edu-bus-n",
  "edu-bus-pe",
  "edu-phase-distribution",
  "edu-junction-terminal",
  "edu-splice-3",
]);
export function mountingInfo(product: Product | undefined): MountingInfo {
  return {
    ...(product?.dimensions.value ?? { width: 0, height: 0 }),
    ...(product && modular.has(product.id)
      ? { zone: "modules" as const }
      : product && terminals.has(product.id)
        ? { zone: "terminals" as const }
        : {}),
  };
}
