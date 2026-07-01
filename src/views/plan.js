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
  const d0 = c.tripStart ? new Date(c.tripStart + 'T12:00:00') : null;
  const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  const monthYear = d0 ? MONTHS[d0.getMonth()] + ' ' + d0.getFullYear() : '';
  t += `<div class="ptitle">`
    + `<div class="phdr-left"><h1>${esc(c.name)}</h1>${monthYear ? `<span class="phsub">${monthYear}</span>` : ''}</div>`
    + `<div class="pbtns">`
    + `<button class="phbtn" onclick="shareTrip()" title="Поделиться маршрутом" aria-label="Поделиться">${ic('share', 20)}</button>`
    + `<button class="phbtn" onclick="openSettings()" title="Настройки поездки" aria-label="Настройки">${ic('sliders', 20)}</button>`
    + `</div></div></div>`;

  // табы дней (добавление/удаление дня — в настройках поездки → «Даты поездки»)
  t += '<div class="tabs">';
  tabs.forEach((d, i) => {
    const lab = dayLabel(c.tripStart, i);
    /* Чек «посещено» отключён — наработка «пройденный день» сохранена:
       const st = c.places.filter((p) => p.bucket === d.id && !p.nort);
       const full = st.length > 0 && st.every((p) => p.done);
       full → `<span class="idot full">${ic('check', 8)}</span>` */
    t += `<div class="tab${c.activeTab === d.id ? ' on' : ''}" data-day="${d.id}" onclick="setTab('${d.id}')"><div class="d">${lab.d}</div><div class="s">${lab.s || ''}</div><span class="idot lv-${intensity(c, d.id).level}"></span></div>`;
  });
  t += '</div>';

  // строка дня: кнопка маршрута слева, описание дня (нагрузка · счётчик · погода) справа
  const isArr = c.activeTab === c.arrivalDay;
  const dayObj = tabs.find((d) => d.id === c.activeTab);
  const inten = intensity(c, c.activeTab);
  const ru = routeUrl(c, c.activeTab);
  const list = c.places.filter((p) => p.bucket === c.activeTab).sort((a, b) => a.order - b.order);
  if (inten.stops) {
    let wxs = '';
    if (c.tripStart) {
      const di = tabs.findIndex((d) => d.id === c.activeTab);
      const dt = new Date(c.tripStart + 'T00:00:00');
      dt.setDate(dt.getDate() + di);
      wxs = `<span class="wx" data-wxd="${dt.toISOString().slice(0, 10)}"></span>`;
    }
    const cnt = `${inten.stops} ${plural(inten.stops, ['место', 'места', 'мест'])}`;
    // строка 1: маршрут (слева) + погода (справа); строка 2: нагрузка дня
    t += `<div class="dayhdr">`
      + `<div class="dayhdr-top">${ru ? `<a class="dl-route" href="${ru}" target="_blank" rel="noopener">${ic('route', 15)} Маршрут в Google Maps ${EXT}</a>` : '<span></span>'}${wxs}</div>`
      + `<div class="dl-meta"><i class="dl-dot lv-${inten.level}"></i>${inten.label} · ${cnt}</div>`
      + `</div>`;
  }

  if (isArr) t += arrivalRow(c);
  // перегон до первой точки дня
  if (dayObj && dayObj.first) {
    // готовые данные перегона (seed/ручной ввод): режим, время, куда — раскрывается
    const fl = dayObj.first;
    const canMore = !!fl.to;
    t += `<div class="startwrap${canMore ? ' canmore' : ''}"${canMore ? ' data-act="legmore" data-id="start"' : ''}>`
      + `<div class="leg startleg"><span class="txt">${ic('bed', 14)} Старт · ${legHtml(fl, false)}${canMore ? `<span class="chev">${ic('chdn', 14)}</span>` : ''}</span></div>`
      + (canMore ? `<div class="legdet">${esc(fl.to)}</div>` : '')
      + `</div>`;
  } else if (c.hotel && c.hotel.name && list.length) {
    // реальная ссылка «от отеля до первой точки» (origin = отель)
    const dst = list[0].rname || (list[0].name + ', ' + c.name);
    const url = 'https://www.google.com/maps/dir/?api=1&travelmode=walking&origin=' + encodeURIComponent(c.hotel.name + ' ' + c.name) + '&destination=' + encodeURIComponent(dst);
    t += `<a class="leg startleg startlink" href="${url}" target="_blank" rel="noopener"><span class="txt">${ic('bed', 14)} От отеля до «${esc(list[0].name)}» ${EXT}</span></a>`;
  }

  if (!list.length) {
    t += emptyHtml('sparkles', 'День пока пуст', 'Добавь места вручную — или перенеси из идей');
    t += `<div class="emptyact"><button class="btn acc" onclick="openAdd()">${ic('plus', 15)} Добавить место</button></div>`;
  }
  list.forEach((p, i) => {
    const d = Math.min(i, 8) * 28;
    if (p.sect) {
      t += `<div class="daypart" style="--d:${d}ms"><span class="ln"></span><span class="tt">${ic(p.sect.ic || 'moon', 13)} ${esc(p.sect.t)}</span><span class="ln"></span></div>`;
      if (p.sect.note) t += `<div class="dpnote" style="--d:${d}ms">${esc(p.sect.note)}</div>`;
    }
    t += stopHtml(p, c, d);
    if (p.leg && i < list.length - 1) t += `<div class="leg" style="--d:${Math.min(i + 1, 8) * 28}ms">${legHtml(p.leg, false, 16)}</div>`;
  });
  const lastId = tabs.length ? tabs[tabs.length - 1].id : null;
  if (c.activeTab === lastId) t += departureRow(c);
  if (list.length) t += `<div class="actions"><button class="btn acc" onclick="openAdd()">${ic('plus', 15)} Добавить место</button></div>`;
  return t;
}
