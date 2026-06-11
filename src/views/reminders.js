/* Напоминания: из поездки (с «+») или со всех поездок (read-only). */
import { ic, EXT, CHDN } from '../icons.js';
import { esc, fmtDate, daysUntil, plural } from '../lib/format.js';
import { store, city, openRems } from '../store.js';
import { emptyHtml } from '../components/empty.js';

/** Разбить текст на первое предложение (заголовок) и остальное. */
function remSplit(text) {
  const i = text.indexOf('. ');
  if (i > -1) return [text.slice(0, i + 1), text.slice(i + 2)];
  return [text, ''];
}

export function remHtml() {
  const S = store.S;
  const all = store.remScope === 'all' || !S.activeCity;
  const cities = all ? Object.values(S.cities) : [city()];
  let items = [];
  cities.forEach((c) => { (c.reminders || []).forEach((r) => items.push({ ...r, city: c.name, cid: c.id })); });
  items.sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'));

  let t = `<div class="pbar"><button class="back" onclick="goHome()">${ic('chevl', 15)} Поездки</button><div class="ptitle"><h1>Напоминания</h1></div>${all ? '<div class="psub">Все поездки</div>' : ''}</div>`;
  if (!items.length) t += emptyHtml('bell', 'Нет напоминаний', '');
  items.forEach((r, ri) => {
    const du = daysUntil(r.due);
    let cls = 'ok', txt = r.due ? 'крайняя дата: ' + fmtDate(r.due) : '';
    if (du !== null) {
      if (du < 0) { cls = 'over'; txt = 'просрочено · ' + fmtDate(r.due); }
      else if (du <= 14) { cls = 'soon'; txt = (du === 0 ? 'сегодня' : 'через ' + du + ' ' + plural(du, ['день', 'дня', 'дней'])) + ' · ' + fmtDate(r.due); }
    }
    const sp = remSplit(r.text);
    const open = openRems.has(r.id);
    t += `<div class="rcard${open ? ' open' : ''}" style="--d:${Math.min(ri, 8) * 28}ms"><label class="rchk"><input type="checkbox" ${r.done ? 'checked' : ''} data-act="rem" data-id="${r.id}" data-cid="${r.cid}"></label><div class="rmain${sp[1] ? ' tappable' : ''}"${sp[1] ? ` data-act="remtoggle" data-id="${r.id}"` : ''}><div class="rt2 ${r.done ? 'done' : ''}">${esc(sp[0])}${sp[1] ? `<span class="chev">${CHDN}</span>` : ''}</div>${sp[1] ? `<div class="rdet"><div class="cbin"><div class="rdtext">${esc(sp[1])}</div></div></div>` : ''}<div class="rmeta">${all ? `<span class="rcity">${esc(r.city)}</span>` : ''}${txt ? `<span class="due ${cls}">${txt}</span>` : ''}${r.url ? `<a class="alink" href="${r.url}" target="_blank" rel="noopener">Открыть ${EXT}</a>` : ''}</div></div></div>`;
  });
  if (S.activeCity) t += `<div class="actions"><button class="btn acc" onclick="openRem()">${ic('plus', 15)} Напоминание</button></div>`;
  return t;
}
