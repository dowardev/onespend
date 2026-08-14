<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace Tests;

use App\Http\Middleware\SsoAuthForTests;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $this->app['router']->aliasMiddleware(
            'sso.auth',
            SsoAuthForTests::class,
        );
    }
}
