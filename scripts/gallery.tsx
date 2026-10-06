import { renderToStaticMarkup } from "react-dom/server";
import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { availableProducts } from "../packages/device-catalog/index";
import { DeviceThumbnail } from "../packages/renderers/index";
import { initialDevice } from "../packages/simulation/index";
const effects = await readFile(
  new URL("../packages/renderers/effects.css", import.meta.url),
  "utf8",
);
const receivers = availableProducts.filter((p) =>
  ["lamp", "heater", "fan", "motor"].includes(p.visualId),
);
const content = renderToStaticMarkup(
  <html lang="pl">
    <head>
      <meta charSet="UTF-8" />
      <title>Galeria przeglądu SVG</title>
      <style>{`body{background:#eff2e9;color:#254a39;font:15px system-ui;margin:30px}main{display:grid;grid-template-columns:repeat(5,1fr);gap:14px}article{background:white;border:1px solid #ccd7c6;padding:18px;border-radius:10px;min-height:210px}svg{width:100%;height:165px;overflow:visible}h2{font-size:13px;margin:12px 0 6px}small{font-size:11px}.receivers{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:24px 0}.states{display:grid;grid-template-columns:1fr 1fr;gap:12px}figure{margin:0}figcaption{text-align:center;font-size:12px;color:#6b7e69}.active figcaption{color:#28644f;font-weight:600}@media(max-width:900px){.receivers,main{grid-template-columns:repeat(2,1fr)}}${effects}`}</style>
    </head>
    <body>
      <h1>Pracownia · przegląd rodzin SVG</h1>
      <p>
        {availableProducts.filter((p) => !p.educational).length} rzeczywiste SKU
        oraz oddzielne profile dydaktyczne. Porty interaktywne sprawdzane w
        aplikacji.
      </p>
      <section
        className="receivers"
        aria-label="Odbiorniki wyłączone i podczas pracy"
      >
        {receivers.map((p) => (
          <article key={p.id} data-preview={p.visualId}>
            <h2>{p.displayNamePl}</h2>
            <div className="states">
              {[false, true].map((powered) => (
                <figure
                  key={String(powered)}
                  className={powered ? "active" : "idle"}
                >
                  <DeviceThumbnail
                    product={p}
                    state={{
                      ...initialDevice({
                        id: "preview",
                        designation: "",
                        productId: p.id,
                        productRevision: p.revision,
                        settings: p.defaults,
                      }),
                      powered,
                      direction: "123",
                    }}
                  />
                  <figcaption>
                    {powered ? "Podczas pracy" : "Wyłączony"}
                  </figcaption>
                </figure>
              ))}
            </div>
          </article>
        ))}
      </section>
      <main>
        {availableProducts
          .filter((p) => !receivers.includes(p))
          .map((p) => (
            <article key={p.id}>
              <DeviceThumbnail product={p} />
              <h2>{p.displayNamePl}</h2>
              <small>
                {p.educational ? "Dydaktyczny" : p.manufacturerPartNumber} ·{" "}
                {p.visualId}
              </small>
            </article>
          ))}
      </main>
    </body>
  </html>,
);
await mkdir("docs/qa", { recursive: true });
await writeFile("docs/qa/gallery.html", "<!doctype html>" + content);
const browser = await chromium.launch({ channel: "chrome" }),
  page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
await page.setContent(content);
await page.screenshot({ path: "docs/qa/gallery.png", fullPage: true });
await browser.close();
