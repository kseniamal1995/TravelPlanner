/* Seed-данные Парижа (schema v15) — одновременно демо и эталон «человеческого» маршрута.
   См. docs/03-data-model.md. Поле cat — категория-бейдж (список в src/data/badges.js). */
import { g } from '../lib/maps.js';

export function seed() {
  const P = [];
  const add = (o) => {
    if (o.bought === undefined) o.bought = false;
    if (o.userNote === undefined) o.userNote = '';
    P.push(o);
    return o;
  };

  add({ id: 'd2_concorde', cat: 'sight', wiki: 'Площадь Согласия', bucket: 'd2', name: 'Площадь Согласия', rating: '4,6', pri: 'want', rname: 'Place de la Concorde, Paris', desc: 'Огромная площадь с обелиском, вид к Эйфелевой и на Елисейские.', gmaps: g('Place de la Concorde'), visit: '~20 мин', leg: { m: 'walk', t: '8 мин' } });
  add({ id: 'd2_tuileries', cat: 'park', wiki: 'Сад Тюильри', bucket: 'd2', name: 'Сад Тюильри', rating: '4,6', pri: 'want', rname: 'Jardin des Tuileries, Paris', desc: 'Сад со стульями у фонтанов между Согласием и Лувром.', gmaps: g('Jardin des Tuileries'), visit: '~40 мин', leg: { m: 'walk', t: '3 мин' } });
  add({ id: 'd2_angelina', cat: 'food', bucket: 'd2', name: 'Круассан в Angelina', rec: 1, rating: '4,4', pri: 'opt', rname: 'Angelina Rivoli, Paris', desc: 'Перекус: легендарные круассаны и горячий шоколад на rue de Rivoli у Тюильри.', warnH: 'Популярно — бывает очередь, но идёт быстро.', gmaps: g('Angelina rue de Rivoli'), visit: '~30 мин', leg: { m: 'walk', t: '5 мин' } });
  add({ id: 'd2_palaisroyal', cat: 'sight', wiki: 'Пале-Рояль', bucket: 'd2', name: 'Пале-Рояль', rating: '4,6', pri: 'opt', rname: 'Palais-Royal, Paris', desc: 'Тихий сад и полосатые колонны Бюрена во дворе дворца.', gmaps: g('Palais Royal'), visit: '~30 мин', leg: { m: 'walk', t: '3 мин' } });
  add({ id: 'd2_vivienne', cat: 'shop', wiki: 'Галерея Вивьен', bucket: 'd2', name: 'Галерея Вивьен', rec: 1, rating: '4,6', pri: 'opt', rname: 'Galerie Vivienne, Paris', desc: 'Самый красивый крытый пассаж Парижа — мозаичный пол, лавки и кафе.', gmaps: g('Galerie Vivienne'), visit: '~30 мин', leg: { m: 'walk', t: '8 мин' } });
  add({ id: 'd2_vendome', cat: 'sight', wiki: 'Вандомская площадь', bucket: 'd2', name: 'Вандомская площадь', rating: '4,7', pri: 'opt', rname: 'Place Vendome, Paris', desc: 'Колонна Наполеона, ювелиры и Ritz — по пути.', gmaps: g('Place Vendome'), visit: '~15 мин', leg: { m: 'walk', t: '10 мин' } });
  add({ id: 'd2_lafayette', cat: 'shop', wiki: 'Галери Лафайет', bucket: 'd2', name: 'Галерея Лафайет', rating: '4,5', pri: 'want', rname: 'Galeries Lafayette Haussmann, Paris', desc: 'Шопинг: универмаг под куполом у Гранд-Бульваров. Под €100 — нижние этажи; бесплатная крыша с видом.', gmaps: g('Galeries Lafayette Haussmann'), visit: '~1 ч', leg: { m: 'metro', t: '~20 мин' } });
  add({ id: 'd2_trocadero', cat: 'view', wiki: 'Трокадеро (Париж)', bucket: 'd2', name: 'Трокадеро — вид на Эйфелеву', rating: '4,6', pri: 'must', rname: 'Trocadéro, Paris', desc: 'Лучшая точка для фото башни. Наверх — 5 июля.', gmaps: g('Trocadero Gardens'), visit: '~40 мин', leg: { m: 'walk', t: '15 мин' } });
  add({ id: 'd2_champ', cat: 'park', wiki: 'Марсово поле (Париж)', bucket: 'd2', name: 'Марсово поле под Эйфелевой', rating: '4,7', pri: 'opt', rname: 'Champ de Mars, Paris', desc: 'Финал дня на газоне под башней — дождись подсветки и блёсток после заката.', gmaps: g('Champ de Mars Eiffel'), visit: '~1 ч' });

  add({ id: 'd3_louvre', cat: 'museum', wiki: 'Лувр', bucket: 'd3', name: 'Лувр', rating: '4,7', pri: 'must', booked: 1, bt: 'пт 9:30', rname: 'Louvre Museum, Paris', desc: 'Выбери 2–3 крыла — к обеду свободна.', ticket: { price: '€22 / €32 (не-ЕС)', lead: 'Слот забронирован на 9:30.', url: 'https://www.ticketlouvre.fr/' }, warnH: 'Закрыт по вторникам (у тебя пятница — ок).', gmaps: g('Louvre Museum'), visit: '~3 ч', leg: { m: 'walk', t: '5 мин' } });
  add({ id: 'd3_lunch', cat: 'food', bucket: 'd3', name: 'Обед без спешки', rec: 1, pri: 'opt', nort: 1, desc: 'После Лувра — сядь и спокойно поешь. Дальше всё рядом и пешком.', gmaps: g('bistro near Louvre'), visit: '~1–1,5 ч', leg: { m: 'walk', t: '12 мин' } });
  add({ id: 'd3_saintechapelle', cat: 'sight', wiki: 'Сент-Шапель', bucket: 'd3', name: 'Сент-Шапель', rating: '4,6', pri: 'want', rname: 'Sainte-Chapelle, Paris', desc: 'Готическая капелла с витражами от пола до потолка — заходи в солнце.', ticket: { price: '~€13 (combo ~€20)', lead: 'Слот желателен — бронь за неделю.', url: 'https://www.sainte-chapelle.fr/en' }, gmaps: g('Sainte-Chapelle'), visit: '~45 мин', leg: { m: 'walk', t: '2 мин' } });
  add({ id: 'd3_conciergerie', cat: 'museum', wiki: 'Консьержери', bucket: 'd3', name: 'Консьержери', rating: '4,4', pri: 'opt', rname: 'Conciergerie, Paris', desc: 'Дворец-тюрьма Марии-Антуанетты — в одном здании с Сент-Шапель. Бери combo-билет.', ticket: { price: '~€13 (combo ~€20)', lead: 'На месте или combo с Сент-Шапель.', url: 'https://www.paris-conciergerie.fr/en' }, gmaps: g('Conciergerie'), visit: '~40 мин', leg: { m: 'walk', t: '8 мин' } });
  add({ id: 'd3_notredame', cat: 'sight', wiki: 'Собор Парижской Богоматери', bucket: 'd3', name: 'Нотр-Дам-де-Пари', rating: '4,7', pri: 'must', rname: 'Notre-Dame de Paris', desc: 'Готический собор, заново открыт после реставрации — внутри светлее.', ticket: { price: 'Бесплатно (башни €16)', lead: '❗ Бронь слота открывается за 2–3 дня — см. напоминания.', url: 'https://www.notredamedeparis.fr/en/' }, gmaps: g('Notre-Dame de Paris'), visit: '~45 мин', leg: { m: 'walk', t: '10 мин' } });
  add({ id: 'd3_latin', cat: 'sight', wiki: 'Шекспир и компания', bucket: 'd3', name: 'Латинский квартал + Shakespeare and Co', rec: 1, rating: '4,6', pri: 'opt', rname: 'Shakespeare and Company, Paris', desc: 'Расслабленно: книжный напротив собора, узкие улочки, кофе.', gmaps: g('Shakespeare and Company bookstore'), visit: '~1 ч', leg: { m: 'walk', t: '10 мин' } });
  add({ id: 'd3_pantheon', cat: 'museum', wiki: 'Пантеон (Париж)', bucket: 'd3', name: 'Пантеон', rating: '4,6', pri: 'opt', rname: 'Pantheon, Paris', desc: 'Усыпальница великих + маятник Фуко. По пути к Люксембургу.', ticket: { price: '~€13', lead: 'Можно на месте.', url: 'https://www.paris-pantheon.fr/en' }, gmaps: g('Pantheon Paris'), visit: '~45 мин', leg: { m: 'walk', t: '10 мин' } });
  add({ id: 'd3_luxembourg', cat: 'park', wiki: 'Люксембургский сад', bucket: 'd3', name: 'Люксембургский сад', rating: '4,7', pri: 'opt', rname: 'Jardin du Luxembourg, Paris', desc: 'Финал дня на стуле у пруда.', gmaps: g('Jardin du Luxembourg'), visit: '~45 мин' });

  add({ id: 'd4_sacre', cat: 'sight', wiki: 'Базилика Сакре-Кёр', bucket: 'd4', name: 'Сакре-Кёр + Монмартр', rating: '4,7', pri: 'must', rname: 'Sacre-Coeur, Paris', desc: 'Белая базилика на холме — лучшая бесплатная панорама. Купол €7.', warnS: 'У лестницы — карманники и «браслетчики». Вещи поближе.', gmaps: g('Sacre-Coeur Montmartre'), visit: '~1,5 ч', leg: { m: 'walk', t: '5 мин' } });
  add({ id: 'd4_tertre', cat: 'sight', wiki: 'Площадь Тертр', bucket: 'd4', name: 'Площадь Тертр', rating: '4,5', pri: 'opt', rname: 'Place du Tertre, Paris', desc: 'Площадь художников — портретисты, кафе.', gmaps: g('Place du Tertre'), visit: '~30 мин', leg: { m: 'walk', t: '10 мин' } });
  add({ id: 'd4_moulin', cat: 'sight', wiki: 'Мулен Руж', bucket: 'd4', name: 'Мулен Руж', rating: '4,4', pri: 'opt', rname: 'Moulin Rouge, Paris', desc: 'Культовое кабаре — снаружи знаменитая мельница.', gmaps: g('Moulin Rouge'), visit: '~15 мин' });
  add({ id: 'd4_concert', cat: 'other', wiki: 'Стад де Франс', bucket: 'd4', name: '⭐ Концерт SOAD — Stade de France', rating: '', pri: 'must', nort: 1, rname: 'Stade de France, Saint-Denis', sect: { ic: 'moon', t: 'Вечер · концерт', note: 'К ~15:00 вернись в отель — переодеться и перекусить. До Stade de France ~35–40 мин на метро, выходи к 16:45.' }, desc: 'Якорь дня. SOAD + Queens of the Stone Age. Старт 18:30 (сидячие). Приходи к ~17:30. Отдельная поездка — в пеший маршрут не включаю.', ticket: { price: 'У тебя есть (сидячие)', lead: 'Билеты на руках — сверь сектор/вход.', url: 'https://www.stadefrance.com/en' }, warnS: 'Сен-Дени: держись толпы и света. Станции — RER B «La Plaine–Stade de France» или M14 до «Saint-Denis Pleyel». После концерта толпы: ценное во внутренние карманы.', gmaps: g('Stade de France'), visit: 'вечер' });
  add({ id: 'd4_bar', cat: 'food', bucket: 'd4', name: 'Бар с друзьями — SoPi', rec: 1, rating: '', pri: 'opt', nort: 1, desc: 'После концерта: бары South Pigalle по пути к отелю — живо и безопасно в толпе.', gmaps: g('South Pigalle SoPi bars'), visit: 'вечер' });

  add({ id: 'd5_opera', cat: 'sight', wiki: 'Опера Гарнье', bucket: 'd5', name: '🎭 Опера Гарнье — экскурсия', booked: 1, bt: 'вс 10:00', rating: '4,7', pri: 'must', rname: 'Palais Garnier, Paris', desc: 'Экскурсия забронирована на вс 10:00: парадная лестница, зал, плафон Шагала.', ticket: { price: '~€20', lead: 'Забронировано на 10:00.', url: 'https://www.operadeparis.fr/en/visits/palais-garnier' }, gmaps: g('Palais Garnier Opera'), visit: '~1,5 ч', leg: { m: 'metro', t: '~12 мин' } });
  add({ id: 'd5_dior', cat: 'museum', bucket: 'd5', name: 'Музей Dior (La Galerie Dior)', rating: '4,7', pri: 'must', rname: 'La Galerie Dior, Paris', desc: 'Музей Dior в особняке кутюрье: 75 лет коллекций, кафе внутри. Бери слот ~12:00.', ticket: { price: '€12', lead: '❗ Бронируй за несколько недель; в вс особенно. Вт закрыт (у тебя ок).', url: 'https://www.galeriedior.com/en' }, warnH: '11:00–19:00, последний вход 17:30.', gmaps: g('La Galerie Dior'), visit: '~2 ч', leg: { m: 'walk', t: '8 мин' } });
  add({ id: 'd5_champs', cat: 'shop', wiki: 'Елисейские Поля', bucket: 'd5', name: 'Елисейские поля + шопинг', rating: '4,5', pri: 'want', rname: 'Champs-Elysees, Paris', desc: 'Магазины открыты и в вс. Под €100: Zara, Sephora, Nike. Сады — передышка.', gmaps: g('Champs-Elysees'), visit: '~1,5 ч', leg: { m: 'walk', t: '15 мин' } });
  add({ id: 'd5_arc', cat: 'sight', wiki: 'Триумфальная арка (Париж)', bucket: 'd5', name: 'Триумфальная арка', rating: '4,7', pri: 'want', rname: 'Arc de Triomphe, Paris', desc: 'Арка Наполеона; с крыши — лучи 12 авеню и вид на Эйфелеву.', ticket: { price: '~€16 (крыша)', lead: 'Слот за пару недель в сезон.', url: 'https://www.paris-arc-de-triomphe.fr/en' }, gmaps: g('Arc de Triomphe'), visit: '~45 мин', leg: { m: 'walk', t: '12 мин' } });
  add({ id: 'd5_palais', cat: 'sight', wiki: 'Мост Александра III', bucket: 'd5', name: 'Пети-Пале + Гран-Пале + мост Александра III', rec: 1, rating: '4,8', pri: 'opt', rname: 'Pont Alexandre III, Paris', desc: 'Пети-Пале — бесплатный музей, рядом Гран-Пале и самый нарядный мост Парижа.', gmaps: g('Pont Alexandre III'), visit: '~1 ч', leg: { m: 'walk', t: '10 мин' } });
  add({ id: 'd5_invalides', cat: 'museum', wiki: 'Дом инвалидов', bucket: 'd5', name: 'Дом инвалидов', rating: '4,7', pri: 'opt', rname: 'Les Invalides, Paris', desc: 'Золотой купол, гробница Наполеона, музей армии.', ticket: { price: '~€15', lead: 'Можно на месте.', url: 'https://www.musee-armee.fr/en' }, gmaps: g('Les Invalides'), visit: '~1 ч', leg: { m: 'walk', t: '15 мин' } });
  add({ id: 'd5_liberty', cat: 'sight', wiki: 'Остров Лебедей', bucket: 'd5', name: 'Статуя Свободы (Île aux Cygnes)', rating: '4,5', pri: 'opt', rname: 'Statue of Liberty Ile aux Cygnes Paris', desc: 'Уменьшенная копия на островке на Сене — 10 мин от башни.', gmaps: g('Statue of Liberty Ile aux Cygnes'), visit: '~20 мин', leg: { m: 'walk', t: '10 мин' } });
  add({ id: 'd5_eiffel', cat: 'sight', wiki: 'Эйфелева башня', bucket: 'd5', name: 'Эйфелева башня', rating: '4,7', pri: 'must', rname: 'Eiffel Tower, Paris', desc: 'Подъём со стороны Марсова поля. Со 2-го уровня вид отличный и дешевле.', ticket: { price: 'до вершины ~€36,70', lead: '❗ Бронируй за 4–6 недель; закат и вершина уходят первыми.', url: 'https://www.toureiffel.paris/en' }, warnH: '~9:30–23:00.', gmaps: g('Eiffel Tower'), visit: '~2 ч' });

  add({ id: 'd6_batignolles', cat: 'park', sect: { ic: 'sun', t: 'Вариант A · прогулка' }, bucket: 'd6', name: 'Сквер Батиньоль', rec: 1, rating: '4,6', pri: 'opt', rname: 'Square des Batignolles, Paris', desc: 'Уютный сквер с прудом у отеля, кафе и рынок рядом.', gmaps: g('Square des Batignolles'), visit: '~45 мин', leg: { m: 'walk', t: '20 мин' } });
  add({ id: 'd6_monceau', cat: 'park', wiki: 'Парк Монсо', bucket: 'd6', name: 'Парк Монсо', rec: 1, rating: '4,6', pri: 'opt', rname: 'Parc Monceau, Paris', desc: 'Изящный парк со статуями и колоннадой — финал лёгкой прогулки.', gmaps: g('Parc Monceau'), visit: '~45 мин' });
  add({ id: 'd6_work', cat: 'food', sect: { ic: 'coffee', t: 'Вариант B · кафе с ноутбуком' }, bucket: 'd6', name: 'Поработать из кафе', rec: 1, pri: 'opt', nort: 1, desc: 'Ноутбук-френдли: Anticafé (оплата за время, розетки) или кафе в Batignolles. Удобно у Сен-Лазар — по пути к Орли.', gmaps: g('Anticafe Paris'), visit: 'до ~14:30' });
  // «Дорога в Орли» теперь рендерится как строка-подложка «Отъезд» (см. orlyOut/departureNote ниже).

  add({ id: 'sh_marais', cat: 'shop', wiki: 'Маре (квартал)', bucket: 'shop', name: 'Ле-Маре', rec: 1, pri: 'want', rname: 'Le Marais, Paris', desc: 'Лучшее под €100: бутики и винтаж. Открыт по воскресеньям. Рядом Вогезы и Бастилия.', gmaps: g('Le Marais shopping'), visit: '~2–3 ч' });
  add({ id: 'sh_jouffroy', cat: 'shop', bucket: 'shop', name: 'Пассаж Жуффруа + Панорама', rating: '4,5', pri: 'opt', rname: 'Passage Jouffroy, Paris', desc: 'Крытые галереи XIX в.: винтаж, открытки, кафе. Рядом с Оперой.', gmaps: g('Passage Jouffroy'), visit: '~1 ч' });
  add({ id: 'sh_vosges', cat: 'sight', wiki: 'Площадь Вогезов', bucket: 'shop', name: 'Площадь Вогезов', rating: '4,6', pri: 'opt', rname: 'Place des Vosges, Paris', desc: 'Старейшая площадь с аркадами — в связке с Маре.', gmaps: g('Place des Vosges'), visit: '~30 мин' });
  add({ id: 'sh_bastille', cat: 'sight', wiki: 'Площадь Бастилии', bucket: 'shop', name: 'Площадь Бастилии', rating: '4,3', pri: 'opt', rname: 'Place de la Bastille, Paris', desc: 'Июльская колонна; удобно гулять Маре и каналом.', gmaps: g('Place de la Bastille'), visit: '~20 мин' });
  add({ id: 'sh_halles', cat: 'shop', bucket: 'shop', name: 'Westfield Forum des Halles', rec: 1, pri: 'opt', rname: 'Westfield Forum des Halles, Paris', desc: 'Крытый ТЦ: масс-маркет под €100, допоздна; вариант на дождь.', gmaps: g('Westfield Forum des Halles'), visit: '~1,5 ч' });
  add({ id: 'sh_dauphine', cat: 'shop', bucket: 'shop', name: 'Marché Dauphine (блошиный)', rating: '4,2', pri: 'opt', rname: 'Marche Dauphine Saint-Ouen', desc: 'Блошиный рынок: винтаж, антиквариат. Сб–пн. Рядом с отелем.', warnS: 'Porte de Clignancourt: только днём и в выходные, карманники.', gmaps: g('Marche Dauphine Saint-Ouen'), visit: '~1,5 ч' });

  add({ id: 'fd_sentier', cat: 'food', bucket: 'food', name: 'Boulangerie du Sentier', rec: 1, pri: 'want', rname: 'Boulangerie du Sentier, Paris', desc: 'Лучший круассан Гран-Пари 2026 (2-й). Бюджетно, на вынос. Центр — удобно в день 1.', gmaps: g('Boulangerie du Sentier'), visit: 'перекус' });
  add({ id: 'fd_victoire', cat: 'food', bucket: 'food', name: 'Boulangerie Victoire', rec: 1, pri: 'opt', rname: 'Boulangerie Victoire 12 rue Cadet, Paris', desc: 'Призёр конкурса круассанов, 12 rue Cadet (9-й) — рядом с Оперой и Лафайет. Бюджетно.', gmaps: g('Boulangerie Victoire rue Cadet'), visit: 'перекус' });
  add({ id: 'fd_parisienne', cat: 'food', bucket: 'food', name: 'La Parisienne', rec: 1, pri: 'opt', rname: 'La Parisienne bakery Saint-Placide, Paris', desc: 'Пекарня-чемпион у Сен-Жермен — удобно к Латинскому кварталу (день 3). Бюджетно.', gmaps: g('La Parisienne boulangerie Saint-Placide'), visit: 'перекус' });
  add({ id: 'fd_kodawari', cat: 'food', bucket: 'food', name: 'Kodawari Ramen (Yokochō)', rec: 1, rating: '4,5', pri: 'opt', rname: 'Kodawari Ramen Yokocho, Paris', desc: 'Рамен в стиле токийского йокотё — посидеть, ~€20–30. Идея на ужин по пути.', gmaps: g('Kodawari Ramen Yokocho'), visit: '~1 ч' });

  add({ id: 'lt_pere', cat: 'sight', wiki: 'Пер-Лашез', bucket: 'later', name: 'Кладбище Пер-Лашез', rating: '4,6', pri: 'opt', rname: 'Pere Lachaise, Paris', desc: 'Знаменитое кладбище (Моррисон, Уайльд, Пиаф). Далеко на востоке, 2–3 ч.', gmaps: g('Pere Lachaise Cemetery'), visit: '~2–3 ч' });

  const ords = {};
  P.forEach((p) => { ords[p.bucket] = (ords[p.bucket] || 0); p.order = ords[p.bucket]++; });

  return {
    version: 15,
    activeCity: null,
    cities: {
      paris: {
        id: 'paris', name: 'Париж', tripStart: '2026-07-02', walk: 'high',
        arrival: '10:35', departure: '18:20', checkin: '16:00', food: 'snack',
        arrivalDay: 'd2',
        reminders: [
          { id: 'r_eiffel', text: 'Забронировать Эйфелеву башню (слоты за 4–6 недель, закат уходит первым).', due: '2026-05-25', done: false },
          { id: 'r_dior', text: 'Забронировать музей Dior (за несколько недель, вс особенно).', due: '2026-06-10', done: false },
          { id: 'r_metro', text: 'Купить билеты в приложении Île-de-France Mobilités (или Bonjour RATP) за сутки. Метро/RER — €2,55 за билет, карне ×10 — €17,35. До/из Орли нужен отдельный билет «Paris Region ↔ Airports» — €14. Бумажные билеты в метро больше не продают.', due: '2026-07-01', url: 'https://www.iledefrance-mobilites.fr/en/tickets-fares', done: false },
          { id: 'r_nd', text: 'Забронировать Нотр-Дам (слот открывается за 2–3 дня до визита).', due: '2026-07-01', done: false },
        ],
        hotel: { name: "Appart'City Confort Paris Clichy-Mairie", addr: '4 Rue Palloy, 92110 Clichy', metro: 'Mairie de Clichy (M13)', gmaps: g("Appart'City Confort Paris Clichy Mairie") },
        orly: '<b>M14</b> от Орли до Saint-Lazare (~30 мин) → <b>M13</b> до Mairie de Clichy (~10 мин). ~50 мин, ≈ €13–14. Такси ~€50.',
        orlyOut: 'Отель → <b>M13</b> до Saint-Lazare → <b>M14</b> до Орли, ~50–60 мин. Тариф ≈ €13–14.',
        departureNote: 'Выезжай из отеля к ~14:30, в Орли будь к ~16:00.',
        days: [
          { id: 'd2', mode: 'walking', first: { m: 'metro', t: '~25 мин', to: 'M13 до Champs-Élysées–Clemenceau, к Согласию' } },
          { id: 'd3', mode: 'walking', first: { m: 'metro', t: '~30 мин', to: 'M13 → до Palais Royal–Musée du Louvre' } },
          { id: 'd4', mode: 'walking', first: { m: 'metro', t: '~20 мин', to: 'M13 → Place de Clichy → M2 до Anvers' } },
          { id: 'd5', mode: 'walking', first: { m: 'metro', t: '~25 мин', to: 'M13/RER A до Auber (Опера)' } },
          { id: 'd6', mode: 'walking', first: { m: 'walk', t: '2 мин', to: 'сквер прямо у отеля' } },
        ],
        activeTab: 'd2',
        places: P,
      },
    },
  };
}
