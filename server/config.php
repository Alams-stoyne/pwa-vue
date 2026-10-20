<?php
return [
    'vapid' => [
        'public'  => 'BDcR4MSe-yUPOvp4NKZuUEEwiqiPRqmcDV4CSxp6GlvwJneLQb9bHv0ELndow7h3znWtuZrkK0FZ_TERN1dvyJc',
        'private' => '7kd-0faIcainyKDCGYdP_WkW6oyjddBjlKZQBGyPqN8',
        'subject' => 'mailto:admin@x5hd.ru',
    ],
    'habits' => [
        'water' => [
            'timesPerDay' => 3, 'minIntervalMin' => 90, 'emoji' => '💧',
            'title' => '💧 Пора выпить воды',
            'body'  => 'Выпейте стакан чистой воды',
            'url'   => '/',
        ],
        'workout' => [
            'timesPerDay' => 3, 'minIntervalMin' => 120, 'emoji' => '🤸',
            'title' => '🤸 Время размяться',
            'body'  => 'Потянитесь, разомните шею и плечи',
            'url'   => '/',
        ],
        'eyes' => [
            'timesPerDay' => 3, 'minIntervalMin' => 60, 'emoji' => '👀',
            'title' => '👀 Отдохните глазам',
            'body'  => 'Посмотрите в даль 20 секунд',
            'url'   => '/',
        ],
    ],
    'night' => ['start' => 22, 'end' => 8],
    'firstReminderDelayH' => 2,
    'rate'  => ['windowMs' => 60000, 'max' => 10],
    'allowedOrigins' => [
        'https://v12.x5hd.ru',
        // 'https://v8.x5hd.ru',
        // 'http://localhost:5173',
    ],
];