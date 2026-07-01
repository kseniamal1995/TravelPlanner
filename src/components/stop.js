/* Карточка места (свёрнута по умолчанию). */
import { ic, STAR, EXT, PEN, TRASH } from '../icons.js';
import { esc, dayLabel } from '../lib/format.js';
import { IDEAS } from '../config.js';
import { placeBadge, placeBadgeId } from '../data/badges.js';
import { store, openCards, imgCache, imgQueue } from '../store.js';

export function stopHtml(p, c, dly) {
  const open = openCards.has(p.id);

  if (p.wiki && imgCache[p.id] === undefined) imgQueue.push(p);
  const emoId = placeBadgeId(p);
  const im = imgCache[p.id];
  const b = placeBadge(p);

  // строка 2: категория + алерт/заметка
  const alertBadge = p.warnS ? `<span class="salert" title="Предупреждение">${ic('warn', 12)}</span>` : '';
  const noteBadge  = p.userNote ? `<span class="snote" title="Есть заметка">${ic('note', 12)}</span>` : '';
  const tagsRow = `<div class="stags"><span class="badge">${ic(b.icon, 12)} ${b.label}</span>${alertBadge}${noteBadge}</div>`;

  // строка 3: рейтинг + статус билета
  let ticketStatus = '';
  if (p.booked || p.bought) ticketStatus = `<span class="sticket ok">${ic('ticket', 12)} Билет есть</span>`;
  else if (p.ticket && !p.skipTk) ticketStatus = `<span class="sticket need">${ic('ticket', 12)} Нужен билет</span>`;
  const metaRow = (p.rating || ticketStatus)
    ? `<div class="smeta">${p.rating ? `<span class="sstar">${STAR(12)} ${p.rating}</span>` : ''}${ticketStatus}</div>`
    : '';

  /* Чек «посещено» отключён (итерация 6) — наработка сохранена:
     класс done на карточке + кнопка vbtn + обработчик act==='visit' в events.js. */
  let h = `<div class="pswipe"${dly != null ? ` style="--d:${dly}ms"` : ''}><div class="pdel">${TRASH}</div>`
    + `<div class="stop${open ? ' open' : ''}${p.id === store.flashId ? ' flash' : ''}" data-act="card" data-id="${p.id}" data-cid="${c.id}">`
    + `<div class="stophead">`
    + `<div class="thumb" data-img="${p.id}">${im ? `<img src="${im}" alt="">` : `<img class="emoji" src="/emoji/${emoId}.png" alt="">`}</div>`
    + `<div class="sinfo"><div class="snmt">${esc(p.name)}</div>${tagsRow}${metaRow}</div>`
    + `</div>`;

  h += `<div class="cbody"><div class="cbin">`;
  if (p.visit) h += `<div class="vtime">${ic('clock', 13)} ${esc(p.visit)}</div>`;
  if (p.booked) h += `<div class="booked">${ic('check', 13)} Забронировано${p.bt ? ' · ' + p.bt : ''}</div>`;
  if (p.desc) h += `<div class="desc">${esc(stripUrl(p.desc))}</div>`;
  if (p.warnH) h += `<div class="warn warn-h">${ic('clock', 17)} <div>${esc(stripUrl(p.warnH))}</div></div>`;
  if (p.warnS) h += `<div class="warn warn-s">${ic('warn', 17)} <div>${esc(stripUrl(p.warnS))}</div></div>`;
  if (p.ticket || p.bought) {
    const have = (on) => `<button class="tkhave${on ? ' on' : ''}" data-act="buy" data-id="${p.id}"><span class="box">${on ? ic('check', 13) : ''}</span> Билет есть</button>`;
    let tkr = `<div class="tk">`;
    if (p.bought) {
      tkr += have(true);
    } else if (p.booked) {
      if (p.ticket && p.ticket.url) tkr += `<a class="tkbuy" href="${p.ticket.url}" target="_blank" rel="noopener">${ic('ticket', 13)} Билеты ${EXT}</a>`;
    } else if (p.ticket) {
      const price = p.ticket.price ? esc(p.ticket.price) : 'Билет';
      if (p.ticket.url) tkr += `<a class="tkbuy" href="${p.ticket.url}" target="_blank" rel="noopener">${ic('ticket', 13)} ${price} ${EXT}</a>`;
      else tkr += `<span class="chip">${ic('ticket', 13)} ${price}</span>`;
      tkr += have(false);
      if (p.ticket.lead) tkr += `<div class="lead">${esc(stripUrl(p.ticket.lead))}</div>`;
    }
    h += tkr + `</div>`;
  }
  if (p.userNote) h += `<div class="notepill">${ic('note', 13)} ${esc(p.userNote)}</div>`;

  let opts = '';
  const tabs = [...(c.days || []).map((d, i) => ({ id: d.id, d: dayLabel(c.tripStart, i).d })), ...IDEAS.map((x) => ({ id: x.id, d: x.t }))];
  tabs.forEach((tb) => { opts += `<option value="${tb.id}" ${tb.id === p.bucket ? 'selected' : ''}>${tb.d}</option>`; });

  h += `<div class="bottomrow">${p.gmaps ? `<a class="alink" href="${p.gmaps}" target="_blank" rel="noopener">${ic('pin', 13)} Google Maps ${EXT}</a>` : '<span></span>'}<button class="editbtn" data-act="toggle">${PEN} Изменить</button></div>`;
  h += `<div class="editbody"><textarea class="usernote" placeholder="Заметка…" data-act="note" data-id="${p.id}">${esc(p.userNote)}</textarea><div class="editctrl"><select class="mv" data-act="move" data-id="${p.id}">${opts}</select><button class="ic2 del" data-act="del" data-id="${p.id}">${TRASH}</button></div></div>`;
  h += `</div></div></div></div>`;
  return h;
}

function stripUrl(s) {
  return String(s ?? '').replace(/https?:\/\/\S+/g, '').replace(/\s{2,}/g, ' ').trim();
}
