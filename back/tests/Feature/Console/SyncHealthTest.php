<?php

namespace Tests\Feature\Console;

use Tests\TestCase;

class SyncHealthTest extends TestCase
{
    public function test_command_runs_successfully()
    {
        $this->artisan('sync:monitor-health')
            ->assertSuccessful();
    }
}
