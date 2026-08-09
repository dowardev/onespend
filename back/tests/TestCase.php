<?php

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
