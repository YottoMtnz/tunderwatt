/* Thunderwatt · Dimensionador solar profesional
   Método: PVWatts/pvlib (PR = pérdidas encadenadas), HSP reales de Open-Meteo (solo al pulsar "Buscar sol real"),
   cables por intensidad (×1,25) + caída de tensión (Cu 70 °C). Orientativo: no sustituye al proyecto de un instalador. */
(() => {
'use strict';
const $ = id => document.getElementById(id), root = $('tool'); if (!root) return;
const N = (n, d = 0) => n.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
const I = (id, l, v, h = '', st = 'any') => `<label class="t-f" for="${id}"><span>${l}</span><input id="${id}" type="number" inputmode="decimal" step="${st}" min="0" value="${v}">${h ? `<small>${h}</small>` : ''}</label>`;
const S = (id, l, o, v, h = '') => `<label class="t-f" for="${id}"><span>${l}</span><select id="${id}">${o.map(([k, t]) => `<option value="${k}"${k == v ? ' selected' : ''}>${t}</option>`).join('')}</select>${h ? `<small>${h}</small>` : ''}</label>`;
const G = (t, b, o) => `<details class="t-g"${o ? ' open' : ''}><summary>${t}</summary><div class="t-r">${b}</div></details>`;

root.innerHTML = `<div class="t-form">${
G('1 · Tu consumo', S('unit', 'Unidad', [['m', 'kWh al mes'], ['d', 'kWh al día']], 'm') + I('cons', 'Consumo', 350, 'Está en tu factura de luz') +
  I('night', 'Consumo de noche (%)', 35, 'Viviendas: 30–45 %') + I('peak', 'Potencia máx. simultánea (kW)', '', 'Vacío = la estimamos') + I('tar', 'Precio de la luz (por kWh)', 0.15, '', '0.01') + I('exc', 'Pago por excedentes (por kWh)', 0.06, '', '0.01'), 1) +
G('2 · Ubicación y sol', `<div class="t-f t-wide"><span>Ciudad</span><div class="t-row"><input id="city" type="text" placeholder="Ej. Sevilla" autocomplete="off"><button type="button" id="geo" class="t-btn">Buscar sol real</button></div><small id="geoMsg">Consulta la radiación real de tu zona (Open-Meteo). Si no, usa los valores manuales.</small></div>` +
  I('hsp', 'Horas sol pico (HSP/día)', 4.5, 'Media anual sobre el panel') + I('hspMin', 'HSP del peor mes', 3, 'Se usa en sistemas aislados'), 1) +
G('3 · Tipo de sistema', S('type', 'Sistema', [['red', 'Conectado a red (sin batería)'], ['hib', 'Híbrido (red + batería)'], ['ais', 'Aislado (sin red)']], 'hib') +
  S('chem', 'Batería', [['li', 'Litio LiFePO₄ (DoD 90 %)'], ['pb', 'Plomo AGM/gel (DoD 50 %)']], 'li') + S('vbat', 'Tensión de batería', [[12, '12 V'], [24, '24 V'], [48, '48 V']], 48) +
  I('aut', 'Autonomía (días, aislado)', 1.5, '', '0.5') + I('cov', 'Cubrir (% del consumo)', 100, 'Red e híbrido'), 1) +
G('4 · Eficiencias', S('est', '¿Conoces las eficiencias?', [['1', 'No: estímalas por mí'], ['0', 'Sí: las introduzco']], '1', 'Estimar suma pérdidas típicas') +
  S('wp', 'Potencia del panel', [[400, '400 W'], [450, '450 W'], [550, '550 W'], [600, '600 W']], 450) +
  S('clima', 'Clima (temperatura)', [[0.07, 'Templado'], [0.11, 'Cálido'], [0.14, 'Muy cálido']], 0.07) + S('orient', 'Orientación / inclinación', [[0, 'Óptima (hacia el ecuador)'], [0.04, 'Intermedia (SE/SO)'], [0.1, 'Cubierta plana'], [0.15, 'Este/Oeste']], 0) +
  S('sombra', 'Sombras', [[0, 'Ninguna'], [0.05, 'Ligeras'], [0.12, 'Medias'], [0.25, 'Fuertes']], 0.05) + I('prM', 'Rendimiento del campo solar (%)', 82, 'Solo si las conoces') + I('invEff', 'Eficiencia del inversor (%)', 97, 'Solo si las conoces')) +
G('5 · Cableado (metros)', I('Ldc', 'Paneles → inversor (ida)', 15) + I('Lac', 'Inversor → cuadro (ida)', 10) + I('Lbat', 'Batería → inversor', 1.5, '', '0.5')) +
G('6 · Precios de referencia (edítalos)', `<label class="t-f"><span>Moneda</span><input id="cur" type="text" value="€" maxlength="4"></label>` + I('pWp', 'Paneles, por Wp', 0.2, '', '0.01') + I('pInv', 'Inversor de red, por kW', 160, 'Híbrido ≈ ×2 · aislado ≈ ×2,3') +
  I('pBat', 'Batería litio, por kWh', 280, 'Plomo ≈ ×0,55') + I('pStr', 'Estructura, por Wp', 0.09, '', '0.01') + I('pFix', 'Cuadro y protecciones (fijo)', 150) + I('pMo', 'Instalación, por Wp', 0.25, '', '0.01'))
}</div><div class="t-out" id="out" aria-live="polite"></div>`;

const KEY = 'tw-tool-1', fields = root.querySelectorAll('input,select');
try { const sv = JSON.parse(localStorage.getItem(KEY) || '{}'); fields.forEach(e => { if (sv[e.id] != null) e.value = sv[e.id]; }); } catch (e) {}

const v = id => +$(id).value || 0, s = id => $(id).value;
const STD = [1, 1.5, 2, 3, 3.6, 4, 5, 6, 8, 10, 12, 15, 20, 30], BRK = [10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125], FUS = [63, 80, 100, 125, 150, 200, 250, 300, 400];
const SEC = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95], AMP = [15, 21, 28, 36, 50, 68, 89, 110, 134, 171, 207];
const CP = { 1.5: 0.5, 2.5: 0.8, 4: 1.1, 6: 1.6, 10: 2.8, 16: 4.3, 25: 6.8, 35: 9.5, 50: 13, 70: 18, 95: 24 };
const up = (a, x) => a.find(y => y >= x) || Math.ceil(x);
function pick(i, L, V, maxDrop, k, min) {
  for (let j = 0; j < SEC.length; j++) { if (SEC[j] < min || AMP[j] < i * 1.25) continue; if (k * L * i * 0.0225 / (SEC[j] * V) * 100 <= maxDrop) return SEC[j]; }
  return SEC[SEC.length - 1];
}
const row = (a, b) => `<div class="t-i"><span>${a}</span><b>${b}</b></div>`;
const lk = t => `<a class="t-a" href="https://www.google.com/search?tbm=shop&q=${encodeURIComponent(t)}" target="_blank" rel="noopener">Google</a><a class="t-a" href="https://www.amazon.es/s?k=${encodeURIComponent(t)}" target="_blank" rel="noopener">Amazon</a>`;
let txt = '';

function calc() {
  const type = s('type'), est = s('est') === '1', li = s('chem') === 'li', ais = type === 'ais', bat = type !== 'red', cur = s('cur') || '€';
  ['clima', 'orient', 'sombra'].forEach(i => $(i).disabled = !est); ['prM', 'invEff'].forEach(i => $(i).disabled = est);
  $('aut').disabled = !ais; $('cov').disabled = ais; $('hspMin').disabled = !ais;
  const M = x => N(x, 0) + ' ' + cur;
  const daily = (s('unit') === 'm' ? v('cons') / 30 : v('cons')) || 0.1, night = Math.min(1, v('night') / 100), cov = Math.min(1.5, v('cov') / 100 || 1);
  const hspA = v('hsp') || 4.5, hsp = ais && v('hspMin') > 0 ? v('hspMin') : hspA;
  const eInv = est ? (type === 'red' ? 0.97 : 0.95) : v('invEff') / 100;
  const pf = est ? (1 - +s('clima')) * (1 - +s('orient')) * (1 - +s('sombra')) * 0.97 * 0.95 : v('prM') / 100, pr = pf * eInv, wp = +s('wp');
  const kwp0 = daily * (ais ? 1 : cov) / (hsp * pr), n = Math.max(1, Math.ceil(kwp0 * 1000 / wp)), kwp = n * wp / 1000, year = kwp * hspA * pr * 365;
  const peak = v('peak') || Math.max(1.5, daily / 5);
  let inv = up(STD, kwp / 1.15); if (bat) inv = Math.max(inv, up(STD, peak));
  const dod = li ? 0.9 : 0.5, eta = li ? 0.95 : 0.85, V = +s('vbat'), use = !bat ? 0 : ais ? daily * v('aut') : daily * night * cov, nom = use / (dod * eta), ah = nom * 1000 / V;
  const nS = Math.ceil(n / 12), isc = wp / 37, vS = Math.min(n, 12) * 34, sDc = pick(isc, v('Ldc'), vS, 1.5, 2, 4);
  const three = inv > 5, iac = inv * 1000 / (three ? 1.732 * 400 : 230), sAc = pick(iac, v('Lac'), three ? 400 : 230, 3, three ? 1.732 : 2, 2.5);
  const ib = bat ? inv * 1000 / (V * 0.95) : 0, sB = bat ? pick(ib, v('Lbat'), V, 1, 2, 10) : 0, brk = up(BRK, iac * 1.25), fus = bat ? up(FUS, ib * 1.25) : 0;
  const kI = type === 'red' ? 1 : type === 'hib' ? 2 : 2.3;
  const c = { pan: kwp * 1000 * v('pWp'), inv: inv * v('pInv') * kI, bat: nom * v('pBat') * (li ? 1 : 0.55), str: kwp * 1000 * v('pStr'), pro: v('pFix') + kwp * 30,
    cab: nS * 2 * v('Ldc') * CP[sDc] + (three ? 5 : 3) * v('Lac') * CP[sAc] + (bat ? 2 * v('Lbat') * CP[sB] : 0), ins: kwp * 1000 * v('pMo') };
  const total = Object.values(c).reduce((a, b) => a + b, 0), consY = daily * 365;
  const self = ais ? Math.min(year, consY) : bat ? Math.min(year * 0.92, consY * cov) : Math.min(year, consY * (1 - night) * 0.7);
  const save = self * v('tar') + Math.max(0, year - self) * v('exc'), pay = !ais && save > 0 ? total / save : 0, cover = Math.min(1, self / consY);
  const tn = { red: 'de red (string)', hib: 'híbrido', ais: 'aislado (off-grid)' }[type];
  const adv = ais ? `Necesitas un inversor-cargador <b>off-grid o híbrido</b> con MPPT, dimensionado para el peor mes (${N(hsp, 1)} HSP) y ${N(v('aut'), 1)} días de autonomía.`
    : type === 'red' ? `Un inversor <b>de red</b> es la opción más barata y eficiente. Cubrirías ≈${N(cover * 100)} % de tu consumo; la noche (${N(night * 100)} %) la compras a la red. ${night >= 0.4 ? '<b>Con tanto consumo nocturno te conviene valorar un híbrido.</b>' : 'Pasa a híbrido si superas ~40 % nocturno o quieres luz en apagones.'}`
    : `Un inversor <b>híbrido</b> guarda el sol del día para la noche (${N(use, 1)} kWh útiles/día) y puede dar respaldo en cortes. Cubrirías ≈${N(cover * 100)} % de tu consumo.`;
  const W = [];
  if (bat && V < (inv <= 1.5 ? 12 : inv <= 3 ? 24 : 48)) W.push(`Con ${N(inv, 1)} kW lo habitual es una batería de ${inv <= 3 ? 24 : 48} V: a ${V} V circulan ${N(ib)} A.`);
  if (!ais && v('hspMin') && hspA < 2.5) W.push('HSP muy bajas: revisa el valor o la ubicación.');
  W.push('Comprueba tensión Voc/rango MPPT y corriente máxima del inversor con la ficha técnica antes de comprar.');
  const items = [
    [`${n} × panel ${wp} W`, `${N(kwp, 2)} kWp · ${nS} string${nS > 1 ? 's' : ''} de ≈${Math.ceil(n / nS)}`, c.pan, `panel solar ${wp}W monocristalino`],
    [`Inversor ${tn} ${N(inv, 1)} kW`, three ? 'Trifásico 400 V' : 'Monofásico 230 V', c.inv, `inversor ${type === 'red' ? 'conexión a red' : type === 'hib' ? 'híbrido' : 'off grid ' + V + 'V'} ${inv}kW`]];
  if (bat) items.push([`Batería ${li ? 'LiFePO₄' : 'AGM'} ${N(nom, 1)} kWh`, `${V} V · ≈${N(ah)} Ah`, c.bat, `batería ${li ? 'litio LiFePO4' : 'AGM'} ${V}V ${Math.round(ah)}Ah`]);
  items.push(['Estructura de montaje', `${n} paneles`, c.str, `estructura montaje ${n} paneles solares`],
    ['Cable y protecciones', `Fusible CC, magnetotérmico ${brk} A, DPS`, c.cab + c.pro, `cable solar PV1-F ${sDc}mm2`], ['Instalación', 'Mano de obra y legalización', c.ins, '']);
  txt = `THUNDERWATT · Estimación\nPotencia ${N(kwp, 2)} kWp (${n} × ${wp} W) · Inversor ${tn} ${N(inv, 1)} kW${bat ? ' · Batería ' + N(nom, 1) + ' kWh ' + V + ' V' : ''}\nCable CC ${sDc} mm² · CA ${sAc} mm² (magnetotérmico ${brk} A)${bat ? ' · Batería ' + sB + ' mm² (fusible ' + fus + ' A)' : ''}\nProducción ${N(year)} kWh/año · Total ${M(total)}${pay ? ' · Retorno ≈' + N(pay, 1) + ' años' : ''}`;
  $('out').innerHTML = `<div class="t-k"><div><b>${N(kwp, 2)}</b><small>kWp · ${n} paneles</small></div><div><b>${N(inv, 1)}</b><small>kW inversor</small></div><div><b>${bat ? N(nom, 1) : '—'}</b><small>kWh batería</small></div><div><b>${N(year)}</b><small>kWh/año · PR ${N(pr * 100)} %</small></div></div>
<div class="t-box hl"><h3>Inversor recomendado: ${tn}</h3><p>${adv}</p></div>
<div class="t-box"><h3>Cableado recomendado</h3>${row('Paneles → inversor (CC, por string)', `${sDc} mm² · ${N(isc * 1.25, 1)} A`)}${row('Inversor → cuadro (CA)', `${sAc} mm² · magnetotérmico ${brk} A`)}${bat ? row('Batería → inversor', `${sB} mm² · fusible ${fus} A`) : ''}<small>Cobre; sección por intensidad (×1,25) y caída ≤ ${bat ? '1' : '1,5'} % CC / 3 % CA.</small></div>
<div class="t-box"><h3>Presupuesto y lista de compra</h3>${items.map(x => `<div class="t-i t-it"><span>${x[0]}<small>${x[1]}</small>${x[3] ? `<em>${lk(x[3])}</em>` : ''}</span><b>${M(x[2])}</b></div>`).join('')}<div class="t-i t-tot"><span>Total estimado</span><b>${M(total)}</b></div>
${ais ? '' : row('Ahorro anual estimado', M(save)) + row('Retorno de la inversión', pay ? N(pay, 1) + ' años' : '—')}<small>Precios de referencia editables, no en vivo: los botones abren la búsqueda de cada componente para comparar.</small></div>
<div class="t-box">${W.map(w => `<p class="t-warn">⚠ ${w}</p>`).join('')}</div>
<div class="t-acts"><button type="button" class="t-btn" data-a="copy">Copiar resumen</button><button type="button" class="t-btn t-ghost" data-a="print">Imprimir / PDF</button></div>`;
}

let q = 0;
const run = () => { if (q) return; q = requestAnimationFrame(() => { q = 0; calc(); const o = {}; fields.forEach(e => o[e.id] = e.value); try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }); };
root.addEventListener('input', run); root.addEventListener('change', run);
root.addEventListener('click', e => {
  const a = e.target.dataset && e.target.dataset.a;
  if (a === 'print') window.print();
  if (a === 'copy' && navigator.clipboard) navigator.clipboard.writeText(txt).then(() => { e.target.textContent = '¡Copiado!'; setTimeout(() => e.target.textContent = 'Copiar resumen', 1600); });
});

async function geo() {
  const m = $('geoMsg'), name = $('city').value.trim(); if (!name) return; m.textContent = 'Buscando…';
  try {
    const g = ((await (await fetch('https://geocoding-api.open-meteo.com/v1/search?count=1&language=es&name=' + encodeURIComponent(name))).json()).results || [])[0]; if (!g) throw 0;
    const r = await (await fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${g.latitude}&longitude=${g.longitude}&start_date=2023-01-01&end_date=2024-12-31&daily=shortwave_radiation_sum&timezone=auto`)).json(), mo = {};
    r.daily.time.forEach((t, i) => { const x = r.daily.shortwave_radiation_sum[i]; if (x != null) (mo[t.slice(5, 7)] = mo[t.slice(5, 7)] || []).push(x); });
    const av = Object.values(mo).map(a => a.reduce((p, c) => p + c, 0) / a.length / 3.6 * 1.1);
    $('hsp').value = (av.reduce((p, c) => p + c, 0) / av.length).toFixed(1); $('hspMin').value = Math.min(...av).toFixed(1);
    m.textContent = `${g.name}${g.admin1 ? ', ' + g.admin1 : ''}: ${$('hsp').value} HSP de media y ${$('hspMin').value} en el peor mes (Open-Meteo 2023–24, panel inclinado ≈ +10 %).`; run();
  } catch (e) { m.textContent = 'No se pudo consultar. Revisa el nombre o tu conexión, o escribe las HSP a mano.'; }
}
$('geo').addEventListener('click', geo);
$('city').addEventListener('keydown', e => { if (e.key === 'Enter') geo(); });
calc();
})();
