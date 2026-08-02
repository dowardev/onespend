<?php

namespace Database\Seeders;

use App\Models\SystemTestDatum;
use Illuminate\Database\Seeder;

class SystemTestSeeder extends Seeder
{
    public function run(): void
    {
        // Idempotente: si ya existe el registro, lo actualiza en vez de fallar.
        SystemTestDatum::updateOrCreate(
            ['key' => 'healthcheck'],
            [
                'value' => json_encode([
                    'message' => 'backend operational',
                    'seeded_at' => 'production-deploy',
                ]),
            ]
        );
    }
}
