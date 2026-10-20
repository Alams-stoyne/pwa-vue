<?php
/**
 * data.php
 * Контент и генераторы. Полный паритет с data.js.
 * Никакой логики доступа/состояния тут нет — только контент.
 */

// ============================================================
// СТАТЬИ ПО НАПРАВЛЕНИЯМ
// ============================================================
function THEME_ARTICLES(): array {
    return [
        'energy' => [
            [
                'ID_ARTICLE' => 'e1',
                'TEXT'       => str_repeat('Как восстанавливаться за 10 минут. ', 3),
                'VIDEO_LINK' => 'https://www.w3schools.com/html/mov_bbb.mp4',
                'PHOTOS'     => [
                    'https://picsum.photos/seed/energy1/600/400',
                    'https://picsum.photos/seed/energy2/600/400',
                ],
            ],
            [
                'ID_ARTICLE' => 'e2',
                'TEXT'       => 'Утренние ритуалы для продуктивности.',
                'VIDEO_LINK' => null,
                'PHOTOS'     => [],
            ],
            [
                'ID_ARTICLE' => 'e3',
                'TEXT'       => 'Мини-практики на день.',
                'VIDEO_LINK' => null,
                'PHOTOS'     => ['https://picsum.photos/seed/energy3/600/400'],
            ],
        ],
        'antistress' => [
            [
                'ID_ARTICLE' => 'a1',
                'TEXT'       => 'Дыхательные техники при стрессе.',
                'VIDEO_LINK' => null,
                'PHOTOS'     => [],
            ],
            [
                'ID_ARTICLE' => 'a2',
                'TEXT'       => 'Как перестать прокручивать мысли.',
                'VIDEO_LINK' => null,
                'PHOTOS'     => ['https://picsum.photos/seed/stress1/600/400'],
            ],
        ],
        'body' => [
            [
                'ID_ARTICLE' => 'b1',
                'TEXT'       => str_repeat('Тренировка для занятых: 15 минут. ', 2),
                'VIDEO_LINK' => null,
                'PHOTOS'     => ['https://picsum.photos/seed/body1/600/400'],
            ],
            [
                'ID_ARTICLE' => 'b2',
                'TEXT'       => 'Сон и восстановление.',
                'VIDEO_LINK' => null,
                'PHOTOS'     => [],
            ],
        ],
        'balance' => [
            [
                'ID_ARTICLE' => 'bl1',
                'TEXT'       => 'Планирование без выгорания.',
                'VIDEO_LINK' => null,
                'PHOTOS'     => [],
            ],
            [
                'ID_ARTICLE' => 'bl2',
                'TEXT'       => 'Как отделять работу от жизни.',
                'VIDEO_LINK' => null,
                'PHOTOS'     => [],
            ],
        ],
    ];
}

// ============================================================
// ДАТЫ
// ============================================================
function isoDate(DateTime $d): string {
    return $d->format('Y-m-d');
}

// ============================================================
// ГЕНЕРАТОРЫ СТАТЕЙ
// ============================================================
function articlesForThemeDate(string $theme, string $date): array {
    $list = THEME_ARTICLES()[$theme] ?? [];
    return array_map(function ($a) use ($theme, $date) {
        $a['THEME'] = $theme;
        $a['DATE']  = $date;
        return $a;
    }, $list);
}

function generalForDate(string $date): array {
    return [
        [
            'ID_ARTICLE' => 'g1',
            'DATE'       => $date,
            'VIDEO_LINK' => null,
            'PHOTOS'     => [],
            'TEXT'       => "Общая статья за $date. Публикуется ежедневно и не зависит от направления.",
        ],
        [
            'ID_ARTICLE' => 'g2',
            'DATE'       => $date,
            'VIDEO_LINK' => null,
            'PHOTOS'     => ['https://picsum.photos/seed/gen1/600/400'],
            'TEXT'       => "Ещё одна общая статья за $date.",
        ],
    ];
}

function usefulForDate(string $date): array {
    return [
        [
            'ID_ARTICLE' => 'u1',
            'DATE'       => $date,
            'VIDEO_LINK' => null,
            'PHOTOS'     => [],
            'TEXT'       => "Полезный материал за $date. Короткий и практичный.",
        ],
        [
            'ID_ARTICLE' => 'u2',
            'DATE'       => $date,
            'VIDEO_LINK' => null,
            'PHOTOS'     => [],
            'TEXT'       => "Ещё один полезный материал за $date.",
        ],
    ];
}

function archiveForTheme(string $theme): array {
    $out = [];
    for ($i = 1; $i <= 6; $i++) {
        $d = new DateTime();
        $d->modify("-$i day");
        $date = isoDate($d);
        for ($k = 1; $k <= 2; $k++) {
            $out[] = [
                'ID_ARTICLE' => "$theme-a$i-$k",
                'DATE'       => $date,
                'THEME'      => $theme,
                'VIDEO_LINK' => null,
                'PHOTOS'     => [],
                'TEXT'       => "Архивная статья направления «$theme» от $date (#$k).",
            ];
        }
    }
    return $out;
}

// ============================================================
// ПРАКТИКИ (ЗАДАНИЯ)
// ID_TASK уникален и НЕ зависит от даты. Количество заданий
// варьируется от 1 до N — детерминированно по хешу даты.
// ============================================================
function TASKS_BY_THEME(): array {
    return [
        'energy' => [
            ['ID_TASK' => 'energy-warmup',  'TITLE' => 'Разминка',  'TEXT' => 'Потянитесь, разомните шею и плечи.'],
            ['ID_TASK' => 'energy-breath',  'TITLE' => 'Дыхание',   'TEXT' => '3 минуты глубокого дыхания.'],
            ['ID_TASK' => 'energy-water',   'TITLE' => 'Вода',      'TEXT' => 'Выпейте стакан воды.'],
            ['ID_TASK' => 'energy-walk',    'TITLE' => 'Прогулка',  'TEXT' => 'Пройдитесь 10 минут на свежем воздухе.'],
            ['ID_TASK' => 'energy-stretch', 'TITLE' => 'Растяжка',  'TEXT' => '5 минут растяжки всего тела.'],
        ],
        'antistress' => [
            ['ID_TASK' => 'antistress-4-7-8',   'TITLE' => 'Дыхание 4-7-8', 'TEXT' => 'Вдох 4 сек — задержка 7 сек — выдох 8 сек.'],
            ['ID_TASK' => 'antistress-mindful', 'TITLE' => 'Осознанность',  'TEXT' => '5 минут наблюдения за дыханием.'],
            ['ID_TASK' => 'antistress-detach',  'TITLE' => 'Отключение',    'TEXT' => '15 минут без телефона и мессенджеров.'],
            ['ID_TASK' => 'antistress-journal', 'TITLE' => 'Запись',        'TEXT' => 'Запишите три вещи, за которые благодарны.'],
        ],
        'body' => [
            ['ID_TASK' => 'body-15min',   'TITLE' => 'Тренировка 15 минут', 'TEXT' => 'Простые упражнения без инвентаря.'],
            ['ID_TASK' => 'body-walk',    'TITLE' => 'Прогулка',            'TEXT' => '20 минут пешком быстрым шагом.'],
            ['ID_TASK' => 'body-posture', 'TITLE' => 'Осанка',              'TEXT' => 'Проверьте осанку и сделайте 10 наклонов.'],
            ['ID_TASK' => 'body-sleep',   'TITLE' => 'Подготовка ко сну',   'TEXT' => 'За час до сна уберите экраны.'],
            ['ID_TASK' => 'body-water',   'TITLE' => 'Вода',                'TEXT' => 'Выпейте 2 стакана воды в течение дня.'],
        ],
        'balance' => [
            ['ID_TASK' => 'balance-plan',   'TITLE' => 'Планирование',     'TEXT' => 'Запишите 3 главные задачи на завтра.'],
            ['ID_TASK' => 'balance-detach', 'TITLE' => 'Отключение',       'TEXT' => '1 час без рабочих уведомлений.'],
            ['ID_TASK' => 'balance-hobby',  'TITLE' => 'Хобби',            'TEXT' => '30 минут на любимое занятие.'],
            ['ID_TASK' => 'balance-family', 'TITLE' => 'Время с близкими', 'TEXT' => 'Время без телефона с семьёй.'],
        ],
    ];
}

// ============================================================
// ХЕШ — БИТ-В-БИТ КАК В JS
// JS: let h = 0; for (i) h = ((h << 5) - h + s.charCodeAt(i)) | 0; return Math.abs(h);
// (h << 5) - h  ===  h * 31
// ============================================================
function _to_int32(int $n): int {
    $n = $n & 0xFFFFFFFF;
    if ($n >= 0x80000000) $n -= 0x100000000;
    return $n;
}

function hashStr(string $s): int {
    $h = 0;
    $len = strlen($s);
    for ($i = 0; $i < $len; $i++) {
        $h = _to_int32($h * 31 + ord($s[$i]));
    }
    return abs($h);
}

function tasksForThemeDate(string $theme, string $date): array {
    $list = TASKS_BY_THEME()[$theme] ?? [];
    if (!$list) return [];
    // Количество заданий варьируется от 1 до count(list)
    $count = 1 + (hashStr("$theme:$date") % count($list));
    $slice = array_slice($list, 0, $count);
    return array_map(function ($t) use ($date) {
        $t['DATE'] = $date;
        return $t;
    }, $slice);
}

// ============================================================
// ЛЕКЦИИ
// ============================================================
function LECTURES(): array {
    return [
        'general' => [
            [
                'ID_LECTURE'  => 'lg1',
                'TITLE'       => 'Как учиться эффективнее',
                'DESCRIPTION' => 'Пять принципов, которые ускоряют обучение в 2 раза.',
                'COVER'       => 'https://picsum.photos/seed/lect-g1/600/400',
                'TEXT'        => str_repeat('Общая лекция о принципах эффективного обучения. ', 4),
                'VIDEO_LINK'  => null,
                'PHOTOS'      => [],
            ],
            [
                'ID_LECTURE'  => 'lg2',
                'TITLE'       => 'Внимание и концентрация',
                'DESCRIPTION' => 'Как удерживать фокус в мире уведомлений.',
                'COVER'       => 'https://picsum.photos/seed/lect-g2/600/400',
                'TEXT'        => str_repeat('Материал о внимании и работе с отвлечениями. ', 3),
                'VIDEO_LINK'  => null,
                'PHOTOS'      => [],
            ],
            [
                'ID_LECTURE'  => 'lg3',
                'TITLE'       => 'Память и повторение',
                'DESCRIPTION' => 'Простые техники запоминания надолго.',
                'COVER'       => 'https://picsum.photos/seed/lect-g3/600/400',
                'TEXT'        => str_repeat('Разбор интервального повторения и мнемотехник. ', 3),
                'VIDEO_LINK'  => null,
                'PHOTOS'      => [],
            ],
            [
                'ID_LECTURE'  => 'lg4',
                'TITLE'       => 'Работа с целями',
                'DESCRIPTION' => 'Как ставить цели и достигать их.',
                'COVER'       => 'https://picsum.photos/seed/lect-g4/600/400',
                'TEXT'        => str_repeat('Практический разбор постановки целей. ', 3),
                'VIDEO_LINK'  => null,
                'PHOTOS'      => [],
            ],
        ],
        'energy' => [
            [
                'ID_LECTURE'  => 'le1',
                'TITLE'       => 'Утренние ритуалы',
                'DESCRIPTION' => 'Что делать в первые 30 минут после пробуждения.',
                'COVER'       => 'https://picsum.photos/seed/lect-e1/600/400',
                'TEXT'        => str_repeat('Утренние ритуалы для энергии. ', 4),
                'VIDEO_LINK'  => null,
                'PHOTOS'      => [],
            ],
            [
                'ID_LECTURE'  => 'le2',
                'TITLE'       => 'Питание для энергии',
                'DESCRIPTION' => 'Что есть, чтобы не засыпать днём.',
                'COVER'       => 'https://picsum.photos/seed/lect-e2/600/400',
                'TEXT'        => str_repeat('Питание и уровень энергии. ', 3),
                'VIDEO_LINK'  => null,
                'PHOTOS'      => [],
            ],
        ],
        'antistress' => [
            [
                'ID_LECTURE'  => 'la1',
                'TITLE'       => 'Дыхание 4-7-8',
                'DESCRIPTION' => 'Простая техника против тревоги.',
                'COVER'       => 'https://picsum.photos/seed/lect-a1/600/400',
                'TEXT'        => str_repeat('Техника дыхания 4-7-8 и её эффект. ', 3),
                'VIDEO_LINK'  => null,
                'PHOTOS'      => [],
            ],
        ],
        'body' => [
            [
                'ID_LECTURE'  => 'lb1',
                'TITLE'       => 'Тренировка на 15 минут',
                'DESCRIPTION' => 'Короткая разминка для занятых.',
                'COVER'       => 'https://picsum.photos/seed/lect-b1/600/400',
                'TEXT'        => str_repeat('Тренировка на 15 минут в день. ', 3),
                'VIDEO_LINK'  => null,
                'PHOTOS'      => [],
            ],
        ],
        'balance' => [
            [
                'ID_LECTURE'  => 'lbl1',
                'TITLE'       => 'Планирование без выгорания',
                'DESCRIPTION' => 'Как распределить нагрузку.',
                'COVER'       => 'https://picsum.photos/seed/lect-bl1/600/400',
                'TEXT'        => str_repeat('Планирование и отдых. ', 3),
                'VIDEO_LINK'  => null,
                'PHOTOS'      => [],
            ],
        ],
        'charging' => [
            [
                'ID_LECTURE'  => 'lc1',
                'TITLE'       => 'Зарядка: разминка для шеи',
                'DESCRIPTION' => '3 минуты, чтобы снять напряжение.',
                'COVER'       => 'https://picsum.photos/seed/lect-c1/600/400',
                'TEXT'        => str_repeat('Короткая зарядка для шеи и плеч. ', 3),
                'VIDEO_LINK'  => null,
                'PHOTOS'      => [],
            ],
            [
                'ID_LECTURE'  => 'lc2',
                'TITLE'       => 'Зарядка: разминка для глаз',
                'DESCRIPTION' => 'Упражнения после долгой работы за экраном.',
                'COVER'       => 'https://picsum.photos/seed/lect-c2/600/400',
                'TEXT'        => str_repeat('Разминка для глаз. ', 3),
                'VIDEO_LINK'  => null,
                'PHOTOS'      => [],
            ],
        ],
    ];
}

function _lecturesByBucket(string $bucket, string $date): array {
    $all  = LECTURES();
    $list = $all[$bucket] ?? [];
    return array_map(function ($l) use ($date) {
        // В JS к ID_LECTURE добавляется дата, TITLE получает суффикс " · YYYY-MM-DD"
        $l['ID_LECTURE'] = $l['ID_LECTURE'] . '-' . $date;
        $l['TITLE']      = $l['TITLE'] . ' · ' . $date;
        $l['DATE']       = $date;
        return $l;
    }, $list);
}

function generalLectures(string $date): array {
    return _lecturesByBucket('general', $date);
}
function chargingLectures(string $date): array {
    return _lecturesByBucket('charging', $date);
}
function themeLectures(string $theme, string $date): array {
    return _lecturesByBucket($theme, $date);
}

// ============================================================
// ГЛОБАЛЬНАЯ СТАТИСТИКА (статичная «витрина», как в моке)
// ============================================================
function globalStats(): array {
    return [
        'USERS'         => 1234,
        'ARTICLES_READ' => 98765,
        'TASKS_DONE'    => 5432,
        'TOP_THEME'     => 'energy',
    ];
}