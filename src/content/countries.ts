// 100 крупнейших стран мира по общей площади (км²).
// Источник порядка: справочные данные ООН / CIA World Factbook; у близких по площади стран
// (например, США и Китай) порядок в разных справочниках может отличаться.
// id — числовой код ISO 3166-1, совпадает с id в world-atlas (карта).

export type Region = 'europe' | 'asia' | 'africa' | 'namerica' | 'samerica' | 'oceania'

export interface Country {
  rank: number
  id: string
  name: string
  capital: string
  /** Допустимые варианты ответа помимо основного */
  capitalAlt?: string[]
  area: number
  region: Region
  mnemonic?: string
  note?: string
}

export const REGION_NAMES: Record<Region, string> = {
  europe: 'Европа',
  asia: 'Азия',
  africa: 'Африка',
  namerica: 'Северная Америка',
  samerica: 'Южная Америка',
  oceania: 'Океания',
}

export const COUNTRIES: Country[] = [
  { rank: 1, id: '643', name: 'Россия', capital: 'Москва', area: 17098246, region: 'europe', note: 'Самая большая страна мира — больше Плутона по площади поверхности.' },
  { rank: 2, id: '124', name: 'Канада', capital: 'Оттава', area: 9984670, region: 'namerica', mnemonic: 'Не Торонто и не Монреаль: столицу поставили «посередине» между англо- и франкоязычными провинциями — в Оттаве.' },
  { rank: 3, id: '840', name: 'США', capital: 'Вашингтон', area: 9833520, region: 'namerica', mnemonic: 'Не Нью-Йорк: столица названа в честь первого президента — Джорджа Вашингтона.', note: 'С учётом водных территорий США чуть больше Китая.' },
  { rank: 4, id: '156', name: 'Китай', capital: 'Пекин', area: 9596961, region: 'asia', mnemonic: 'Пекин (Бэйцзин) — «северная столица». Нанкин — «южная».' },
  { rank: 5, id: '076', name: 'Бразилия', capital: 'Бразилиа', area: 8515767, region: 'samerica', mnemonic: 'Не Рио! Столица называется почти как страна — Бразилиа, построена с нуля в 1960 году.' },
  { rank: 6, id: '036', name: 'Австралия', capital: 'Канберра', area: 7692024, region: 'oceania', mnemonic: 'КЕНгуру БЕРёт — Канберра. Не Сидней и не Мельбурн: столицу построили между ними, чтобы не ссорились.' },
  { rank: 7, id: '356', name: 'Индия', capital: 'Нью-Дели', capitalAlt: ['Дели'], area: 3287263, region: 'asia', mnemonic: '«Новый» Дели — Нью-Дели, построен англичанами рядом со старым Дели.' },
  { rank: 8, id: '032', name: 'Аргентина', capital: 'Буэнос-Айрес', area: 2780400, region: 'samerica', mnemonic: 'Буэнос-Айрес — «добрые ветры» по-испански: моряки радовались попутному ветру.' },
  { rank: 9, id: '398', name: 'Казахстан', capital: 'Астана', area: 2724900, region: 'asia', mnemonic: '«Астана» по-казахски и значит «столица». До 1997 года столицей была Алма-Ата.' },
  { rank: 10, id: '012', name: 'Алжир', capital: 'Алжир', area: 2381741, region: 'africa', mnemonic: 'Столица называется так же, как страна. Самая большая страна Африки.' },
  { rank: 11, id: '180', name: 'ДР Конго', capital: 'Киншаса', area: 2344858, region: 'africa', mnemonic: 'Через реку Конго напротив — Браззавиль, столица другого Конго. Две столицы смотрят друг на друга.' },
  { rank: 12, id: '682', name: 'Саудовская Аравия', capital: 'Эр-Рияд', capitalAlt: ['Рияд'], area: 2149690, region: 'asia', mnemonic: 'Эр-Рияд — «сады»: оазис посреди пустыни.' },
  { rank: 13, id: '484', name: 'Мексика', capital: 'Мехико', area: 1964375, region: 'namerica', mnemonic: 'Мексика — Мехико: одно и то же слово, по-испански «México».' },
  { rank: 14, id: '360', name: 'Индонезия', capital: 'Джакарта', area: 1904569, region: 'asia', mnemonic: 'ДЖАКАРТА — «джунгли на карте» из 17 000 островов.', note: 'Страна переносит столицу в новый город Нусантара на Калимантане.' },
  { rank: 15, id: '729', name: 'Судан', capital: 'Хартум', area: 1861484, region: 'africa', mnemonic: 'Хартум — «хобот слона»: так изгибается место слияния Белого и Голубого Нила.' },
  { rank: 16, id: '434', name: 'Ливия', capital: 'Триполи', area: 1759540, region: 'africa', mnemonic: 'Триполи — «три города» по-гречески.' },
  { rank: 17, id: '364', name: 'Иран', capital: 'Тегеран', area: 1648195, region: 'asia', mnemonic: 'ИРАН — тегеРАН: оба слова на «-ран».' },
  { rank: 18, id: '496', name: 'Монголия', capital: 'Улан-Батор', area: 1564110, region: 'asia', mnemonic: 'Улан-Батор — «красный богатырь». Самая холодная столица мира.' },
  { rank: 19, id: '604', name: 'Перу', capital: 'Лима', area: 1285216, region: 'samerica', mnemonic: 'Перу — Лима: «перу́ лимон» — короткое к короткому.' },
  { rank: 20, id: '148', name: 'Чад', capital: 'Нджамена', area: 1284000, region: 'africa', mnemonic: 'В Чаде есть озеро Чад, а столица Нджамена — «место отдыха».' },
  { rank: 21, id: '562', name: 'Нигер', capital: 'Ниамей', area: 1267000, region: 'africa', mnemonic: 'НИгер — НИамей: обе на «Ни». Не путать с Нигерией (Абуджа).' },
  { rank: 22, id: '024', name: 'Ангола', capital: 'Луанда', area: 1246700, region: 'africa', mnemonic: '«Луна над Анголой» — Луанда.' },
  { rank: 23, id: '466', name: 'Мали', capital: 'Бамако', area: 1240192, region: 'africa', mnemonic: 'Бамако — «река крокодилов». В Мали — легендарный Тимбукту.' },
  { rank: 24, id: '710', name: 'ЮАР', capital: 'Претория', area: 1221037, region: 'africa', mnemonic: 'ЮАР «претендует» на три столицы: Претория (правительство), Кейптаун (парламент), Блумфонтейн (суд).' },
  { rank: 25, id: '170', name: 'Колумбия', capital: 'Богота', area: 1141748, region: 'samerica', mnemonic: 'Колумбия богата кофе — БОГОТА.' },
  { rank: 26, id: '231', name: 'Эфиопия', capital: 'Аддис-Абеба', area: 1104300, region: 'africa', mnemonic: 'Аддис-Абеба — «новый цветок» на амхарском.' },
  { rank: 27, id: '068', name: 'Боливия', capital: 'Сукре', capitalAlt: ['Ла-Пас', 'Ла Пас'], area: 1098581, region: 'samerica', mnemonic: 'По конституции столица — Сукре, а правительство сидит в Ла-Пасе («мир»). Принимаются оба ответа.' },
  { rank: 28, id: '478', name: 'Мавритания', capital: 'Нуакшот', area: 1030700, region: 'africa', mnemonic: 'Нуакшот — «место ветров» на берегу Атлантики.' },
  { rank: 29, id: '818', name: 'Египет', capital: 'Каир', area: 1002450, region: 'africa', mnemonic: 'Каир — «победоносный». Рядом пирамиды Гизы.' },
  { rank: 30, id: '834', name: 'Танзания', capital: 'Додома', area: 945087, region: 'africa', mnemonic: '«ДО ДОМА» — столицу перенесли вглубь страны из портового Дар-эс-Салама.' },
  { rank: 31, id: '566', name: 'Нигерия', capital: 'Абуджа', area: 923768, region: 'africa', mnemonic: 'Не Лагос (крупнейший город)! Абуджа построена в центре страны в 1991 году.' },
  { rank: 32, id: '862', name: 'Венесуэла', capital: 'Каракас', area: 916445, region: 'samerica', mnemonic: 'Венесуэла — «маленькая Венеция», а столица — КАРАКАС, как карусель на холмах.' },
  { rank: 33, id: '586', name: 'Пакистан', capital: 'Исламабад', area: 881913, region: 'asia', mnemonic: 'Исламабад — «город ислама». Не Карачи (крупнейший город).' },
  { rank: 34, id: '516', name: 'Намибия', capital: 'Виндхук', area: 825615, region: 'africa', mnemonic: 'Виндхук — по-немецки «ветреный угол»: Намибия была немецкой колонией.' },
  { rank: 35, id: '508', name: 'Мозамбик', capital: 'Мапуту', area: 801590, region: 'africa', mnemonic: 'МАПУТУ — «мама, путь туда»: столица на самом юге страны у океана.' },
  { rank: 36, id: '792', name: 'Турция', capital: 'Анкара', area: 783562, region: 'asia', mnemonic: 'Не Стамбул! Ататюрк сделал столицей Анкару в 1923 году.' },
  { rank: 37, id: '152', name: 'Чили', capital: 'Сантьяго', area: 756102, region: 'samerica', mnemonic: 'Самая длинная страна — 4300 км с севера на юг. Столица — Сантьяго («святой Яков»).' },
  { rank: 38, id: '894', name: 'Замбия', capital: 'Лусака', area: 752612, region: 'africa', mnemonic: 'Замбия — Лусака, Зимбабве — Хараре. «ЗамЛу и ЗимХа».' },
  { rank: 39, id: '104', name: 'Мьянма', capital: 'Нейпьидо', area: 676578, region: 'asia', mnemonic: 'Нейпьидо — «обитель королей», построен в 2005 году вместо Янгона.' },
  { rank: 40, id: '004', name: 'Афганистан', capital: 'Кабул', area: 652230, region: 'asia', mnemonic: 'Кабул стоит на реке Кабул.' },
  { rank: 41, id: '728', name: 'Южный Судан', capital: 'Джуба', area: 644329, region: 'africa', mnemonic: 'Самая молодая страна мира (2011). Джуба — «юный» юг.' },
  { rank: 42, id: '250', name: 'Франция', capital: 'Париж', area: 643801, region: 'europe', note: 'С заморскими территориями; без них — около 551 000 км².' },
  { rank: 43, id: '706', name: 'Сомали', capital: 'Могадишо', area: 637657, region: 'africa', mnemonic: 'Могадишо — «могу дышать» морским воздухом: город на берегу Индийского океана.' },
  { rank: 44, id: '140', name: 'ЦАР', capital: 'Банги', area: 622984, region: 'africa', mnemonic: 'Банги стоит на реке Убанги.', note: 'Центральноафриканская Республика.' },
  { rank: 45, id: '804', name: 'Украина', capital: 'Киев', area: 603550, region: 'europe' },
  { rank: 46, id: '450', name: 'Мадагаскар', capital: 'Антананариву', area: 587041, region: 'africa', mnemonic: 'Антананариву — «город тысячи воинов». Длинное название для длинного острова.' },
  { rank: 47, id: '072', name: 'Ботсвана', capital: 'Габороне', area: 581730, region: 'africa', mnemonic: 'ГАБОРОНЕ — «габариты ровные»: плоская пустыня Калахари.' },
  { rank: 48, id: '404', name: 'Кения', capital: 'Найроби', area: 580367, region: 'africa', mnemonic: 'Найроби — у масаев «место холодной воды».' },
  { rank: 49, id: '887', name: 'Йемен', capital: 'Сана', capitalAlt: ['Сана́', 'Сана'], area: 527968, region: 'asia', mnemonic: 'Сана — один из древнейших городов мира с глиняными «небоскрёбами».' },
  { rank: 50, id: '764', name: 'Таиланд', capital: 'Бангкок', area: 513120, region: 'asia', mnemonic: 'Полное название Бангкока — самое длинное название города в мире.' },
  { rank: 51, id: '724', name: 'Испания', capital: 'Мадрид', area: 505992, region: 'europe' },
  { rank: 52, id: '795', name: 'Туркменистан', capital: 'Ашхабад', area: 488100, region: 'asia', mnemonic: 'Ашхабад — «город любви» (по одной из версий), весь в белом мраморе.' },
  { rank: 53, id: '120', name: 'Камерун', capital: 'Яунде', area: 475442, region: 'africa', mnemonic: 'Не Дуала (порт)! Яунде — «Я у них» в горах.' },
  { rank: 54, id: '598', name: 'Папуа — Новая Гвинея', capital: 'Порт-Морсби', area: 462840, region: 'oceania', mnemonic: 'Порт-Морсби — порт, названный в честь адмирала Морсби.' },
  { rank: 55, id: '752', name: 'Швеция', capital: 'Стокгольм', area: 450295, region: 'europe', mnemonic: 'Стокгольм — «остров на сваях» (holm — островок).' },
  { rank: 56, id: '860', name: 'Узбекистан', capital: 'Ташкент', area: 448978, region: 'asia', mnemonic: 'Ташкент — «каменный город» (таш — камень).' },
  { rank: 57, id: '504', name: 'Марокко', capital: 'Рабат', area: 446550, region: 'africa', mnemonic: 'Не Касабланка и не Марракеш! Рабат — «РАБоТАет» правительство.' },
  { rank: 58, id: '368', name: 'Ирак', capital: 'Багдад', area: 438317, region: 'asia', mnemonic: 'Багдад «Тысячи и одной ночи» — на реке Тигр.' },
  { rank: 59, id: '600', name: 'Парагвай', capital: 'Асунсьон', area: 406752, region: 'samerica', mnemonic: 'Асунсьон — «Успение»: город основан 15 августа 1537 года, в праздник Успения Девы Марии.' },
  { rank: 60, id: '716', name: 'Зимбабве', capital: 'Хараре', area: 390757, region: 'africa', mnemonic: 'Зимбабве — Хараре: «зимой ХАРАшо». Пара к Замбии — Лусаке.' },
  { rank: 61, id: '392', name: 'Япония', capital: 'Токио', area: 377975, region: 'asia', mnemonic: 'Токио — «восточная столица», Киото — старая столица (анаграмма!).' },
  { rank: 62, id: '276', name: 'Германия', capital: 'Берлин', area: 357114, region: 'europe' },
  { rank: 63, id: '178', name: 'Республика Конго', capital: 'Браззавиль', area: 342000, region: 'africa', mnemonic: 'Назван в честь француза де Бразза. Через реку — Киншаса (ДР Конго).' },
  { rank: 64, id: '246', name: 'Финляндия', capital: 'Хельсинки', area: 338424, region: 'europe' },
  { rank: 65, id: '704', name: 'Вьетнам', capital: 'Ханой', area: 331212, region: 'asia', mnemonic: 'Ханой — «город внутри рек». Не Хошимин (бывший Сайгон).' },
  { rank: 66, id: '458', name: 'Малайзия', capital: 'Куала-Лумпур', area: 330803, region: 'asia', mnemonic: 'Куала-Лумпур — «грязное устье» на слиянии двух рек.' },
  { rank: 67, id: '578', name: 'Норвегия', capital: 'Осло', area: 323802, region: 'europe' },
  { rank: 68, id: '384', name: "Кот-д'Ивуар", capital: 'Ямусукро', area: 322463, region: 'africa', mnemonic: 'Не Абиджан (крупнейший город)! Ямусукро — родина первого президента.' },
  { rank: 69, id: '616', name: 'Польша', capital: 'Варшава', area: 312696, region: 'europe' },
  { rank: 70, id: '512', name: 'Оман', capital: 'Маскат', area: 309500, region: 'asia', mnemonic: 'Оман — Маскат: «О, мушкет!» — старая крепость у моря.' },
  { rank: 71, id: '380', name: 'Италия', capital: 'Рим', area: 301339, region: 'europe' },
  { rank: 72, id: '608', name: 'Филиппины', capital: 'Манила', area: 300000, region: 'asia', mnemonic: 'Манила «манит» — 7600 островов.' },
  { rank: 73, id: '218', name: 'Эквадор', capital: 'Кито', area: 276841, region: 'samerica', mnemonic: 'Эквадор = «экватор». Кито лежит почти на экваторе, на высоте 2800 м.' },
  { rank: 74, id: '854', name: 'Буркина-Фасо', capital: 'Уагадугу', area: 274222, region: 'africa', mnemonic: 'У-а-га-ду-гу — звучит как барабан.' },
  { rank: 75, id: '554', name: 'Новая Зеландия', capital: 'Веллингтон', area: 268021, region: 'oceania', mnemonic: 'Не Окленд! Веллингтон — как герцог, победивший Наполеона.' },
  { rank: 76, id: '266', name: 'Габон', capital: 'Либревиль', area: 267668, region: 'africa', mnemonic: 'Либревиль — «свободный город»: основан освобождёнными рабами.' },
  { rank: 77, id: '324', name: 'Гвинея', capital: 'Конакри', area: 245857, region: 'africa', mnemonic: 'КОНАКРИ — «кони кричат». Не путать с Гвинеей-Бисау.' },
  { rank: 78, id: '826', name: 'Великобритания', capital: 'Лондон', area: 242495, region: 'europe' },
  { rank: 79, id: '800', name: 'Уганда', capital: 'Кампала', area: 241550, region: 'africa', mnemonic: 'Кампала — «холм антилоп», на берегу озера Виктория.' },
  { rank: 80, id: '288', name: 'Гана', capital: 'Аккра', area: 238533, region: 'africa', mnemonic: 'Гана — Аккра: «Ага, Аккра!»' },
  { rank: 81, id: '642', name: 'Румыния', capital: 'Бухарест', area: 238397, region: 'europe', mnemonic: 'Бухарест — «город радости» (bucurie — радость).' },
  { rank: 82, id: '418', name: 'Лаос', capital: 'Вьентьян', area: 236800, region: 'asia', mnemonic: 'Вьентьян — «город сандалового дерева» на Меконге.' },
  { rank: 83, id: '328', name: 'Гайана', capital: 'Джорджтаун', area: 214969, region: 'samerica', mnemonic: 'Бывшая британская колония — «город Георга», Джорджтаун.' },
  { rank: 84, id: '112', name: 'Беларусь', capital: 'Минск', area: 207600, region: 'europe' },
  { rank: 85, id: '417', name: 'Киргизия', capital: 'Бишкек', area: 199951, region: 'asia', mnemonic: 'Бишкек — до 1991 года назывался Фрунзе.' },
  { rank: 86, id: '686', name: 'Сенегал', capital: 'Дакар', area: 196722, region: 'africa', mnemonic: 'Как ралли «Париж — Дакар». Не путать с Даккой (Бангладеш).' },
  { rank: 87, id: '760', name: 'Сирия', capital: 'Дамаск', area: 185180, region: 'asia', mnemonic: 'Дамаск — один из старейших городов мира; дамасская сталь.' },
  { rank: 88, id: '116', name: 'Камбоджа', capital: 'Пномпень', area: 181035, region: 'asia', mnemonic: 'Пномпень — «холм госпожи Пень»: Пном — холм.' },
  { rank: 89, id: '858', name: 'Уругвай', capital: 'Монтевидео', area: 176215, region: 'samerica', mnemonic: 'Монтевидео — «вижу гору» (monte vide eu).' },
  { rank: 90, id: '740', name: 'Суринам', capital: 'Парамарибо', area: 163820, region: 'samerica', mnemonic: 'Бывшая голландская колония. ПАРАМАРИБО — «пара мари(н)ованной рыбы».' },
  { rank: 91, id: '788', name: 'Тунис', capital: 'Тунис', area: 163610, region: 'africa', mnemonic: 'Столица называется как страна. Рядом руины Карфагена.' },
  { rank: 92, id: '050', name: 'Бангладеш', capital: 'Дакка', area: 148460, region: 'asia', mnemonic: 'Дакка — не путать с Дакаром (Сенегал)! В Бангладеш 170+ млн человек на маленькой площади.' },
  { rank: 93, id: '524', name: 'Непал', capital: 'Катманду', area: 147516, region: 'asia', mnemonic: 'Из долины Катманду начинают путь экспедиции к Эвересту. Флаг Непала — единственный не прямоугольный.' },
  { rank: 94, id: '762', name: 'Таджикистан', capital: 'Душанбе', area: 143100, region: 'asia', mnemonic: 'Душанбе — «понедельник»: здесь был базар по понедельникам.' },
  { rank: 95, id: '300', name: 'Греция', capital: 'Афины', area: 131957, region: 'europe' },
  { rank: 96, id: '558', name: 'Никарагуа', capital: 'Манагуа', area: 130373, region: 'namerica', mnemonic: 'НикарАГУА — МанАГУА: рифма на «-агуа» (agua — вода).' },
  { rank: 97, id: '408', name: 'КНДР', capital: 'Пхеньян', area: 120538, region: 'asia', note: 'Корейская Народно-Демократическая Республика (Северная Корея).' },
  { rank: 98, id: '454', name: 'Малави', capital: 'Лилонгве', area: 118484, region: 'africa', mnemonic: 'ЛИЛОНГВЕ — «лилии у озера Малави».' },
  { rank: 99, id: '232', name: 'Эритрея', capital: 'Асмэра', capitalAlt: ['Асмара'], area: 117600, region: 'africa', mnemonic: 'Асмэра — «они объединились»: четыре деревни слились в город.' },
  { rank: 100, id: '204', name: 'Бенин', capital: 'Порто-Ново', area: 114763, region: 'africa', mnemonic: 'Порто-Ново — «новый порт». Правительство работает в Котону.' },
]

export const COUNTRY_BY_ID = new Map(COUNTRIES.map((c) => [c.id, c]))

export function formatArea(km2: number): string {
  if (km2 >= 1_000_000) return `${(km2 / 1_000_000).toFixed(2).replace('.', ',')} млн км²`
  return `${Math.round(km2 / 1000)} тыс. км²`
}
