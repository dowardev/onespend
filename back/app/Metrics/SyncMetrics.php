<?php

namespace App\Metrics;

class SyncMetrics
{
    private array $counters = [];

    private array $histograms = [];

    private array $gauges = [];

    public function increment(string $name, array $labels = [], int $by = 1): void
    {
        $key = $this->key($name, $labels);
        $this->counters[$key] = ($this->counters[$key] ?? 0) + $by;
    }

    public function getCounter(string $name, array $labels = []): int
    {
        return $this->counters[$this->key($name, $labels)] ?? 0;
    }

    public function recordHistogram(string $name, float $value, array $labels = []): void
    {
        $key = $this->key($name, $labels);
        if (! isset($this->histograms[$key])) {
            $this->histograms[$key] = ['count' => 0, 'sum' => 0.0, 'values' => []];
        }
        $this->histograms[$key]['count']++;
        $this->histograms[$key]['sum'] += $value;
        $this->histograms[$key]['values'][] = $value;
    }

    public function getHistogramCount(string $name, array $labels = []): int
    {
        return $this->histograms[$this->key($name, $labels)]['count'] ?? 0;
    }

    public function getHistogramSum(string $name, array $labels = []): float
    {
        return $this->histograms[$this->key($name, $labels)]['sum'] ?? 0.0;
    }

    public function gauge(string $name, float $value, array $labels = []): void
    {
        $this->gauges[$this->key($name, $labels)] = $value;
    }

    public function getGauge(string $name, array $labels = []): float
    {
        return $this->gauges[$this->key($name, $labels)] ?? 0.0;
    }

    public function render(): string
    {
        $lines = [];

        foreach ($this->counters as $key => $value) {
            [$name, $labelStr] = $this->parseKey($key);
            $lines[] = "# HELP {$name} Sync metric counter";
            $lines[] = "# TYPE {$name} counter";
            $lines[] = "{$name}{$labelStr} {$value}";
        }

        foreach ($this->histograms as $key => $data) {
            [$name, $labelStr] = $this->parseKey($key);
            $help = str_replace('_duration', '', $name);
            $lines[] = "# HELP {$name} Sync metric histogram";
            $lines[] = "# TYPE {$name} histogram";
            $lines[] = "{$name}_count{$labelStr} {$data['count']}";
            $lines[] = "{$name}_sum{$labelStr} ".number_format($data['sum'], 2, '.', '');
            $lines[] = "{$name}_bucket{$labelStr} {$data['count']}";
        }

        foreach ($this->gauges as $key => $value) {
            [$name, $labelStr] = $this->parseKey($key);
            $lines[] = "# HELP {$name} Sync metric gauge";
            $lines[] = "# TYPE {$name} gauge";
            $lines[] = "{$name}{$labelStr} {$value}";
        }

        return implode("\n", $lines)."\n";
    }

    private function key(string $name, array $labels = []): string
    {
        if (empty($labels)) {
            return $name;
        }
        ksort($labels);
        $parts = [];
        foreach ($labels as $k => $v) {
            $parts[] = "{$k}=\"{$v}\"";
        }

        return $name.'{'.implode(',', $parts).'}';
    }

    private function parseKey(string $key): array
    {
        $pos = strpos($key, '{');
        if ($pos === false) {
            return [$key, ''];
        }

        return [substr($key, 0, $pos), substr($key, $pos)];
    }
}
