<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SystemTestDatum extends Model
{
    protected $table = 'system_test_data';

    protected $fillable = [
        'key',
        'value',
    ];
}
