<?php

function cfg(?string $key = null) {
    static $c = null;
    if ($c === null) $c = require __DIR__ . '/config.php';
    return $key === null ? $c : ($c[$key] ?? null);
}

function storage_dir(): string {
    $dir = __DIR__ . '/storage';
    if (!is_dir($dir)) @mkdir($dir, 0775, true);
    return $dir;
}

/** Серверное «сейчас» в формате JS new Date().toISOString() */
function server_now(): string {
    $t  = microtime(true);
    $s  = (int)$t;
    $ms = (int)(($t - $s) * 1000);
    return gmdate('Y-m-d\TH:i:s', $s) . '.' . sprintf('%03d', $ms) . 'Z';
}

function now_ms(): int {
    return (int)(microtime(true) * 1000);
}

/**
 * Атомарное чтение-модификация-запись JSON-файла.
 * Callback принимает массив $data по ссылке, возвращает результат.
 * Если вернёт ['_save' => false, ...] — файл не перезаписывается.
 */
function json_update(string $name, callable $fn) {
    $file = storage_dir() . '/' . $name . '.json';
    $fp = @fopen($file, 'c+');
    if (!$fp) return null;
    flock($fp, LOCK_EX);
    $raw = stream_get_contents($fp);
    $data = json_decode($raw ?: '', true);
    if (!is_array($data)) $data = [];

    $result = $fn($data);

    if (!is_array($result) || ($result['_save'] ?? true) !== false) {
        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        fflush($fp);
    }

    flock($fp, LOCK_UN);
    fclose($fp);
    return $result;
}

function json_read(string $name): array {
    $file = storage_dir() . '/' . $name . '.json';
    if (!is_file($file)) return [];
    $fp = @fopen($file, 'r');
    if (!$fp) return [];
    flock($fp, LOCK_SH);
    $raw = stream_get_contents($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
    $j = json_decode($raw ?: '', true);
    return is_array($j) ? $j : [];
}

function json_write(string $name, array $data): void {
    json_update($name, function (&$d) use ($data) {
        $d = $data;
        return ['_save' => true];
    });
}

function is_valid_uid(string $uid): bool {
    return (bool)preg_match('/^[a-f0-9]{40}$/i', $uid);
}

/** Rate-limit: возвращает ['ok' => bool, 'retryAfterMs' => int] */
function check_rate(string $key): array {
    $rate = cfg('rate');
    $windowMs = (int)$rate['windowMs'];
    $max      = (int)$rate['max'];
    $now      = now_ms();

    return json_update('rate_buckets', function (&$buckets) use ($key, $now, $windowMs, $max) {
        if (!isset($buckets[$key]) || !is_array($buckets[$key])) $buckets[$key] = [];
        $buckets[$key] = array_values(array_filter(
            $buckets[$key],
            fn($t) => ($now - (int)$t) < $windowMs
        ));
        if (count($buckets[$key]) >= $max) {
            $retryAfterMs = $windowMs - ($now - (int)$buckets[$key][0]);
            return ['ok' => false, 'retryAfterMs' => $retryAfterMs, '_save' => true];
        }
        $buckets[$key][] = $now;
        return ['ok' => true, 'retryAfterMs' => 0, '_save' => true];
    }) ?? ['ok' => true, 'retryAfterMs' => 0];
}