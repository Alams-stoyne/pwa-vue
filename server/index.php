<?php

require_once __DIR__ . '/storage.php';
require_once __DIR__ . '/data.php';
require_once __DIR__ . '/push.php';

// ─────────── CORS (только здесь!) ───────────
$origin  = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = cfg('allowedOrigins');
if (in_array($origin, $allowed, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Credentials: true');
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Max-Age: 86400');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ─────────── Утилиты ответа ───────────
function json_out($obj, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($obj, JSON_UNESCAPED_UNICODE);
    exit;
}
function read_body(): array {
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') return [];
    $j = json_decode($raw, true);
    return is_array($j) ? $j : [];
}
function pathname(): string {
    $u = $_SERVER['REQUEST_URI'] ?? '/';
    return explode('?', $u, 2)[0];
}
function method(): string { return $_SERVER['REQUEST_METHOD'] ?? 'GET'; }

// ─────────── Ленивый планировщик (если нет cron) ───────────
// Запускается не чаще раза в минуту, не блокирует если уже запущен.
(function () {
    $lock = @fopen(storage_dir() . '/scheduler.lock', 'c+');
    if (!$lock) return;
    if (!flock($lock, LOCK_EX | LOCK_NB)) { fclose($lock); return; }

    $last = (int)(json_read('scheduler_meta')['lastRun'] ?? 0);
    if (now_ms() - $last < 60_000) { flock($lock, LOCK_UN); fclose($lock); return; }

    json_update('scheduler_meta', function (&$m) {
        $m['lastRun'] = now_ms(); return ['_save' => true];
    });

    try {
        require_once __DIR__ . '/scheduler.php';
        // вызовем функцию, если она определена (в CLI-режиме файл делает exit)
        if (function_exists('check_habit_reminders')) {
            check_habit_reminders();
        }
    } catch (\Throwable $e) {
        error_log('[scheduler] ' . $e->getMessage());
    }

    flock($lock, LOCK_UN);
    fclose($lock);
})();

$P = pathname();
$M = method();

// ============================================================
// /auth
// ============================================================
if ($P === '/auth' && $M === 'POST') {
    $b = read_body();
    $uid                = trim((string)($b['UID'] ?? ''));
    $deviceId           = trim((string)($b['DEVICE_ID'] ?? ''));
    $deviceIdCreatedAt  = (int)($b['DEVICE_ID_CREATED_AT'] ?? 0);
    $deviceRotatedAt    = (int)($b['DEVICE_ROTATED_AT'] ?? 0);
    $ip                 = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

    if ($uid === '' || $deviceId === '') {
        json_out(['RESULT' => 'ERROR', 'ID_USER' => null]);
    }
    if (!is_valid_uid($uid)) {
        json_out(['RESULT' => 'UID_NOT_FOUND', 'ID_USER' => null]);
    }

    $rl1 = check_rate('device:' . $deviceId);
    $rl2 = check_rate('ip:' . $ip);
    if (!$rl1['ok'] || !$rl2['ok']) {
        json_out([
            'RESULT'         => 'RATE_LIMITED',
            'RETRY_AFTER_MS' => max($rl1['retryAfterMs'] ?? 0, $rl2['retryAfterMs'] ?? 0),
            'ID_USER'        => null,
        ]);
    }

    $authResult = json_update('bindings', function (&$data) use (
        $uid, $deviceId, $deviceIdCreatedAt, $deviceRotatedAt
    ) {
        if (!isset($data['devices']) || !is_array($data['devices'])) $data['devices'] = [];
        if (!isset($data['uids'])    || !is_array($data['uids']))    $data['uids']    = [];

        $uidBinding    = $data['uids'][$uid]  ?? null;
        $deviceBoundUid = $data['devices'][$deviceId] ?? null;

        if ($uidBinding && ($uidBinding['deviceId'] ?? '') !== $deviceId) {
            $rotatedRecently = $deviceRotatedAt > 0
                && (now_ms() - $deviceRotatedAt) < 60_000;
            if ($rotatedRecently) {
                return ['RESULT' => 'DEVICE_ROTATED', 'TAKEN_UID' => $uid,
                        'ID_USER' => null, '_save' => false];
            }
            return ['RESULT' => 'UID_TAKEN', 'TAKEN_UID' => $uid,
                    'ID_USER' => null, '_save' => false];
        }
        if ($deviceBoundUid && $deviceBoundUid !== $uid) {
            return ['RESULT' => 'UID_LOCKED', 'LOCKED_UID' => $deviceBoundUid,
                    'ID_USER' => null, '_save' => false];
        }

        $t = now_ms();
        if (!$uidBinding) {
            $data['uids'][$uid] = [
                'deviceId'        => $deviceId,
                'idUser'          => $uid,
                'createdAt'       => $t,
                'lastSeenAt'      => $t,
                'deviceCreatedAt' => $deviceIdCreatedAt ?: $t,
            ];
        } else {
            $data['uids'][$uid]['lastSeenAt'] = $t;
        }
        if (!$deviceBoundUid) $data['devices'][$deviceId] = $uid;

        return ['RESULT' => 'OK', 'ID_USER' => $uid, '_save' => true];
    });

    $authResult = $authResult ?? ['RESULT' => 'ERROR', 'ID_USER' => null];
    $stripped = $authResult; unset($stripped['_save']);
    if (($stripped['RESULT'] ?? '') !== 'OK') json_out($stripped);

    // Догружаем состояние
    $states = json_read('states');
    $reads  = json_read('reads');
    $tasks  = json_read('tasks');
    $habits = json_read('habits');

    json_out([
        'RESULT'  => 'OK',
        'ID_USER' => $uid,
        'STATE'   => $states[$uid] ?? null,
        'READS'   => $reads[$uid]  ?? [],
        'TASKS'   => $tasks[$uid]  ?? [],
        'HABITS'  => (empty($habits[$uid]) ? (object)[] : $habits[$uid]),
    ]);
}

// ============================================================
// ADMIN
// ============================================================
if (strpos($P, '/admin/') === 0) {
    $b = ($M === 'POST') ? read_body() : [];

    if ($P === '/admin/reset-uid') {
        $uid = trim((string)($b['UID'] ?? ''));
        if ($uid === '') json_out(['RESULT' => 'ERROR', 'MESSAGE' => 'UID required'], 400);
        json_update('bindings', function (&$data) use ($uid) {
            if (!isset($data['uids']) || !is_array($data['uids'])) $data['uids'] = [];
            if (!isset($data['devices']) || !is_array($data['devices'])) $data['devices'] = [];
            $binding = $data['uids'][$uid] ?? null;
            if ($binding) {
                $dev = $binding['deviceId'] ?? null;
                if ($dev) unset($data['devices'][$dev]);
                unset($data['uids'][$uid]);
            }
            return ['_save' => true];
        });
        json_out(['RESULT' => 'OK']);
    }

    if ($P === '/admin/reset-device') {
        $dev = trim((string)($b['DEVICE_ID'] ?? ''));
        if ($dev === '') json_out(['RESULT' => 'ERROR', 'MESSAGE' => 'DEVICE_ID required'], 400);
        json_update('bindings', function (&$data) use ($dev) {
            $uid = $data['devices'][$dev] ?? null;
            if ($uid) {
                unset($data['devices'][$dev]);
                unset($data['uids'][$uid]);
            }
            return ['_save' => true];
        });
        json_out(['RESULT' => 'OK']);
    }

    if ($P === '/admin/reset-all') {
        json_update('bindings', function (&$data) {
            $data['devices'] = []; $data['uids'] = [];
            return ['_save' => true];
        });
        json_out(['RESULT' => 'OK']);
    }

    if ($P === '/admin/state') {
        $bindings = json_read('bindings');
        $subs     = json_read('subscriptions');
        $uids     = $bindings['uids'] ?? [];
        $devices  = $bindings['devices'] ?? [];

        $out = [];
        foreach ($uids as $uid => $b) {
            $out[] = [
                'uid'        => substr($uid, 0, 12) . '…',
                'fullUid'    => $uid,
                'deviceId'   => substr((string)($b['deviceId'] ?? ''), 0, 12) . '…',
                'createdAt'  => $b['createdAt']  ?? 0,
                'lastSeenAt' => $b['lastSeenAt'] ?? 0,
            ];
        }
        json_out([
            'RESULT'        => 'OK',
            'DEVICES'       => count($devices),
            'UIDS'          => count($uids),
            'SUBSCRIPTIONS' => count($subs),
            'BINDINGS'      => $out,
        ]);
    }

    if ($P === '/admin/subscribers' && $M === 'GET') {
        $subs     = json_read('subscriptions');
        $bindings = json_read('bindings');
        $allHabits= json_read('habits');
        $out = [];
        foreach ($subs as $uid => $sub) {
            $hb = $allHabits[$uid] ?? [];
            $count = 0;
            if (is_array($hb)) {
                foreach ($hb as $arr) {
                    if (is_array($arr)) $count += count($arr);
                }
            }
            $out[] = [
                'uid'        => $uid,
                'shortUid'   => substr($uid, 0, 12) . '…',
                'endpoint'   => substr((string)($sub['endpoint'] ?? ''), 0, 60) . '…',
                'lastSeenAt' => $bindings['uids'][$uid]['lastSeenAt'] ?? 0,
                'hasHabits'  => !empty($hb),
                'habitsCount'=> $count,
            ];
        }
        json_out(['RESULT' => 'OK', 'SUBSCRIBERS' => $out]);
    }

    if ($P === '/admin/push-history' && $M === 'GET') {
        json_out(['RESULT' => 'OK', 'HISTORY' => json_read('push_history')]);
    }

    if ($P === '/admin/clear-history' && $M === 'POST') {
        json_write('push_history', []);
        json_out(['RESULT' => 'OK']);
    }

    json_out(['RESULT' => 'ERROR', 'MESSAGE' => 'Unknown admin endpoint'], 404);
}

// ============================================================
// PUSH
// ============================================================
if ($P === '/push/subscribe' && $M === 'POST') {
    $b = read_body();
    $uid = (string)($b['ID_USER'] ?? '');
    $sub = $b['subscription'] ?? null;
    if ($uid === '' || !is_array($sub) || empty($sub['endpoint'])) {
        json_out(['RESULT' => 'ERROR', 'MESSAGE' => 'Invalid payload'], 400);
    }
    json_update('subscriptions', function (&$m) use ($uid, $sub) {
        $m[$uid] = $sub; return ['_save' => true];
    });
    json_out(['RESULT' => 'OK']);
}

if ($P === '/push/unsubscribe' && $M === 'POST') {
    $b = read_body();
    $uid = (string)($b['ID_USER'] ?? '');
    if ($uid === '') json_out(['RESULT' => 'ERROR'], 400);
    json_update('subscriptions', function (&$m) use ($uid) {
        unset($m[$uid]); return ['_save' => true];
    });
    json_out(['RESULT' => 'OK']);
}

if ($P === '/push/send' && $M === 'POST') {
    $b = read_body();
    $uid = (string)($b['ID_USER'] ?? '');
    $title = (string)($b['title'] ?? '');
    $body  = (string)($b['body']  ?? '');
    if ($uid === '' || $title === '' || $body === '') {
        json_out(['RESULT' => 'ERROR', 'MESSAGE' => 'Invalid payload'], 400);
    }
    $subs = json_read('subscriptions');
    $sub = $subs[$uid] ?? null;
    if (!$sub) json_out(['RESULT' => 'NOT_FOUND', 'MESSAGE' => 'User not subscribed'], 404);

    $payload = [
        'title' => $title, 'body' => $body,
        'icon'  => '/icons/icon-192.png',
        'badge' => '/icons/icon-192.png',
        'url'   => $b['url'] ?? '/',
        'tag'   => $b['tag'] ?? 'admin-push',
    ];
    $r = push_send_one($uid, $sub, $payload);
    add_push_history([
        'type' => 'send', 'target' => $uid,
        'title' => $title, 'body' => $body, 'url' => $payload['url'],
        'status' => $r['statusCode'],
    ]);
    if (!$r['ok'] && $r['gone']) {
        json_update('subscriptions', function (&$m) use ($uid) {
            unset($m[$uid]); return ['_save' => true];
        });
    }
    json_out([
        'RESULT'  => $r['ok'] ? 'OK' : 'ERROR',
        'STATUS'  => $r['statusCode'],
        'MESSAGE' => $r['message'],
    ], $r['ok'] ? 200 : 500);
}

if ($P === '/push/broadcast' && $M === 'POST') {
    $b = read_body();
    $title = (string)($b['title'] ?? '');
    $body  = (string)($b['body']  ?? '');
    if ($title === '' || $body === '') {
        json_out(['RESULT' => 'ERROR', 'MESSAGE' => 'Invalid payload'], 400);
    }
    $payload = [
        'title' => $title, 'body' => $body,
        'icon'  => '/icons/icon-192.png',
        'badge' => '/icons/icon-192.png',
        'url'   => $b['url'] ?? '/',
        'tag'   => $b['tag'] ?? 'admin-broadcast',
    ];
    $subs = json_read('subscriptions');
    $ok = 0; $failed = 0; $removed = []; $errors = [];
    foreach ($subs as $uid => $sub) {
        $r = push_send_one($uid, $sub, $payload);
        if ($r['ok']) $ok++;
        else {
            $failed++;
            $errors[] = [
                'userId'     => substr($uid, 0, 12) . '…',
                'statusCode' => $r['statusCode'],
                'message'    => $r['message'],
            ];
            if ($r['gone']) $removed[] = $uid;
        }
    }
    if ($removed) {
        $removedSet = array_flip($removed);
        json_update('subscriptions', function (&$m) use ($removedSet) {
            foreach ($removedSet as $uid => $_) unset($m[$uid]);
            return ['_save' => true];
        });
    }
    add_push_history([
        'type' => 'broadcast', 'target' => '*',
        'title' => $title, 'body' => $body, 'url' => $payload['url'],
        'sent' => $ok, 'failed' => $failed, 'removed' => count($removed),
    ]);
    json_out([
        'RESULT'  => 'OK',
        'SENT'    => $ok,
        'FAILED'  => $failed,
        'REMOVED' => count($removed),
        'ERRORS'  => $errors,
    ]);
}

if ($P === '/push/vapid' && $M === 'GET') {
    $v = cfg('vapid');
    json_out([
        'RESULT'           => 'OK',
        'VAPID_PUBLIC_KEY' => $v['public'],
        'VAPID_SUBJECT'    => $v['subject'],
        'SUBSCRIPTIONS'    => count(json_read('subscriptions')),
    ]);
}

// ============================================================
// READS / TASKS / HABITS
// ============================================================
if ($P === '/reads' && $M === 'POST') {
    $b = read_body();
    $uid = (string)($b['ID_USER'] ?? $b['UID'] ?? '');
    if ($uid === '') json_out(['RESULT' => 'ERROR'], 400);
    $reads = json_read('reads');
    json_out(['RESULT' => 'OK', 'READS' => $reads[$uid] ?? []]);
}

if ($P === '/tasks' && $M === 'POST') {
    $b = read_body();
    $uid = (string)($b['ID_USER'] ?? $b['UID'] ?? '');
    if ($uid === '') json_out(['RESULT' => 'ERROR'], 400);
    $tasks = json_read('tasks');
    json_out(['RESULT' => 'OK', 'TASKS' => $tasks[$uid] ?? []]);
}

if ($P === '/habits' && $M === 'POST') {
    $b = read_body();
    $uid = (string)($b['ID_USER'] ?? $b['UID'] ?? '');
    if ($uid === '') json_out(['RESULT' => 'ERROR'], 400);
    $habits = json_read('habits');
    $h = $habits[$uid] ?? [];
    json_out(['RESULT' => 'OK', 'HABITS' => empty($h) ? (object)[] : $h]);
}

if ($P === '/habit/complete' && $M === 'POST') {
    $b = read_body();
    $uid     = (string)($b['ID_USER'] ?? '');
    $habitId = (string)($b['HABIT_ID'] ?? '');
    if ($uid === '' || $habitId === '') json_out(['RESULT' => 'ERROR'], 400);
    $srv = server_now();

    json_update('habits', function (&$m) use ($uid, $habitId, $srv) {
        if (!isset($m[$uid]) || !is_array($m[$uid])) $m[$uid] = [];
        if (!isset($m[$uid][$habitId]) || !is_array($m[$uid][$habitId])) {
            $m[$uid][$habitId] = [];
        }
        $m[$uid][$habitId][] = $srv;
        return ['_save' => true];
    });

    // Сбрасываем таймер напоминания для этой привычки
    json_update('notifications_log', function (&$m) use ($uid, $habitId) {
        $m[$uid . ':' . $habitId] = now_ms();
        return ['_save' => true];
    });

    json_out(['RESULT' => 'OK', 'SERVER_DATETIME' => $srv]);
}

// ============================================================
// STATE
// ============================================================
if ($P === '/state' && $M === 'POST') {
    $b = read_body();
    $uid = (string)($b['UID'] ?? '');
    if ($uid === '') json_out(['RESULT' => 'ERROR'], 400);
    $state = $b['STATE'] ?? null;
    json_update('states', function (&$m) use ($uid, $state) {
        $m[$uid] = $state; return ['_save' => true];
    });
    json_out(['RESULT' => 'OK']);
}

// ============================================================
// LECTURE READ / TASK COMPLETE
// ============================================================
if ($P === '/lecture/read' && $M === 'POST') {
    $b = read_body();
    $uid = (string)($b['ID_USER'] ?? '');
    $id  = (string)($b['ID_LECTURE'] ?? '');
    if ($uid === '' || $id === '') json_out(['RESULT' => 'ERROR'], 400);
    json_update('reads', function (&$m) use ($uid, $id) {
        if (!isset($m[$uid]) || !is_array($m[$uid])) $m[$uid] = [];
        if (!in_array($id, $m[$uid], true)) $m[$uid][] = $id;
        return ['_save' => true];
    });
    json_out(['RESULT' => 'OK', 'ID_READ' => now_ms(), 'SERVER_DATETIME' => server_now()]);
}

if ($P === '/task/complete' && $M === 'POST') {
    $b = read_body();
    $uid = (string)($b['ID_USER'] ?? '');
    $key = (string)($b['ID_TASK'] ?? '');
    if ($uid === '' || $key === '') json_out(['RESULT' => 'ERROR'], 400);
    json_update('tasks', function (&$m) use ($uid, $key) {
        if (!isset($m[$uid]) || !is_array($m[$uid])) $m[$uid] = [];
        if (!in_array($key, $m[$uid], true)) $m[$uid][] = $key;
        return ['_save' => true];
    });
    json_out(['RESULT' => 'OK', 'ID_COMPLETE' => now_ms(), 'SERVER_DATETIME' => server_now()]);
}

// ============================================================
// STATS SYNC
// ============================================================
if ($P === '/stats/sync' && $M === 'POST') {
    $b = read_body();
    $uid = (string)($b['ID_USER'] ?? 'unknown');

    $reads     = json_read('reads')[$uid]     ?? [];
    $taskKeys  = json_read('tasks')[$uid]     ?? [];
    $habitData = json_read('habits')[$uid]    ?? [];

    $byTheme = ['energy' => 0, 'antistress' => 0, 'body' => 0,
                'balance' => 0, 'general' => 0, 'charging' => 0];
    $activeCounts = [];

    foreach ($reads as $dbKey) {
        if (!preg_match('/^lecture-([a-z0-9_-]+):(\d{4}-\d{2}-\d{2}):/', (string)$dbKey, $mm)) continue;
        $bucket = $mm[1];
        if (array_key_exists($bucket, $byTheme)) $byTheme[$bucket]++;
        $d = $mm[2];
        $activeCounts[$d] = ($activeCounts[$d] ?? 0) + 1;
    }
    foreach ($taskKeys as $k) {
        $d = explode(':', (string)$k, 2)[0];
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $d)) {
            $activeCounts[$d] = ($activeCounts[$d] ?? 0) + 1;
        }
    }
    $habitsTotal = 0;
    $byHabit = ['water' => 0, 'workout' => 0, 'eyes' => 0];
    foreach ($habitData as $habitId => $list) {
        if (!is_array($list)) continue;
        $habitsTotal += count($list);
        if (array_key_exists($habitId, $byHabit)) $byHabit[$habitId] += count($list);
        foreach ($list as $iso) {
            $d = substr((string)$iso, 0, 10);
            $activeCounts[$d] = ($activeCounts[$d] ?? 0) + 1;
        }
    }

    $activeDays = array_keys($activeCounts);
    $streak = 0;
    $set = array_flip($activeDays);
    $cursor = new DateTime('now', new DateTimeZone('UTC'));
    $guard = 0;
    while (isset($set[$cursor->format('Y-m-d')]) && $guard++ < 3650) {
        $streak++;
        $cursor->modify('-1 day');
    }

    $weekActivity = [];
    for ($i = 6; $i >= 0; $i--) {
        $d = new DateTime('now', new DateTimeZone('UTC'));
        $d->modify("-$i day");
        $date = $d->format('Y-m-d');
        $weekActivity[] = ['date' => $date, 'count' => $activeCounts[$date] ?? 0];
    }

    json_out([
        'RESULT'        => 'OK',
        'LECTURES_READ' => count($reads),
        'TASKS_DONE'    => count($taskKeys),
        'HABITS_DONE'   => $habitsTotal,
        'DAYS_ACTIVE'   => count($activeDays),
        'STREAK'        => $streak,
        'BY_THEME'      => $byTheme,
        'BY_HABIT'      => $byHabit,
        'WEEK_ACTIVITY' => $weekActivity,
    ]);
}

// ============================================================
// STATS global
// ============================================================
if ($P === '/cdn/stats/global.json') {
    json_out(globalStats());
}

// ============================================================
// CDN content
// ============================================================
if (preg_match('#^/cdn/article/([a-z0-9_-]+)/(\d{4}-\d{2}-\d{2})\.json$#', $P, $mm)) {
    json_out(articlesForThemeDate($mm[1], $mm[2]));
}
if (preg_match('#^/cdn/article/\d{4}-\d{2}-\d{2}\.json$#', $P)) {
    json_out(['RESULT' => 'NOT_FOUND'], 404);
}
if (preg_match('#^/cdn/general/(\d{4}-\d{2}-\d{2})\.json$#', $P, $mm)) {
    json_out(generalForDate($mm[1]));
}
if (preg_match('#^/cdn/useful/(\d{4}-\d{2}-\d{2})\.json$#', $P, $mm)) {
    json_out(usefulForDate($mm[1]));
}
if (preg_match('#^/cdn/archive/([a-z0-9_-]+)\.json$#', $P, $mm)) {
    json_out(archiveForTheme($mm[1]));
}
if (preg_match('#^/cdn/tasks/([a-z0-9_-]+)/(\d{4}-\d{2}-\d{2})\.json$#', $P, $mm)) {
    json_out(tasksForThemeDate($mm[1], $mm[2]));
}
if (preg_match('#^/cdn/lectures/charging/(\d{4}-\d{2}-\d{2})\.json$#', $P, $mm)) {
    json_out(chargingLectures($mm[1]));
}
if (preg_match('#^/cdn/lectures/general/(\d{4}-\d{2}-\d{2})\.json$#', $P, $mm)) {
    json_out(generalLectures($mm[1]));
}
if (preg_match('#^/cdn/lectures/([a-z0-9_-]+)/(\d{4}-\d{2}-\d{2})\.json$#', $P, $mm)) {
    json_out(themeLectures($mm[1], $mm[2]));
}

// ============================================================
// PROFILE (в моке просто OK)
// ============================================================
if ($P === '/profile' && $M === 'POST') {
    read_body();
    json_out(['RESULT' => 'OK']);
}

// ============================================================
// Healthcheck
// ============================================================
if ($P === '/' || $P === '') {
    json_out([
        'RESULT'   => 'OK',
        'SERVICE'  => 'pwa-api',
        'TIME'     => server_now(),
        'PUSH'     => push_available() ? 'available' : 'no_library',
        'SCHEDULER'=> 'lazy',
    ]);
}

json_out(['RESULT' => 'NOT_FOUND', 'PATH' => $P], 404);