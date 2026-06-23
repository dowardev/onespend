<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $this->app['router']->aliasMiddleware(
            'sso.auth',
            \App\Http\Middleware\SsoAuthForTests::class,
        );
    }
}
