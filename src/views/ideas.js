/* Идеи: под-вкладки Шопинг / Еда / На потом (те же карточки мест). */
import { ic } from '../icons.js';
import { IDEAS } from '../config.js';
import { store, city } from '../store.js';
import { stopHtml } from '../components/stop.js';
import { emptyHtml } from '../components/empty.js';

export function ideasHtml() {
  const c = city();
  let t = `<div class="pbar"><button class="back" onclick="goHome()">${ic('chevl', 15)} Поездки</button><div class="ptitle"><h1>Идеи</h1></div></div>`;

  // Пока ни одной идеи — табы не показываем: только пустое состояние.
  const total = c.places.filter((p) => ['shop', 'food', 'later'].includes(p.bucket)).length;
  if (!total) {
    t += emptyHtml('bulb', 'Вы ещё не добавили идеи', 'Сохраняйте места, куда хочется зайти, и заметки — всё, что не вошло в план дней.');
    t += `<div class="emptyact"><button class="btn acc" onclick="openAdd()">${ic('plus', 15)} Добавить место</button></div>`;
    return t;
  }

  t += '<div class="subtabs">' + IDEAS.map((x) => `<div class="subtab${store.ideasTab === x.id ? ' on' : ''}" onclick="setIdeas('${x.id}')">${ic(x.i, 15)} ${x.t}</div>`).join('') + '</div>';
  const list = c.places.filter((p) => p.bucket === store.ideasTab).sort((a, b) => a.order - b.order);
  if (!list.length) t += emptyHtml('bulb', 'В этой вкладке пусто', '');
  list.forEach((p, i) => { t += stopHtml(p, c, Math.min(i, 8) * 28); });
  t += `<div class="${list.length ? 'actions' : 'emptyact'}"><button class="btn acc" onclick="openAdd()">${ic('plus', 15)} Добавить место</button></div>`;
  return t;
}
