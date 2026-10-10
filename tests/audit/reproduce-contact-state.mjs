// Run from the audited repository root (dependencies already installed):
// node --import tsx /absolute/path/reproduce-contact-state.mjs /absolute/path/ele
// Exit 1 means that at least one rendered live contact disagrees with the solver.
import process from 'node:process';
import console from 'node:console';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';

const repo = resolve(process.argv[2] || process.cwd());
const req = createRequire(resolve(repo, 'package.json'));
const React = req('react');
const { renderToStaticMarkup } = req('react-dom/server');
const fromRepo = (path) => import(pathToFileURL(resolve(repo, path)).href);
const { reference108 } = await fromRepo('packages/knowledge/reference-108.ts');
const { initialRuntime, advance, compile } = await fromRepo('packages/simulation/index.ts');
const { catalog } = await fromRepo('packages/device-catalog/index.ts');
const { DeviceFragment, fragmentClosed } = await fromRepo('packages/renderers/fragment.tsx');
const { FunctionalDiagram } = await fromRepo('packages/knowledge/Diagram.tsx');
const { measure } = await fromRepo('packages/measurements/index.ts');
const { searchExamKnowledge } = await fromRepo('packages/knowledge/exams.ts');
const { resolveKnowledge } = await fromRepo('packages/knowledge/bindings.ts');

function contactAttribute(markup, marker) {
  const groups = markup.match(/<g\b[^>]*>/g) || [];
  const g = groups.find((tag) => tag.includes(marker) && tag.includes('data-symbol-fragment="pole1"'));
  const value = g && g.match(/data-closed="(true|false)"/);
  if (!value) throw new Error('Expected contact SVG group was not found: ' + marker);
  return value[1] === 'true';
}

function runCase(welded) {
  const project = reference108.create();
  if (welded) project.faults.push({
    id: 'audit-weld', kind: 'welded-contact', targetId: 'K1',
    from: { deviceId: 'K1', terminalId: '1L1' },
    to: { deviceId: 'K1', terminalId: '2T1' },
    hidden: false, activeAtMs: 0,
  });
  const runtime = advance(project, initialRuntime(project), { type: 'power', on: true });
  const device = project.circuit.devices.find((d) => d.id === 'K1');
  const product = catalog[device.productId];
  const connection = product.topology.connections.find((c) => c.id === 'pole1');
  const scope = reference108.diagrams.find((s) => s.symbols.some((symbol) =>
    symbol.designation === 'K1' && symbol.fragmentId === 'pole1'));
  if (!scope) throw new Error('No K1 pole1 diagram scope found');
  const workbench = renderToStaticMarkup(React.createElement('svg', null,
    React.createElement(DeviceFragment, {
      product, device, connection, state: runtime.devices.K1, ownerId: 'K1',
    })));
  const functional = renderToStaticMarkup(React.createElement(FunctionalDiagram, {
    project, runtime, scope, live: true,
    highlight: { deviceIds: [], terminals: [] }, onHighlight: () => {},
  }));
  const solverClosed = compile(project, runtime).some((b) => b.id === 'K1/pole1');
  const workbenchClosed = contactAttribute(workbench, 'data-device="K1"');
  const functionalClosed = contactAttribute(functional, 'data-device-id="K1"');
  const off = advance(project, runtime, { type: 'power', on: false });
  const resistance = measure(project, off, {
    function: 'continuity',
    red: { deviceId: 'K1', terminalId: '1L1' },
    black: { deviceId: 'K1', terminalId: '2T1' },
    testVoltageV: 500, compensateLeads: true, rcdMultiplier: 1,
  });
  return {
    case: welded ? 'welded-pole1-coil-off' : 'healthy-pole1-coil-off',
    runtimeStatus: runtime.status,
    coil: runtime.devices.K1.coil,
    mechanism: runtime.devices.K1.mechanism,
    solverClosed, fragmentClosed: fragmentClosed(connection, runtime.devices.K1),
    workbenchClosed, functionalClosed,
    deenergizedResistance: resistance,
    agreement: solverClosed === workbenchClosed && solverClosed === functionalClosed,
  };
}

const cases = [runCase(false), runCase(true)];
const search = Object.fromEntries(['LC1D09P7', 'XB5AA35', 'stycznik'].map((q) => {
  const result = searchExamKnowledge(q);
  return [q, Object.fromEntries(Object.entries(result).map(([k, v]) => [k, v.length]))];
}));
const publishedWithoutKnowledge = Object.values(catalog)
  .filter((p) => p.published && !resolveKnowledge(p.id)).map((p) => p.id);
const pkg = JSON.parse(await readFile(resolve(repo, 'package.json'), 'utf8'));
console.log(JSON.stringify({
  auditedVersion: pkg.version, cases, search, publishedWithoutKnowledge,
  conclusion: cases.every((c) => c.agreement) ? 'PASS' : 'FAIL: live diagrams disagree with circuit solver',
}, null, 2));
if (cases.some((c) => !c.agreement)) process.exitCode = 1;
