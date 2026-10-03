export interface Complex {
  re: number;
  im: number;
}
export const c = (re = 0, im = 0): Complex => ({ re, im });
export const add = (a: Complex, b: Complex): Complex =>
  c(a.re + b.re, a.im + b.im);
export const sub = (a: Complex, b: Complex): Complex =>
  c(a.re - b.re, a.im - b.im);
export const scale = (a: Complex, n: number): Complex => c(a.re * n, a.im * n);
export const magnitude = (a: Complex): number => Math.hypot(a.re, a.im);
export const phasor = (r: number, degrees: number): Complex =>
  c(
    r * Math.cos((degrees * Math.PI) / 180),
    r * Math.sin((degrees * Math.PI) / 180),
  );
export interface Branch {
  id: string;
  from: string;
  to: string;
  resistanceOhm: number;
  voltage?: Complex;
  domain?: "AC" | "DC";
  deviceId?: string;
  kind?: string;
}
export interface NetworkSolution {
  status: "valid" | "solver-error";
  voltages: Record<string, Complex>;
  currents: Record<string, Complex>;
  islands: Record<string, number>;
  domains: Record<string, "AC" | "DC" | "passive">;
  errors: string[];
  branches: Branch[];
}
// Pivoted Gaussian elimination. Resistive MNA has a real coefficient matrix;
// solve the real/imaginary RHS together to preserve the phase relation.
function linearSolve(
  a: Float64Array[],
  real: Float64Array,
  imag: Float64Array,
): { re: Float64Array; im: Float64Array } {
  const n = a.length;
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++)
      if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    if (Math.abs(a[pivot][col]) < 1e-12)
      throw new Error(
        "Osobliwa macierz: sprzeczne lub zależne źródła idealne.",
      );
    [a[pivot], a[col]] = [a[col], a[pivot]];
    [real[pivot], real[col]] = [real[col], real[pivot]];
    [imag[pivot], imag[col]] = [imag[col], imag[pivot]];
    for (let row = col + 1; row < n; row++) {
      const f = a[row][col] / a[col][col];
      if (!f) continue;
      a[row][col] = 0;
      for (let j = col + 1; j < n; j++) a[row][j] -= f * a[col][j];
      real[row] -= f * real[col];
      imag[row] -= f * imag[col];
    }
  }
  for (let row = n - 1; row >= 0; row--) {
    for (let j = row + 1; j < n; j++) {
      real[row] -= a[row][j] * real[j];
      imag[row] -= a[row][j] * imag[j];
    }
    real[row] /= a[row][row];
    imag[row] /= a[row][row];
    if (!Number.isFinite(real[row]) || !Number.isFinite(imag[row]))
      throw new Error("Wynik poza zakresem solvera.");
  }
  return { re: real, im: imag };
}
export function solveNetwork(
  branches: Branch[],
  extraNodes: string[] = [],
): NetworkSolution {
  const result: NetworkSolution = {
    status: "valid",
    voltages: {},
    currents: {},
    islands: {},
    domains: {},
    errors: [],
    branches,
  };
  try {
    if (branches.length > 2000) throw new Error("Limit 2000 gałęzi solvera.");
    const adjacency = new Map<string, Set<string>>();
    const touch = (n: string) => {
      if (!adjacency.has(n)) adjacency.set(n, new Set());
    };
    for (const n of extraNodes) touch(n);
    for (const b of branches) {
      if (
        !Number.isFinite(b.resistanceOhm) ||
        b.resistanceOhm < 0 ||
        (!b.voltage && b.resistanceOhm === 0)
      )
        throw new Error("Niepoprawna rezystancja gałęzi.");
      touch(b.from);
      touch(b.to);
      adjacency.get(b.from)!.add(b.to);
      adjacency.get(b.to)!.add(b.from);
    }
    const visited = new Set<string>();
    let island = 0;
    for (const first of adjacency.keys()) {
      if (visited.has(first)) continue;
      const nodes: string[] = [],
        queue = [first];
      visited.add(first);
      for (let q = 0; q < queue.length; q++) {
        const n = queue[q];
        nodes.push(n);
        result.islands[n] = island;
        for (const t of adjacency.get(n)!)
          if (!visited.has(t)) {
            visited.add(t);
            queue.push(t);
          }
      }
      const set = new Set(nodes),
        group = branches.filter((b) => set.has(b.from));
      const sources = group.filter((b) => b.voltage);
      const domains = new Set(
        sources
          .filter((b) => magnitude(b.voltage!) > 0)
          .map((b) => b.domain ?? "DC"),
      );
      if (domains.size > 1)
        throw new Error(
          "Połączono aktywne AC i DC w jednej wyspie. Analiza mieszana nie jest obsługiwana.",
        );
      const domain = domains.values().next().value ?? "passive";
      for (const n of nodes) result.domains[n] = domain;
      const ground = sources[0]?.to ?? nodes[0];
      const unknown = nodes.filter((n) => n !== ground),
        indices = new Map(unknown.map((n, i) => [n, i]));
      if (unknown.length + sources.length > 650)
        throw new Error("Limit 650 niewiadomych w jednej wyspie.");
      const size = unknown.length + sources.length;
      const a = Array.from({ length: size }, () => new Float64Array(size)),
        rhsR = new Float64Array(size),
        rhsI = new Float64Array(size);
      const stamp = (r: string, s: string, val: number) => {
        const i = indices.get(r),
          j = indices.get(s);
        if (i !== undefined && j !== undefined) a[i][j] += val;
      };
      let si = 0;
      for (const b of group) {
        if (b.voltage) {
          const idx = unknown.length + si++,
            from = indices.get(b.from),
            to = indices.get(b.to);
          if (from !== undefined) {
            a[from][idx] += 1;
            a[idx][from] += 1;
          }
          if (to !== undefined) {
            a[to][idx] -= 1;
            a[idx][to] -= 1;
          }
          a[idx][idx] -= b.resistanceOhm;
          rhsR[idx] = b.voltage.re;
          rhsI[idx] = b.voltage.im;
        } else {
          const g = 1 / b.resistanceOhm;
          stamp(b.from, b.from, g);
          stamp(b.to, b.to, g);
          stamp(b.from, b.to, -g);
          stamp(b.to, b.from, -g);
        }
      }
      const solved = linearSolve(a, rhsR, rhsI);
      result.voltages[ground] = c();
      for (const [n, i] of indices)
        result.voltages[n] = c(solved.re[i], solved.im[i]);
      si = 0;
      for (const b of group)
        result.currents[b.id] = b.voltage
          ? c(solved.re[unknown.length + si], solved.im[unknown.length + si++])
          : scale(
              sub(result.voltages[b.from], result.voltages[b.to]),
              1 / b.resistanceOhm,
            );
      island++;
    }
  } catch (error) {
    result.status = "solver-error";
    result.errors = [error instanceof Error ? error.message : "Błąd solvera"];
    result.voltages = {};
    result.currents = {};
  }
  return result;
}
export function voltageBetween(
  s: NetworkSolution,
  from: string,
  to: string,
): Complex | null {
  if (
    s.status !== "valid" ||
    s.islands[from] === undefined ||
    s.islands[from] !== s.islands[to] ||
    !s.voltages[from] ||
    !s.voltages[to]
  )
    return null;
  return sub(s.voltages[from], s.voltages[to]);
}
export function equivalentResistance(
  branches: Branch[],
  from: string,
  to: string,
): number | null {
  if (from === to) return 0;
  const test: Branch = {
    id: "measurement-test",
    from,
    to,
    resistanceOhm: 0,
    voltage: c(1),
    domain: "DC",
  };
  const result = solveNetwork([
    ...branches.map((b) =>
      b.voltage ? { ...b, voltage: c(), domain: "DC" as const } : b,
    ),
    test,
  ]);
  if (result.status !== "valid") return null;
  const current = magnitude(result.currents[test.id]);
  return current < 1e-10 ? null : 1 / current;
}
