/* Фото мест через Wikipedia REST (см. docs/05-architecture.md).
   В проде источник заменяется на Google Places Photos — интерфейс «url по месту» тот же. */
import { imgCache, cityImgCache } from '../store.js';
import { api } from './api.js';

/** Лениво подгрузить фото места и пропатчить все узлы [data-img="{id}"]. */
export async function fetchImg(p) {
  if (imgCache[p.id] !== undefined) return;
  imgCache[p.id] = null; // помечаем «в работе» — повторных запросов не будет
  try {
    const r = await fetch('https://ru.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(p.wiki));
    if (!r.ok) return;
    const j = await r.json();
    const u = j.thumbnail && j.thumbnail.source;
    if (u) {
      imgCache[p.id] = u;
      document.querySelectorAll('[data-img="' + p.id + '"]').forEach((n) => {
        n.innerHTML = '<img src="' + u + '" alt="" loading="lazy">';
      });
    }
  } catch { /* нет статьи / сеть — останется фолбэк-плитка */ }
}

/** Лениво подгрузить картинку города (кэш на сервере) и пропатчить [data-cityimg="{id}"]. */
export async function fetchCityImg(c) {
  if (cityImgCache[c.id] !== undefined) return;
  cityImgCache[c.id] = null; // «в работе»
  try {
    const u = await api.cityImage(c.name);
    if (u) {
      cityImgCache[c.id] = u;
      document.querySelectorAll('[data-cityimg="' + c.id + '"]').forEach((n) => {
        n.innerHTML = '<img src="' + u + '" alt="" loading="lazy">';
      });
    }
  } catch { /* нет картинки / сеть — останется иконка-плейсхолдер */ }
}
