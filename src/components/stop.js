/* Карточка места (свёрнута по умолчанию). См. docs/02-features.md «Карточка места».
   Свёрнутая = «что это + статус»: название, фото, категория, рейтинг, иконки
   предупреждения/заметки; справа по центру — бейдж билета и шеврон раскрытия.
   Текстовые детали — только в раскрывашке. */
import { ic, EXT, PEN, TRASH } from '../icons.js';
import { esc, dayLabel } from '../lib/format.js';
import { IDEAS } from '../config.js';
import { placeBadge, placeBadgeId } from '../data/badges.js';
import { store, openCards, imgCache, imgQueue } from '../store.js';

export function stopHtml(p, c, dly) {
  const open = openCards.has(p.id);

  // иконки в мета-строке: предупреждение (крупнее) и заметка
  const mics = [];
  if (p.warnS) mics.push(`<span class="mic alert" title="Предупреждение">${ic('warn', 15)}</span>`);
  if (p.userNote) mics.push(`<span class="mic" title="Есть заметка">${ic('note', 13)}</span>`);

  // бейдж билета — справа, рядом с шевроном; скрыт, если решили идти без билета
  let tkb = '';
  if (p.booked || p.bought) tkb = `<span class="tkb ok" title="Билет куплен / забронировано">${ic('ticket', 14)}</span>`;
  else if (p.ticket && !p.skipTk) tkb = `<span class="tkb need" title="Нужен билет">${ic('ticket', 14)}</span>`;

  if (p.wiki && imgCache[p.id] === undefined) imgQueue.push(p);
  const emoId = placeBadgeId(p);
  const im = imgCache[p.id];
  const b = placeBadge(p);
  const meta = `<div class="cmeta"><span class="badge">${ic(b.icon, 12)} ${b.label}</span>${p.rating ? `<span class="rt">★ ${p.rating}</span>` : ''}${mics.join('')}</div>`;

  /* Чек «посещено» отключён (фидбек итерации 6) — наработка сохранена:
     класс done на карточке + кнопка
     `<button class="vbtn${p.done ? ' on' : ''}" data-act="visit" data-id="${p.id}" title="Был(а) здесь">${ic('check', 15)}</button>`
     и обработчик act === 'visit' в events.js. */
  let h = `<div class="stop${open ? ' open' : ''}${p.id === store.flashId ? ' flash' : ''}" data-act="card" data-id="${p.id}"${dly != null ? ` style="--d:${dly}ms"` : ''}><div class="stophead"><div class="thumb" data-img="${p.id}">${im ? `<img src="${im}" alt="">` : `<img class="emoji" src="/emoji/${emoId}.png" alt="">`}</div><div class="nm"><div class="nmt">${esc(p.name)}</div>${meta}</div><div class="hright">${tkb}<span class="chev">${ic('chdn', 16)}</span></div></div>`;
  h += `<div class="cbody"><div class="cbin">`;
  if (p.visit) h += `<div class="vtime">${ic('clock', 13)} ${esc(p.visit)}</div>`;
  if (p.booked) h += `<div class="booked">${ic('check', 13)} Забронировано${p.bt ? ' · ' + p.bt : ''}</div>`;
  if (p.desc) h += `<div class="desc">${esc(p.desc)}</div>`;
  if (p.warnH) h += `<div class="warn warn-h">${ic('clock', 15)} <div>${p.warnH}</div></div>`;
  if (p.warnS) h += `<div class="warn warn-s">${ic('warn', 15)} <div>${p.warnS}</div></div>`;
  if (p.ticket || p.bought) {
    let tkr = `<div class="tk">`;
    if (p.skipTk && !p.bought && !p.booked) {
      // решение «иду без билета»: одна приглушённая строка + возврат
      tkr += `<span class="tkskip">${ic('ticket', 13)} Без билета — смотрю снаружи</span><button class="ghostbtn" data-act="skiptk" data-id="${p.id}">Нужен билет</button>`;
    } else {
      if (!p.booked) {
        if (!p.bought && p.ticket) tkr += `<span class="chip">${ic('ticket', 13)} ${esc(p.ticket.price)}</span>`;
        tkr += `<button class="tkbtn${p.bought ? ' done' : ''}" data-act="buy" data-id="${p.id}">${p.bought ? ic('check', 15) + ' Билет куплен' : 'Билет куплен?'}</button>`;
        if (!p.bought) tkr += `<button class="ghostbtn" data-act="skiptk" data-id="${p.id}">Не покупать</button>`;
      }
      if (p.ticket && p.ticket.url) tkr += `<a class="alink" href="${p.ticket.url}" target="_blank" rel="noopener">${ic('ticket', 13)} Билеты ${EXT}</a>`;
      if (p.ticket && p.ticket.lead && !p.booked && !p.bought) tkr += `<div class="lead">${p.ticket.lead}</div>`;
    }
    h += tkr + `</div>`;
  }
  if (p.userNote) h += `<div class="notepill">${ic('note', 13)} ${esc(p.userNote)}</div>`;

  let opts = '';
  const tabs = [...(c.days || []).map((d, i) => ({ id: d.id, d: dayLabel(c.tripStart, i).d })), ...IDEAS.map((x) => ({ id: x.id, d: x.t }))];
  tabs.forEach((tb) => { opts += `<option value="${tb.id}" ${tb.id === p.bucket ? 'selected' : ''}>${tb.d}</option>`; });

  h += `<div class="bottomrow">${p.gmaps ? `<a class="alink" href="${p.gmaps}" target="_blank" rel="noopener">${ic('pin', 13)} Google Maps ${EXT}</a>` : '<span></span>'}<button class="editbtn" data-act="toggle">${PEN} Изменить</button></div>`;
  h += `<div class="editbody"><textarea class="usernote" placeholder="Заметка…" data-act="note" data-id="${p.id}">${esc(p.userNote)}</textarea><div class="editctrl"><select class="mv" data-act="move" data-id="${p.id}">${opts}</select><button class="ic2 del" data-act="del" data-id="${p.id}">${TRASH}</button></div></div>`;
  h += `</div></div></div>`;
  return h;
}
