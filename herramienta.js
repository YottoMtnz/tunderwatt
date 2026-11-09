/* Thunderwatt · Dimensionador solar profesional · EE. UU. (NEC, AWG, 120/240 V)
   Método: PVWatts/pvlib (PR = pérdidas encadenadas), HSP reales de Open-Meteo (solo al pulsar "Buscar sol real"),
   cables por intensidad (×1,25) + caída de tensión (Cu 70 °C). Orientativo: no sustituye al proyecto de un instalador. */
(() => {
'use strict';
const $ = id => document.getElementById(id), root = $('tool'); if (!root) return;
const N = (n, d = 0) => n.toLocaleString('es-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const I = (id, l, v, h = '', st = 'any') => `<label class="t-f" for="${id}"><span>${l}</span><input id="${id}" type="number" inputmode="decimal" step="${st}" min="0" value="${v}">${h ? `<small>${h}</small>` : ''}</label>`;
const S = (id, l, o, v, h = '') => `<label class="t-f" for="${id}"><span>${l}</span><select id="${id}">${o.map(([k, t]) => `<option value="${k}"${k == v ? ' selected' : ''}>${t}</option>`).join('')}</select>${h ? `<small>${h}</small>` : ''}</label>`;
const G = (t, b, o) => `<details class="t-g"${o ? ' open' : ''}><summary>${t}</summary><div class="t-r">${b}</div></details>`;

const ST = 'AL:Alabama:15.8:N:h|AK:Alaska:25:F:h|AZ:Arizona:15.5:B|AR:Arkansas:13.5:B|CA:California:32:B|CO:Colorado:16:F|CT:Connecticut:30:F|DE:Delaware:17.5:F|DC:Washington D.C.:20:F|FL:Florida:15.5:F:f|GA:Georgia:15:B|HI:Hawaii:41:B|ID:Idaho:13.5:B|IL:Illinois:17:B|IN:Indiana:16:B|IA:Iowa:14:P|KS:Kansas:14.5:F|KY:Kentucky:14.5:B|LA:Louisiana:13:B|ME:Maine:28:P|MD:Maryland:19.5:F|MA:Massachusetts:31:F|MI:Michigan:20:B|MN:Minnesota:15.5:F|MS:Mississippi:14:B:h|MO:Missouri:13.5:F|MT:Montana:13.5:F|NE:Nebraska:12.5:P:h|NV:Nevada:14:P|NH:New Hampshire:26:P|NJ:New Jersey:21:F|NM:New Mexico:15:F|NY:New York:25:F|NC:North Carolina:14.5:P|ND:North Dakota:11.5:P|OH:Ohio:17:P|OK:Oklahoma:14:B:h|OR:Oregon:15.5:F|PA:Pennsylvania:19:F:h|RI:Rhode Island:29:F|SC:South Carolina:15.5:B:h|SD:South Dakota:13:N|TN:Tennessee:14:N|TX:Texas:16:N|UT:Utah:13:B|VT:Vermont:23:F|VA:Virginia:15.5:F|WA:Washington:12.5:P|WV:West Virginia:16:B|WI:Wisconsin:17:P|WY:Wyoming:14.5:F'
  .split('|').map(r => { const a = r.split(':'); return { c: a[0], n: a[1], p: +a[2], k: a[3], f: a[4] || '' }; });
const KT = { F: ['Net metering 1:1', 'Cada kWh que envías a la red se descuenta 1:1 de tu factura (los créditos se arrastran). El excedente anual se paga a costo evitado (~3–6 ¢).'],
  P: ['Net metering parcial o según tu compañía', 'El crédito puede ser menor al precio de venta o depender de tu utility y de la fecha de alta. Pide su tarifa vigente.'],
  B: ['Net billing (crédito reducido)', 'Lo que exportas se paga a un precio mucho menor del que pagas tú. Conviene consumir de día y, sobre todo, añadir batería.'],
  N: ['Sin mandato estatal', 'Depende de cada compañía: muchas pagan solo precio mayorista o nada. Pregunta antes de comprar.'] };

root.innerHTML = `<div class="t-form">${
G('1 · Tipo de sistema y estado', S('type', 'Modo', [['red', 'Conectado a la red (net metering)'], ['hib', 'Híbrido: red + batería y respaldo'], ['ais', 'Fuera de la red (corriente 24/7)']], 'red') +
  S('state', 'Tu estado', [['', '— Elige tu estado —'], ...ST.map(x => [x.c, x.n])], '', 'Cambia las reglas, el precio de la luz y lo que te pagan'), 1) +
G('2 · Tu consumo', S('unit', 'Unidad', [['m', 'kWh al mes'], ['d', 'kWh al día']], 'm') + I('cons', 'Consumo', 900, 'Está en tu factura (promedio EE. UU. ≈ 870 kWh/mes)') +
  I('night', 'Consumo de noche (%)', 35, 'Viviendas: 30–45 %') + I('peak', 'Potencia máx. simultánea (kW)', '', 'Vacío = la estimamos') + I('tar', 'Precio de la luz ($/kWh)', 0.185, 'Se rellena con el promedio de tu estado', '0.001') + I('exc', 'Pago por excedentes ($/kWh)', 0.04, 'Estimado según tu estado; edítalo', '0.001'), 1) +
G('3 · Ubicación y sol', `<div class="t-f t-wide"><span>Ciudad (EE. UU.)</span><div class="t-row"><input id="city" type="text" placeholder="Ej. Phoenix" autocomplete="off"><button type="button" id="geo" class="t-btn">Buscar sol real</button></div><small id="geoMsg">Consulta la radiación real de tu zona (Open-Meteo) y elige tu estado. Si no, usa los valores manuales.</small></div>` +
  I('hsp', 'Horas sol pico (HSP/día)', 4.5, 'Media anual sobre el panel') + I('hspMin', 'HSP del peor mes', 3, 'Se usa fuera de la red'), 1) +
G('4 · Batería y cobertura', S('chem', 'Batería', [['li', 'Litio LiFePO₄ (DoD 90 %)'], ['pb', 'Plomo AGM/gel (DoD 50 %)']], 'li') + S('vbat', 'Tensión de batería', [[12, '12 V'], [24, '24 V'], [48, '48 V']], 48) +
  I('aut', 'Autonomía (días sin sol)', 2, 'Fuera de la red: 2–3 días', '0.5') + I('cov', 'Cubrir (% del consumo)', 100, 'Red e híbrido')) +
G('5 · Eficiencias', S('est', '¿Conoces las eficiencias?', [['1', 'No: estímalas por mí'], ['0', 'Sí: las introduzco']], '1', 'Estimar suma pérdidas típicas') +
  S('wp', 'Potencia del panel', [[400, '400 W'], [450, '450 W'], [550, '550 W'], [600, '600 W']], 450) +
  S('clima', 'Clima (temperatura)', [[0.07, 'Templado'], [0.11, 'Cálido'], [0.14, 'Muy cálido']], 0.07) + S('orient', 'Orientación / inclinación', [[0, 'Sur (óptima)'], [0.04, 'Intermedia (SE/SO)'], [0.1, 'Azotea plana'], [0.15, 'Este/Oeste']], 0) +
  S('sombra', 'Sombras', [[0, 'Ninguna'], [0.05, 'Ligeras'], [0.12, 'Medias'], [0.25, 'Fuertes']], 0.05) + I('prM', 'Rendimiento del campo solar (%)', 82, 'Solo si las conoces') + I('invEff', 'Eficiencia del inversor (%)', 97, 'Solo si las conoces')) +
G('6 · Cableado (pies)', I('Ldc', 'Paneles → inversor (ida)', 50) + I('Lac', 'Inversor → panel eléctrico (ida)', 30) + I('Lbat', 'Batería → inversor', 5, '', '0.5')) +
G('7 · Precios de referencia en USD (edítalos)', I('pWp', 'Paneles, por W', 0.32, '', '0.01') + I('pInv', 'Inversor de red, por kW', 180, 'Híbrido ≈ ×2,5 · aislado ≈ ×2,8') +
  I('pBat', 'Batería litio, por kWh', 350, 'Plomo ≈ ×0,55') + I('pStr', 'Estructura, por W', 0.15, '', '0.01') + I('pFix', 'Panel y protecciones (fijo)', 300) + I('pMo', 'Instalación, permisos y margen, por W', 1.3, 'Pon 0 si lo instalas tú', '0.01'))
}</div><div class="t-out" id="out" aria-live="polite"></div>`;

const KEY = 'tw-tool-2', fields = root.querySelectorAll('input,select');
try { const sv = JSON.parse(localStorage.getItem(KEY) || '{}'); fields.forEach(e => { if (sv[e.id] != null) e.value = sv[e.id]; }); } catch (e) {}

const v = id => +$(id).value || 0, s = id => $(id).value;
const AW = ['14', '12', '10', '8', '6', '4', '3', '2', '1', '1/0', '2/0', '3/0', '4/0'], MM = [2.08, 3.31, 5.26, 8.37, 13.3, 21.2, 26.7, 33.6, 42.4, 53.5, 67.4, 85, 107];
const AMP = [20, 25, 35, 50, 65, 85, 100, 115, 130, 150, 175, 200, 230], CP = [0.35, 0.5, 0.8, 1.2, 1.9, 3, 3.8, 4.8, 6, 7.5, 9.5, 12, 15];
const STD = [1.5, 2, 3, 3.8, 5, 6, 7.6, 10, 11.4, 15], BRK = [15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 125, 150, 175, 200], FUS = [60, 80, 100, 125, 150, 175, 200, 250, 300, 400];
const up = (a, x) => a.find(y => y >= x) || a[a.length - 1];
const pick = (i, L, V, mx, k, m) => { for (let j = m; j < AW.length; j++) { if (AMP[j] < i * 1.25) continue; if (k * L * 0.3048 * i * 0.0225 / (MM[j] * V) * 100 <= mx) return j; } return AW.length - 1; };
const row = (a, b) => `<div class="t-i"><span>${a}</span><b>${b}</b></div>`;
const lk = t => `<a class="t-a" href="https://www.google.com/search?tbm=shop&q=${encodeURIComponent(t)}" target="_blank" rel="noopener">Google</a><a class="t-a" href="https://www.amazon.com/s?k=${encodeURIComponent(t)}" target="_blank" rel="noopener">Amazon</a>`;
let txt = '';

function calc() {
  const type = s('type'), est = s('est') === '1', li = s('chem') === 'li', ais = type === 'ais', bat = !ais ? type === 'hib' : true;
  ['clima', 'orient', 'sombra'].forEach(i => $(i).disabled = !est); ['prM', 'invEff'].forEach(i => $(i).disabled = est);
  [['tar', ais], ['exc', ais], ['night', ais], ['cov', ais], ['aut', !ais], ['hspMin', !ais], ['chem', type === 'red'], ['vbat', type === 'red']].forEach(([i, h]) => $(i).closest('.t-f').style.display = h ? 'none' : '');
  const M = x => '$' + N(x), stt = ST.find(x => x.c === s('state')), nm = stt ? stt.k : '';
  const daily = (s('unit') === 'm' ? v('cons') / 30 : v('cons')) || 0.1, night = Math.min(1, v('night') / 100), cov = Math.min(1.5, v('cov') / 100 || 1);
  const hspA = v('hsp') || 4.5, hsp = ais && v('hspMin') > 0 ? v('hspMin') : hspA;
  const eInv = est ? (type === 'red' ? 0.97 : 0.95) : v('invEff') / 100;
  const pf = est ? (1 - +s('clima')) * (1 - +s('orient')) * (1 - +s('sombra')) * 0.97 * 0.95 : v('prM') / 100, pr = pf * eInv, wp = +s('wp');
  const kwp0 = daily * (ais ? 1 : cov) / (hsp * pr), n = Math.max(1, Math.ceil(kwp0 * 1000 / wp)), kwp = n * wp / 1000, year = kwp * hspA * pr * 365;
  const peak = v('peak') || Math.max(1.5, daily / 5), need = kwp / 1.15;
  let inv = need > 15 ? Math.ceil(need) : up(STD, need); if (bat) inv = Math.max(inv, up(STD, peak));
  const dod = li ? 0.9 : 0.5, eta = li ? 0.95 : 0.85, V = +s('vbat'), use = !bat ? 0 : ais ? daily * v('aut') : daily * night * cov, nom = use / (dod * eta), ah = nom * 1000 / V;
  const nS = Math.ceil(n / 12), isc = wp / 37, vS = Math.min(n, 12) * 34, dc = pick(isc, v('Ldc'), vS, 1.5, 2, 2);
  const iac = inv * 1000 / 240, ac = pick(iac, v('Lac'), 240, 3, 2, 1);
  const ib = bat ? inv * 1000 / (V * 0.95) : 0, bc = bat ? pick(ib, v('Lbat'), V, 1, 2, 4) : 0, brk = up(BRK, iac * 1.25), fus = bat ? up(FUS, ib * 1.25) : 0;
  const kI = type === 'red' ? 1 : type === 'hib' ? 2.5 : 2.8;
  const c = { pan: kwp * 1000 * v('pWp'), inv: inv * v('pInv') * kI, bat: nom * v('pBat') * (li ? 1 : 0.55), str: kwp * 1000 * v('pStr'), pro: v('pFix') + kwp * 30,
    cab: nS * 2 * v('Ldc') * CP[dc] + 3.5 * v('Lac') * CP[ac] + (bat ? 2 * v('Lbat') * CP[bc] : 0), ins: kwp * 1000 * v('pMo') };
  const total = Object.values(c).reduce((a, b) => a + b, 0), consY = daily * 365;
  let self, save = 0;
  if (ais) self = Math.min(year, consY);
  else if (nm === 'F') { self = Math.min(year, consY * cov); save = self * v('tar') + Math.max(0, year - self) * v('exc'); }
  else { self = bat ? Math.min(year * 0.92, consY * cov) : Math.min(year, consY * (1 - night) * 0.7); save = self * v('tar') + Math.max(0, year - self) * v('exc'); }
  const pay = !ais && save > 0 ? total / save : 0, cover = Math.min(1, self / consY);
  const tn = { red: 'de red (string)', hib: 'híbrido', ais: 'off-grid' }[type], gen = ais ? up([2, 3, 3.5, 5, 7.5, 10, 12], inv * 0.7) : 0;
  const adv = ais ? `Para tener corriente <b>24/7</b> necesitas un inversor-cargador <b>off-grid o híbrido</b> con MPPT. Está dimensionado para el peor mes (${N(hsp, 1)} HSP), ${N(v('aut'), 1)} días de autonomía y ${N(daily, 1)} kWh/día. Añade un <b>generador de respaldo de ≈${N(gen, 1)} kW</b> para rachas de varios días nublados.`
    : type === 'red' ? `Un inversor <b>de red</b> es la opción más barata y eficiente, pero se apaga si cae la red. Cubrirías ≈${N(cover * 100)} % de tu consumo. ${nm === 'B' || nm === 'N' ? '<b>En tu estado exportar se paga poco: valora un híbrido con batería.</b>' : night >= 0.4 ? '<b>Con tanto consumo nocturno valora un híbrido.</b>' : 'Pasa a híbrido si quieres luz en apagones.'}`
    : `Un inversor <b>híbrido</b> guarda el sol del día (${N(use, 1)} kWh útiles/día) y da respaldo en apagones. ${nm === 'F' ? 'Con net metering 1:1 la batería rara vez se paga sola: su valor es el respaldo.' : 'Cubrirías ≈' + N(cover * 100) + ' % de tu consumo.'}`;
  const W = [];
  if (bat && V < (inv <= 1.5 ? 12 : inv <= 3 ? 24 : 48)) W.push(`Con ${N(inv, 1)} kW lo habitual es batería de ${inv <= 3 ? 24 : 48} V: a ${V} V circulan ${N(ib)} A.`);
  if (inv > 11.4) W.push('Más de 11,4 kW (≈48 A a 240 V) suele requerir 2 inversores en paralelo o servicio mayor.');
  W.push(ais ? 'Usa equipos con certificación UL 1741 / UL 9540 y protección de sobrecorriente en cada tramo (NEC 690/706); el inspector y el seguro lo piden.'
    : 'Regla del 120 % (NEC 705.12): breaker del inversor + principal ≤ 120 % de la barra. Pide el acuerdo de interconexión a tu compañía antes de encender (y apagado rápido, NEC 690.12).');
  W.push('Comprueba Voc/rango MPPT y corriente máxima del inversor con la ficha técnica antes de comprar.');
  const items = [[`${n} × panel ${wp} W`, `${N(kwp, 2)} kWp · ${nS} string${nS > 1 ? 's' : ''} de ≈${Math.ceil(n / nS)}`, c.pan, `solar panel ${wp}W monocrystalline`],
    [`Inversor ${tn} ${N(inv, 1)} kW`, '120/240 V split-phase', c.inv, `${type === 'red' ? 'grid tie' : type === 'hib' ? 'hybrid' : 'off grid'} solar inverter ${inv}kW 240V`]];
  if (bat) items.push([`Batería ${li ? 'LiFePO₄' : 'AGM'} ${N(nom, 1)} kWh`, `${V} V · ≈${N(ah)} Ah`, c.bat, `${li ? 'LiFePO4' : 'AGM'} battery ${V}V ${Math.round(ah)}Ah`]);
  items.push(['Estructura de montaje', `${n} paneles`, c.str, `solar panel roof mount rails ${n} panels`], ['Cable y protecciones', `Fusible CC, breaker ${brk} A, SPD`, c.cab + c.pro, `PV wire ${AW[dc]} AWG`], ['Instalación', 'Mano de obra, permisos y margen', c.ins, '']);
  const stBox = !stt ? '<div class="t-box"><h3>Leyes de tu estado</h3><p>Elige tu estado para ver cuánto pagas, cuánto te pagan y qué dice la ley sobre vivir fuera de la red.</p></div>'
    : `<div class="t-box hl"><h3>${stt.n}: ${ais ? 'vivir fuera de la red' : 'lo que pagas y lo que te pagan'}</h3>${ais
      ? `<p>En EE. UU. no hay una ley estatal que prohíba la energía solar aislada: las limitaciones son locales (ciudad o condado): permisos de construcción y eléctrico y, en algunos condados, la obligación de conectarse a la red si hay línea disponible.${stt.f.includes('f') ? ' <b>En Florida esto se cita con frecuencia: confírmalo con el condado antes de comprar.</b>' : ''}</p>`
      : `<p><b>${KT[nm][0]}.</b> ${KT[nm][1]}</p><p>Pagas ≈ ${N(stt.p, 1)} ¢/kWh de media más un cargo fijo mensual que varía por compañía.</p>`}${stt.f.includes('h') ? `<p>${stt.n} no tiene ley de acceso solar: una HOA podría prohibirte los paneles.</p>` : ''}<p>El crédito federal del 30 % para propietarios terminó el 31/12/2025: no está en el presupuesto.</p><small>Clasificación orientativa (NCCETC y fuentes públicas); cambia cada trimestre y según la compañía. <a class="t-a" href="https://www.google.com/search?q=${encodeURIComponent(stt.n + ' utility net metering interconnection rules')}" target="_blank" rel="noopener">Verificar</a></small></div>`;
  txt = `THUNDERWATT · Estimación ${stt ? stt.n : ''}\n${N(kwp, 2)} kWp (${n} × ${wp} W) · Inversor ${tn} ${N(inv, 1)} kW${bat ? ' · Batería ' + N(nom, 1) + ' kWh ' + V + ' V' : ''}\nCable CC ${AW[dc]} AWG · CA ${AW[ac]} AWG (breaker ${brk} A)${bat ? ' · Batería ' + AW[bc] + ' AWG (fusible ' + fus + ' A)' : ''}\nProducción ${N(year)} kWh/año · Total ${M(total)}${pay ? ' · Retorno ≈' + N(pay, 1) + ' años' : ''}`;
  $('out').innerHTML = `<div class="t-k"><div><b>${N(kwp, 2)}</b><small>kWp · ${n} paneles</small></div><div><b>${N(inv, 1)}</b><small>kW inversor</small></div><div><b>${bat ? N(nom, 1) : '—'}</b><small>kWh batería</small></div><div><b>${ais ? N(daily, 1) : N(year)}</b><small>${ais ? 'kWh/día 24/7 · ' : 'kWh/año · '}PR ${N(pr * 100)} %</small></div></div>
<div class="t-box hl"><h3>Inversor recomendado: ${tn}</h3><p>${adv}</p></div>${stBox}
<div class="t-box"><h3>Cableado recomendado (cobre, AWG)</h3>${row('Paneles → inversor (CC, por string)', `${AW[dc]} AWG · ${N(isc * 1.25, 1)} A`)}${row('Inversor → panel eléctrico (CA 240 V)', `${AW[ac]} AWG · breaker ${brk} A`)}${bat ? row('Batería → inversor', `${AW[bc]} AWG · fusible ${fus} A`) : ''}<small>Sección por intensidad (×1,25, 75 °C) y caída ≤ ${bat ? '1' : '1,5'} % CC / 3 % CA.</small></div>
<div class="t-box"><h3>Presupuesto y lista de compra</h3>${items.map(x => `<div class="t-i t-it"><span>${x[0]}<small>${x[1]}</small>${x[3] ? `<em>${lk(x[3])}</em>` : ''}</span><b>${M(x[2])}</b></div>`).join('')}<div class="t-i t-tot"><span>Total estimado</span><b>${M(total)}</b></div>
${ais ? '' : row('Ahorro anual estimado', M(save)) + row('Retorno de la inversión', pay ? N(pay, 1) + ' años' : '—')}<small>Precios de referencia editables, no en vivo: los botones abren la búsqueda de cada componente para comparar.</small></div>
<div class="t-box">${W.map(w => `<p class="t-warn">⚠ ${w}</p>`).join('')}</div>
<div class="t-acts"><button type="button" class="t-btn" data-a="copy">Copiar resumen</button><button type="button" class="t-btn t-ghost" data-a="print">Imprimir / PDF</button></div>`;
}

const applyState = () => { const x = ST.find(y => y.c === s('state')); if (!x) return; $('tar').value = (x.p / 100).toFixed(3); $('exc').value = (x.k === 'F' ? 0.04 : x.k === 'P' ? x.p / 100 * 0.6 : x.k === 'B' ? 0.07 : 0.04).toFixed(3); };

let q = 0;
const run = () => { if (q) return; q = requestAnimationFrame(() => { q = 0; calc(); const o = {}; fields.forEach(e => o[e.id] = e.value); try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }); };
root.addEventListener('input', run); root.addEventListener('change', e => { if (e.target.id === 'state') applyState(); run(); });
root.addEventListener('click', e => {
  const a = e.target.dataset && e.target.dataset.a;
  if (a === 'print') window.print();
  if (a === 'copy' && navigator.clipboard) navigator.clipboard.writeText(txt).then(() => { e.target.textContent = '¡Copiado!'; setTimeout(() => e.target.textContent = 'Copiar resumen', 1600); });
});

async function geo() {
  const m = $('geoMsg'), name = $('city').value.trim(); if (!name) return; m.textContent = 'Buscando…';
  try {
    const g = ((await (await fetch('https://geocoding-api.open-meteo.com/v1/search?count=1&language=es&countryCode=US&name=' + encodeURIComponent(name))).json()).results || [])[0]; if (!g) throw 0;
    const r = await (await fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${g.latitude}&longitude=${g.longitude}&start_date=2023-01-01&end_date=2024-12-31&daily=shortwave_radiation_sum&timezone=auto`)).json(), mo = {};
    r.daily.time.forEach((t, i) => { const x = r.daily.shortwave_radiation_sum[i]; if (x != null) (mo[t.slice(5, 7)] = mo[t.slice(5, 7)] || []).push(x); });
    const av = Object.values(mo).map(a => a.reduce((p, c) => p + c, 0) / a.length / 3.6 * 1.1);
    const sm = ST.find(x => x.n === g.admin1); if (sm) { $('state').value = sm.c; applyState(); }
    $('hsp').value = (av.reduce((p, c) => p + c, 0) / av.length).toFixed(1); $('hspMin').value = Math.min(...av).toFixed(1);
    m.textContent = `${g.name}${g.admin1 ? ', ' + g.admin1 : ''}: ${$('hsp').value} HSP de media y ${$('hspMin').value} en el peor mes (Open-Meteo 2023–24, panel inclinado ≈ +10 %).`; run();
  } catch (e) { m.textContent = 'No se pudo consultar. Revisa el nombre o tu conexión, o escribe las HSP a mano.'; }
}
$('geo').addEventListener('click', geo);
$('city').addEventListener('keydown', e => { if (e.key === 'Enter') geo(); });
calc();
})();
