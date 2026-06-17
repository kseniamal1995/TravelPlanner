/* Картинка города: отдаём из кэша БД, иначе тянем из Википедии, кэшируем и отдаём.
   GET /api/city-image?city=Париж → { url }  (url='' если картинки нет). */
import { Router } from 'express';
import { initDataAuth } from '../middleware/initData.js';
import { getCityImage, setCityImage } from '../cache.js';

const router = Router();

/** Найти фото города в русской Википедии (миниатюра из summary). */
async function fetchWikiImage(name) {
  const r = await fetch('https://ru.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(name));
  if (!r.ok) return '';
  const j = await r.json();
  return (j.thumbnail && j.thumbnail.source) || (j.originalimage && j.originalimage.source) || '';
}

router.get('/city-image', initDataAuth, async (req, res) => {
  const city = String(req.query.city || '').trim();
  if (!city) return res.json({ url: '' });
  try {
    let url = await getCityImage(city);          // undefined = ещё не искали
    if (url === undefined) {
      url = await fetchWikiImage(city);          // ищем один раз, потом кэш (даже пустой)
      await setCityImage(city, url);
    }
    res.json({ url: url || '' });
  } catch (e) {
    console.error('city-image failed:', e.message);
    res.json({ url: '' });
  }
});

export default router;
