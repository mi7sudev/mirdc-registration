// Burst test: N concurrent registrations. Usage: node scripts/load-test.mjs [url] [n]
const base = (process.argv[2] || "http://127.0.0.1:3106").replace(/\/$/, "");
const n = parseInt(process.argv[3] || "100", 10);

function body(i) {
  return {
    attendance: "yes",
    surname: `Load${i}`,
    first_name: "Test",
    middle_initial: "L",
    agency: "DOST-MIRDC",
    position: "Tester",
    email: `loadtest${i}@mirdc.local`,
    contact_number: "09171234567",
    privacy_consent: true,
  };
}

async function one(i) {
  const t0 = Date.now();
  try {
    const res = await fetch(`${base}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body(i)),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, ms: Date.now() - t0, token: data.token, error: data.error };
  } catch (e) {
    return { ok: false, ms: Date.now() - t0, error: String(e) };
  }
}

const t0 = Date.now();
const results = await Promise.all(
  Array.from({ length: n }, (_, i) => one(i))
);
const total = Date.now() - t0;
const ok = results.filter((r) => r.ok && r.token);
const lat = results.map((r) => r.ms).sort((a, b) => a - b);
const tokens = new Set(results.map((r) => r.token).filter(Boolean));
console.log(`requests: ${n}, success: ${ok.length}, unique tokens: ${tokens.size}`);
console.log(`total wall: ${total}ms, min: ${lat[0]}ms, p50: ${lat[Math.floor(lat.length / 2)]}ms, p95: ${lat[Math.floor(lat.length * 0.95)]}ms, max: ${lat[lat.length - 1]}ms`);
for (const r of results.filter((r) => !r.ok).slice(0, 5)) {
  console.log("FAIL:", r.ms + "ms", r.error);
}
