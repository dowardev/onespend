<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

// Script to create a personal access token for the first user.
// Run: php back/scripts/create_token.php
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;

$user = User::first();
if (! $user) {
    echo "no-user\n";
    exit(1);
}

$token = $user->createToken('mcp-test-token')->plainTextToken;
echo $token.PHP_EOL;
