<?php
require_once __DIR__ . '/storage.php';

$autoload = __DIR__ . '/vendor/autoload.php';
if (is_file($autoload)) require_once $autoload;

use Minishlink\WebPush\WebPush;
use Minishlink\WebPush\Subscription;

function push_available(): bool {
    return class_exists(WebPush::class);
}

function push_init(): ?WebPush {
    if (!push_available()) return null;
    $v = cfg('vapid');
    try {
        return new WebPush([
            'VAPID' => [
                'subject'    => $v['subject'],
                'publicKey'  => $v['public'],
                'privateKey' => $v['private'],
            ],
        ]);
    } catch (\Throwable $e) {
        error_log('[push] init failed: ' . $e->getMessage());
        return null;
    }
}

/** @return array{ok:bool,statusCode:?int,message:?string,gone:bool} */
function push_send_one(string $uid, array $subscription, array $payload): array {
    $wp = push_init();
    if (!$wp) {
        return ['ok' => false, 'statusCode' => null,
                'message' => 'web-push library not installed', 'gone' => false];
    }
    try {
        $sub = Subscription::create([
            'endpoint'  => $subscription['endpoint'] ?? '',
            'publicKey' => $subscription['keys']['p256dh'] ?? null,
            'authToken' => $subscription['keys']['auth'] ?? null,
        ]);
        $report = $wp->sendOneNotification(
            $sub,
            json_encode($payload, JSON_UNESCAPED_UNICODE)
        );
        if ($report->isSuccess()) {
            $code = $report->getResponse()
                ? $report->getResponse()->getStatusCode()
                : 201;
            return ['ok' => true, 'statusCode' => $code, 'message' => null, 'gone' => false];
        }
        $code = $report->getResponse()
            ? $report->getResponse()->getStatusCode()
            : null;
        return [
            'ok' => false,
            'statusCode' => $code,
            'message' => $report->getReason(),
            'gone' => in_array($code, [404, 410], true),
        ];
    } catch (\Throwable $e) {
        return ['ok' => false, 'statusCode' => null,
                'message' => $e->getMessage(), 'gone' => false];
    }
}

function add_push_history(array $entry): void {
    json_update('push_history', function (&$history) use ($entry) {
        if (!is_array($history)) $history = [];
        array_unshift($history, array_merge([
            'id' => now_ms() . '-' . bin2hex(random_bytes(3)),
            'ts' => now_ms(),
        ], $entry));
        if (count($history) > 200) $history = array_slice($history, 0, 200);
        return ['_save' => true];
    });
}