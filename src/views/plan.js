/* План поездки по дням. См. docs/02-features.md «Поездка — план по дням». */
import { ic, EXT, legHtml } from '../icons.js';
import { esc, dayLabel, plural } from '../lib/format.js';
import { city, placeCount } from '../store.js';
import { intensity } from '../lib/intensity.js';
import { routeUrl } from '../lib/maps.js';
import { stopHtml } from '../components/stop.js';
import { arrivalRow, departureRow } from '../components/arrival.js';
import { cityDot } from '../lib/reminders.js';
import { emptyHtml } from '../components/empty.js';

export function planHtml() {
  const c = city();
  const tabs = c.days || [];
  let t = `<div class="pbar"><button class="back" onclick="goHome()">${ic('chevl', 15)} Поездки</button>`;
  const n = tabs.length;
  const pc = placeCount(c);
  const sub = pc ? `${pc} ${plural(pc, ['место', 'места', 'мест'])}` : `${n} ${plural(n, ['день', 'дня', 'дней'])}`;
  t += `<div class="ptitle"><h1>${esc(c.name)}</h1><div class="pbtns"><span class="psub">${sub}</span><button class="iconbtn${cityDot(c) ? ' hasdot' : ''}" onclick="goRem('trip')" title="Напоминания по поездке" aria-label="Напоминания">${ic('bell', 18)}</button></div></div></div>`;

  // табы дней: точка нагрузки + таб «+» для добавления дня
  t += '<div class="tabs">';
  tabs.forEach((d, i) => {
    const lab = dayLabel(c.tripStart, i);
    /* Чек «посещено» отключён — наработка «пройденный день» сохранена:
       const st = c.places.filter((p) => p.bucket === d.id && !p.nort);
       const full = st.length > 0 && st.every((p) => p.done);
       full → `<span class="idot full">${ic('check', 8)}</span>` */
    t += `<div class="tab${c.activeTab === d.id ? ' on' : ''}" data-day="${d.id}" onclick="setTab('${d.id}')"><div class="d">${lab.d}</div><div class="s">${lab.s || ''}</div><span class="idot lv-${intensity(c, d.id).level}"></span></div>`;
  });
  t += `<div class="tab add" onclick="addDay()" title="Добавить день">${ic('plus', 16)}</div>`;
  t += '</div>';

  // строка дня: кнопка маршрута слева, описание дня (нагрузка · счётчик · погода) справа
  const isArr = c.activeTab === c.arrivalDay;
  const dayObj = tabs.find((d) => d.id === c.activeTab);
  const inten = intensity(c, c.activeTab);
  const ru = routeUrl(c, c.activeTab);
  if (inten.stops) {
    let wxs = '';
    if (c.tripStart) {
      const di = tabs.findIndex((d) => d.id === c.activeTab);
      const dt = new Date(c.tripStart + 'T00:00:00');
      dt.setDate(dt.getDate() + di);
      wxs = `<span class="wx" data-wxd="${dt.toISOString().slice(0, 10)}"></span>`;
    }
    const cnt = `${inten.stops} ${plural(inten.stops, ['место', 'места', 'мест'])}`;
    const meta = `<span class="dl-meta">${wxs}<i class="dl-dot lv-${inten.level}"></i>${inten.label} · ${cnt}</span>`;
    t += `<div class="dayline">${ru ? `<a class="dl-route" href="${ru}" target="_blank" rel="noopener">${ic('route', 15)} Маршрут в Google Maps ${EXT}</a>` : ''}${meta}</div>`;
  }

  if (isArr) t += arrivalRow(c);
  // пилюля «Старт» — только при нестандартном старте дня
  if (dayObj && dayObj.first) t += `<div class="leg startleg"><span class="txt">${ic('bed', 14)} Старт · ${legHtml(dayObj.first, true)}</span></div>`;
  else if (!c.hotel) t += `<div class="leg startleg hotelhint" onclick="openArrival()"><span class="txt">${ic('bed', 14)} Добавьте отель — покажем путь до старта</span></div>`;

  const delBtn = tabs.length > 1 ? `<button class="ghostbtn danger" onclick="delDay('${c.activeTab}')">${ic('trash', 13)} Удалить день</button>` : '';
  const list = c.places.filter((p) => p.bucket === c.activeTab).sort((a, b) => a.order - b.order);
  if (!list.length) {
    t += emptyHtml('sparkles', 'День пока пуст', 'Добавь места вручную — или перенеси из идей');
    t += `<div class="emptyact"><button class="btn acc" onclick="openAdd()">${ic('plus', 15)} Добавить место</button>${delBtn}</div>`;
  }
  list.forEach((p, i) => {
    const d = Math.min(i, 8) * 28;
    if (p.sect) {
      t += `<div class="daypart" style="--d:${d}ms"><span class="ln"></span><span class="tt">${ic(p.sect.ic || 'moon', 13)} ${esc(p.sect.t)}</span><span class="ln"></span></div>`;
      if (p.sect.note) t += `<div class="dpnote" style="--d:${d}ms">${esc(p.sect.note)}</div>`;
    }
    t += stopHtml(p, c, d);
    if (p.leg && i < list.length - 1) t += `<div class="leg" style="--d:${Math.min(i + 1, 8) * 28}ms"><div class="ln"></div><span class="txt">${legHtml(p.leg, false)}</span></div>`;
  });
  const lastId = tabs.length ? tabs[tabs.length - 1].id : null;
  if (c.activeTab === lastId) t += departureRow(c);
  if (list.length) t += `<div class="actions"><button class="btn acc" onclick="openAdd()">${ic('plus', 15)} Добавить место</button><span style="flex:1"></span>${delBtn}</div>`;
  return t;
}
