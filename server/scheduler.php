<?php
require_once __DIR__ . '/storage.php';
require_once __DIR__ . '/push.php';

function is_night_time(): bool {
    $n = cfg('night');
    $h = (int)date('G');
    return $h >= (int)$n['start'] || $h < (int)$n['end'];
}

function check_habit_reminders(): array {
    if (is_night_time()) return ['skipped' => 'night'];

    $now       = now_ms();
    $today     = gmdate('Y-m-d');
    $dayStart  = strtotime($today . ' 00:00:00 UTC') * 1000;
    $firstAt   = $dayStart + ((int)cfg('firstReminderDelayH')) * 3600 * 1000;
    if ($now < $firstAt) return ['skipped' => 'before_first'];

    $habitCfg   = cfg('habits');
    $subs       = json_read('subscriptions');
    $allHabits  = json_read('habits');
    $log        = json_read('notifications_log');
    $sent = 0; $failed = 0; $removed = [];

    foreach ($allHabits as $uid => $habitsData) {
        if (!is_array($habitsData)) continue;
        $sub = $subs[$uid] ?? null;
        if (!$sub || empty($sub['endpoint'])) continue;

        foreach ($habitCfg as $habitId => $c) {
            $list = is_array($habitsData[$habitId] ?? null)
                ? $habitsData[$habitId] : [];

            // фильтр «сегодня»
            $todayList = array_values(array_filter($list,
                fn($iso) => substr((string)$iso, 0, 10) === $today));

            if (count($todayList) >= (int)$c['timesPerDay']) continue;

            $lastDoneAt = $todayList
                ? strtotime(end($todayList)) * 1000
                : 0;
            $baseline = $lastDoneAt ?: $firstAt;
            $minMs = ((int)$c['minIntervalMin']) * 60 * 1000;
            if ($now - $baseline < $minMs) continue;

            $logKey = $uid . ':' . $habitId;
            $lastNotifiedAt = (int)($log[$logKey] ?? 0);
            if ($lastNotifiedAt && ($now - $lastNotifiedAt) < $minMs) continue;

            $payload = [
                'title' => $c['title'],
                'body'  => $c['body'],
                'icon'  => '/icons/icon-192.png',
                'badge' => '/icons/icon-192.png',
                'url'   => $c['url'],
                'tag'   => 'habit-' . $habitId,
            ];

            $r = push_send_one($uid, $sub, $payload);
            if ($r['ok']) {
                $sent++;
                json_update('notifications_log', function (&$m) use ($logKey) {
                    $m[$logKey] = now_ms();
                    return ['_save' => true];
                });
                add_push_history([
                    'type' => 'habit-auto', 'target' => $uid, 'habitId' => $habitId,
                    'title' => $c['title'], 'body' => $c['body'], 'url' => $c['url'],
                    'status' => $r['statusCode'],
                ]);
            } else {
                $failed++;
                if ($r['gone']) {
                    $removed[] = $uid;
                }
            }
        }
    }

    // Убираем мёртвые подписки
    if ($removed) {
        $removedSet = array_flip($removed);
        json_update('subscriptions', function (&$subs) use ($removedSet) {
            foreach ($removedSet as $uid => $_) unset($subs[$uid]);
            return ['_save' => true];
        });
    }

    return ['sent' => $sent, 'failed' => $failed, 'removed' => count($removed)];
}

// ─── Режим cron ───
if (PHP_SAPI === 'cli') {
    $result = check_habit_reminders();
    echo '[' . gmdate('c') . '] ' . json_encode($result, JSON_UNESCAPED_UNICODE) . PHP_EOL;
    exit(0);
}