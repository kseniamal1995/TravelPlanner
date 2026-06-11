/* Пустое состояние: иконка в круге + заголовок + опциональный текст. */
import { ic } from '../icons.js';

export function emptyHtml(icon, big, small) {
  return `<div class="empty"><div class="eico">${ic(icon, 24)}</div><div class="big">${big}</div>${small ? `<div>${small}</div>` : ''}</div>`;
}
