/* Идеи: под-вкладки Шопинг / Еда / На потом (те же карточки мест). */
import { ic } from '../icons.js';
import { IDEAS } from '../config.js';
import { store, city } from '../store.js';
import { stopHtml } from '../components/stop.js';
import { emptyHtml } from '../components/empty.js';

export function ideasHtml() {
  const c = city();
  let t = `<div class="pbar"><button class="back" onclick="goHome()">${ic('chevl', 15)} Поездки</button><div class="ptitle"><h1>Идеи</h1></div><div class="psub">Места вне плана дней</div></div>`;
  if (store.S.ideasHint) {
    t += `<div class="ideahint">${ic('bulb', 16)}<div>Не все локации поместились в маршрут. Посмотрите, куда ещё можно сходить, и оставляйте заметки.</div><button class="ideahint-x" onclick="dismissIdeasHint()" aria-label="Скрыть">✕</button></div>`;
  }
  t += '<div class="subtabs">' + IDEAS.map((x) => `<div class="subtab${store.ideasTab === x.id ? ' on' : ''}" onclick="setIdeas('${x.id}')">${ic(x.i, 15)} ${x.t}</div>`).join('') + '</div>';
  const list = c.places.filter((p) => p.bucket === store.ideasTab).sort((a, b) => a.order - b.order);
  if (!list.length) t += emptyHtml('bulb', 'Пока пусто', '');
  list.forEach((p, i) => { t += stopHtml(p, c, Math.min(i, 8) * 28); });
  t += `<div class="${list.length ? 'actions' : 'emptyact'}"><button class="btn acc" onclick="openAdd()">${ic('plus', 15)} Добавить место</button></div>`;
  return t;
}
