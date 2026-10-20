<?php
require 'vendor/autoload.php';
use Minishlink\WebPush\VAPID;

$vapidKeys = VAPID::createVapidKeys();
echo 'Public key: ' . $vapidKeys['publicKey'] . "\n";
echo 'Private key: ' . $vapidKeys['privateKey'] . "\n";