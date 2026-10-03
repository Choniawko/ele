// Export a standalone SVG: include the mounting board, styles and full model
// coordinates rather than the current pan/zoom viewport.
export function standaloneSvg(
  host: HTMLElement,
  width: number,
  height: number,
): string {
  const paper = host.querySelector<SVGSVGElement>(".electrical-paper > svg");
  if (!paper) throw new Error("Nie znaleziono arkusza eksportu.");
  const copy = paper.cloneNode(true) as SVGSVGElement;
  const originals = [paper, ...paper.querySelectorAll<SVGElement>("*")];
  const copies = [copy, ...copy.querySelectorAll<SVGElement>("*")];
  for (let i = 0; i < originals.length; i++) {
    const computed = getComputedStyle(originals[i]);
    for (const property of [
      "font-family",
      "font-size",
      "font-weight",
      "letter-spacing",
      "fill",
      "stroke",
      "stroke-width",
      "stroke-dasharray",
      "opacity",
      "visibility",
      "filter",
    ])
      copies[i].style.setProperty(
        property,
        computed.getPropertyValue(property),
      );
    if (originals[i].classList.contains("motor-rotor")) {
      for (const property of ["transform", "transform-origin", "transform-box"])
        copies[i].style.setProperty(
          property,
          computed.getPropertyValue(property),
        );
    }
  }
  copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  copy.setAttribute("width", String(width));
  copy.setAttribute("height", String(height));
  copy.setAttribute("viewBox", `0 0 ${width} ${height}`);
  copy.removeAttribute("style");
  copy.style.background = "white";
  copy
    .querySelector(".joint-layers")
    ?.setAttribute("transform", "translate(20 20)");
  copy.querySelector(".joint-grid-layer")?.remove();
  const background = host
    .querySelector(".board-background > g")
    ?.cloneNode(true) as SVGGElement | undefined;
  if (background) {
    background.removeAttribute("style");
    background.setAttribute("transform", "translate(20 20)");
    copy.insertBefore(background, copy.querySelector(".joint-layers"));
  }
  copy
    .querySelectorAll(".app-port,.jj-link-wrapper")
    .forEach((el) => el.remove());
  copy.querySelectorAll('[role="button"]').forEach((el) => {
    el.removeAttribute("role");
    el.removeAttribute("tabindex");
  });
  return new XMLSerializer().serializeToString(copy);
}
