<?php

namespace Tests\Unit\Sync\Processors;

use App\Models\Account;
use App\Services\Sync\Processors\AbstractEntityProcessor;
use Tests\TestCase;

class AbstractEntityProcessorTest extends TestCase
{
    private TestableEntityProcessor $processor;

    protected function setUp(): void
    {
        parent::setUp();
        $this->processor = new TestableEntityProcessor;
    }

    public function test_get_cached_fillable_returns_fillable_fields(): void
    {
        $fillable = $this->processor->exposeGetCachedFillable();

        $this->assertIsArray($fillable);
        $this->assertContains('name', $fillable);
        $this->assertContains('status', $fillable);
    }

    public function test_get_cached_fillable_returns_same_instance_on_multiple_calls(): void
    {
        $first = $this->processor->exposeGetCachedFillable();
        $second = $this->processor->exposeGetCachedFillable();

        $this->assertSame($first, $second);
    }

    public function test_filter_to_fillable_from_cache_filters_data(): void
    {
        $fillable = ['name', 'status'];
        $data = ['name' => 'Test', 'status' => 'active', 'extra' => 'should be removed'];

        $result = $this->processor->exposeFilterToFillableFromCache($data, $fillable);

        $this->assertEquals(['name' => 'Test', 'status' => 'active'], $result);
    }

    public function test_filter_to_fillable_from_cache_returns_all_data_when_empty_fillable(): void
    {
        $data = ['name' => 'Test', 'status' => 'active'];

        $result = $this->processor->exposeFilterToFillableFromCache($data, []);

        $this->assertEquals($data, $result);
    }
}

class TestableEntityProcessor extends AbstractEntityProcessor
{
    public function getModel(): string
    {
        return Account::class;
    }

    public function getEntityName(): string
    {
        return 'test_entity';
    }

    public function exposeGetCachedFillable(): array
    {
        return $this->getCachedFillable();
    }

    public function exposeFilterToFillableFromCache(array $data, array $fillable): array
    {
        return $this->filterToFillableFromCache($data, $fillable);
    }
}
