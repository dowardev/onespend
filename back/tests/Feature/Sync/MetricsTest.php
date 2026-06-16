<?php

namespace Tests\Feature\Sync;

use App\Metrics\SyncMetrics;
use Tests\TestCase;

class MetricsTest extends TestCase
{
    public function test_can_increment_counter()
    {
        $metrics = new SyncMetrics();
        $metrics->increment('sync_getChanges_total');
        $this->assertEquals(1, $metrics->getCounter('sync_getChanges_total'));
    }

    public function test_can_increment_counter_with_labels()
    {
        $metrics = new SyncMetrics();
        $metrics->increment('sync_errors_total', ['error_type' => 'timeout']);
        $metrics->increment('sync_errors_total', ['error_type' => 'timeout']);
        $this->assertEquals(2, $metrics->getCounter('sync_errors_total', ['error_type' => 'timeout']));
    }

    public function test_can_record_histogram()
    {
        $metrics = new SyncMetrics();
        $metrics->recordHistogram('sync_merge_duration_ms', 150.5);
        $this->assertEquals(1, $metrics->getHistogramCount('sync_merge_duration_ms'));
        $this->assertEquals(150.5, $metrics->getHistogramSum('sync_merge_duration_ms'));
    }

    public function test_histogram_calculates_percentiles()
    {
        $metrics = new SyncMetrics();
        $metrics->recordHistogram('sync_pull_latency_ms', 100);
        $metrics->recordHistogram('sync_pull_latency_ms', 200);
        $metrics->recordHistogram('sync_pull_latency_ms', 300);

        $this->assertEquals(3, $metrics->getHistogramCount('sync_pull_latency_ms'));
        $this->assertEquals(600, $metrics->getHistogramSum('sync_pull_latency_ms'));
    }

    public function test_metrics_output_is_prometheus_format()
    {
        $metrics = new SyncMetrics();
        $metrics->increment('sync_getChanges_total');
        $metrics->recordHistogram('sync_merge_duration_ms', 100.0);
        $metrics->recordHistogram('sync_merge_duration_ms', 200.0);

        $output = $metrics->render();

        $this->assertStringContainsString('# HELP sync_getChanges_total', $output);
        $this->assertStringContainsString('# TYPE sync_getChanges_total counter', $output);
        $this->assertStringContainsString('sync_getChanges_total 1', $output);
        $this->assertStringContainsString('sync_merge_duration_ms_count 2', $output);
        $this->assertStringContainsString('sync_merge_duration_ms_sum 300', $output);
    }

    public function test_gauge_operations()
    {
        $metrics = new SyncMetrics();
        $metrics->gauge('sync_queue_depth', 42);
        $this->assertEquals(42, $metrics->getGauge('sync_queue_depth'));

        $metrics->gauge('sync_queue_depth', 10);
        $this->assertEquals(10, $metrics->getGauge('sync_queue_depth'));
    }
}
