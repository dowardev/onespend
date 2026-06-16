<?php

namespace App\Http\Controllers;

use App\Metrics\SyncMetrics;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class MetricsController extends Controller
{
    public function __construct(
        private SyncMetrics $metrics
    ) {}

    public function __invoke(Request $request): Response
    {
        return response($this->metrics->render(), 200)
            ->header('Content-Type', 'text/plain; version=0.0.4');
    }
}
