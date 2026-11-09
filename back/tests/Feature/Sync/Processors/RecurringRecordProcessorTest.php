<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace Tests\Feature\Sync\Processors;

use App\Models\Account;
use App\Models\RecurringRecord;
use App\Models\Supplier;
use App\Models\SupplierProduct;
use App\Models\User;
use App\Services\Sync\Processors\RecurringRecordProcessor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RecurringRecordProcessorTest extends TestCase
{
    use RefreshDatabase;

    private RecurringRecordProcessor $processor;

    private User $user;

    private Account $account;

    private string $supplierProductSyncId;

    protected function setUp(): void
    {
        parent::setUp();
        $this->processor = app(RecurringRecordProcessor::class);
        $this->user = User::factory()->create();

        $this->account = Account::create([
            'user_id' => $this->user->id,
            'sync_id' => 'test-account-rr-1',
            'name' => 'RR Account',
            'status' => 'active',
        ]);

        $supplier = Supplier::create([
            'user_id' => $this->user->id,
            'sync_id' => 'test-supplier-rr-1',
            'name' => 'RR Supplier',
        ]);

        $this->supplierProductSyncId = 'test-sp-rr-1';
        SupplierProduct::create([
            'user_id' => $this->user->id,
            'sync_id' => $this->supplierProductSyncId,
            'supplier_id' => $supplier->sync_id,
            'name' => 'RR Supplier Product',
            'price' => 30,
            'status' => 'active',
        ]);
    }

    public function test_process_creates_entity(): void
    {
        $syncId = 'test-rr-create-1';

        $result = $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Monthly Bill',
                'type' => 'cargo',
                'entry_type' => 'egreso',
                'amount' => 200,
                'account_id' => (string) $this->account->sync_id,
                'repeat_frequency' => 'month',
                'repeat_interval' => 1,
                'start_date' => '2026-01-01',
                'status' => 'active',
            ],
        ], $this->user->id);

        $this->assertCount(1, $result);
        $this->assertEquals($syncId, $result[0]['sync_id']);
        $this->assertDatabaseHas('recurring_records', [
            'sync_id' => $syncId,
            'name' => 'Monthly Bill',
            'user_id' => $this->user->id,
        ]);
    }

    public function test_process_creates_entity_with_products(): void
    {
        $syncId = 'test-rr-create-prod-1';
        $productSyncId = 'test-rrp-1';

        $result = $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Record With Products',
                'type' => 'cargo',
                'entry_type' => 'egreso',
                'amount' => 500,
                'account_id' => (string) $this->account->sync_id,
                'repeat_frequency' => 'month',
                'repeat_interval' => 1,
                'start_date' => '2026-01-01',
                'status' => 'active',
                'products' => [
                    [
                        'sync_id' => $productSyncId,
                        'supplier_product_id' => (string) $this->supplierProductSyncId,
                        'product_name' => 'RR Product',
                        'product_price' => 50,
                        'quantity' => 3,
                    ],
                ],
            ],
        ], $this->user->id);

        $this->assertCount(1, $result);
        $this->assertDatabaseHas('recurring_record_products', [
            'sync_id' => $productSyncId,
            'product_name' => 'RR Product',
        ]);
    }

    public function test_process_updates_entity(): void
    {
        $syncId = 'test-rr-update-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Original Record',
                'type' => 'cargo',
                'entry_type' => 'egreso',
                'amount' => 100,
                'repeat_frequency' => 'month',
                'repeat_interval' => 1,
                'start_date' => '2026-01-01',
                'status' => 'active',
            ],
        ], $this->user->id);

        $result = $this->processor->update([
            [
                'id' => $syncId,
                'name' => 'Updated Record',
                'amount' => 300,
            ],
        ], $this->user->id);

        $this->assertCount(1, $result);
        $this->assertEquals($syncId, $result[0]['sync_id']);
        $this->assertDatabaseHas('recurring_records', [
            'sync_id' => $syncId,
            'name' => 'Updated Record',
            'amount' => 300,
        ]);
    }

    public function test_process_deletes_entity(): void
    {
        $syncId = 'test-rr-delete-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'To Delete',
                'type' => 'cargo',
                'entry_type' => 'egreso',
                'amount' => 50,
                'repeat_frequency' => 'month',
                'repeat_interval' => 1,
                'start_date' => '2026-01-01',
                'status' => 'active',
            ],
        ], $this->user->id);

        $result = $this->processor->delete([$syncId], $this->user->id);

        $this->assertCount(1, $result);
        $this->assertContains($syncId, $result);

        $record = RecurringRecord::withTrashed()->where('sync_id', $syncId)->first();
        $this->assertNotNull($record->deleted_at);
        $this->assertEquals('deleted', $record->status);
    }

    public function test_process_skips_unchanged_entity(): void
    {
        $syncId = 'test-rr-skip-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Skip RR',
                'type' => 'cargo',
                'entry_type' => 'egreso',
                'amount' => 50,
                'repeat_frequency' => 'month',
                'repeat_interval' => 1,
                'start_date' => '2026-01-01',
                'status' => 'active',
            ],
        ], $this->user->id);

        $result = $this->processor->update([
            ['id' => $syncId, 'name' => 'Skip RR'],
        ], $this->user->id);

        $this->assertCount(1, $result);
        $this->assertDatabaseHas('recurring_records', [
            'sync_id' => $syncId,
            'name' => 'Skip RR',
        ]);
    }

    public function test_process_handles_conflict(): void
    {
        $syncId = 'test-rr-conflict-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Server RR',
                'type' => 'cargo',
                'entry_type' => 'egreso',
                'amount' => 100,
                'repeat_frequency' => 'month',
                'repeat_interval' => 1,
                'start_date' => '2026-01-01',
                'status' => 'active',
            ],
        ], $this->user->id);

        // Server changes the name (simulating another device editing it).
        RecurringRecord::where('sync_id', $syncId)->update([
            'name' => 'Server RR Changed',
            'updated_at' => now()->addDay(),
        ]);

        // Client tries to change the same field to a different value -> semantic conflict.
        $result = $this->processor->detectConflicts([
            ['id' => $syncId, 'name' => 'Client RR', 'updated_at' => now()->timestamp],
        ], $this->user->id);

        // GitLab #15: a conflict is reported when both sides changed the
        // same field since the merge base.
        $this->assertCount(1, $result['conflicts']);
        $this->assertEquals($syncId, $result['conflicts'][0]['sync_id']);
        $this->assertEquals('semantic', $result['conflicts'][0]['conflict_type']);
        $this->assertContains('name', $result['conflicts'][0]['overlapping_fields']);
    }

    public function test_process_detects_stale_clobber_conflict(): void
    {
        $syncId = 'test-rr-stale-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Original Record',
                'type' => 'cargo',
                'entry_type' => 'egreso',
                'amount' => 100,
                'repeat_frequency' => 'month',
                'repeat_interval' => 1,
                'start_date' => '2026-01-01',
                'status' => 'active',
            ],
        ], $this->user->id);

        // Server changes the name.
        RecurringRecord::where('sync_id', $syncId)->update([
            'name' => 'Server Changed',
            'updated_at' => now()->addDay(),
        ]);

        // Client does NOT change the name (keeps base value) but changes another field.
        // The client pushes the base value for 'name' -> stale clobber.
        $result = $this->processor->detectConflicts([
            ['id' => $syncId, 'name' => 'Original Record', 'updated_at' => now()->timestamp],
        ], $this->user->id);

        $this->assertCount(1, $result['conflicts']);
        $this->assertEquals('concurrent_edit', $result['conflicts'][0]['conflict_type']);
        $this->assertContains('name', $result['conflicts'][0]['changed_fields']);
    }

    // LBDS-273 (GitLab #13): mirror the `category` column that budget_entries
    // already has. Stores a category id (string, not FK) so the contract
    // stays device-local. These tests pin the create-with-category,
    // create-without-category and update-category paths so a regression in
    // the migration, the model's $fillable or the push request's `category`
    // rule is caught here.
    public function test_process_creates_entity_with_category(): void
    {
        $syncId = 'test-rr-category-create-1';

        $result = $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Recurring With Category',
                'type' => 'cargo',
                'entry_type' => 'egreso',
                'amount' => 200,
                'category' => 'streaming',
                'repeat_frequency' => 'month',
                'repeat_interval' => 1,
                'start_date' => '2026-01-01',
                'status' => 'active',
            ],
        ], $this->user->id);

        $this->assertCount(1, $result);
        $this->assertDatabaseHas('recurring_records', [
            'sync_id' => $syncId,
            'category' => 'streaming',
        ]);
    }

    public function test_process_creates_entity_without_category(): void
    {
        $syncId = 'test-rr-category-create-empty-1';

        $result = $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Recurring Without Category',
                'type' => 'cargo',
                'entry_type' => 'egreso',
                'amount' => 50,
                'repeat_frequency' => 'month',
                'repeat_interval' => 1,
                'start_date' => '2026-01-01',
                'status' => 'active',
            ],
        ], $this->user->id);

        $this->assertCount(1, $result);
        $record = RecurringRecord::where('sync_id', $syncId)->first();
        $this->assertNotNull($record);
        $this->assertNull($record->category);
    }

    public function test_process_updates_entity_category(): void
    {
        $syncId = 'test-rr-category-update-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Recurring To Categorize',
                'type' => 'cargo',
                'entry_type' => 'egreso',
                'amount' => 25,
                'repeat_frequency' => 'month',
                'repeat_interval' => 1,
                'start_date' => '2026-01-01',
                'status' => 'active',
            ],
        ], $this->user->id);

        $this->processor->update([
            [
                'id' => $syncId,
                'category' => 'groceries',
            ],
        ], $this->user->id);

        $this->assertDatabaseHas('recurring_records', [
            'sync_id' => $syncId,
            'category' => 'groceries',
        ]);

        // Clearing category back to null also has to land in the DB
        // (D2-equivalent: optional).
        $this->processor->update([
            ['id' => $syncId, 'category' => null],
        ], $this->user->id);

        $record = RecurringRecord::where('sync_id', $syncId)->first();
        $this->assertNotNull($record);
        $this->assertNull($record->category);
    }

    // GitLab #17 (P1): the `time` column is a MySQL TIME, so the database
    // stores "14:30:00" while the wire format (and the local row) is
    // "HH:MM". Unlike `budget_entries`, recurring records had no accessor
    // normalizing the value on read, so the API handed "14:30:00" back and
    // the client stored it verbatim. These tests pin the same contract the
    // budget entries already have.

    public function test_time_accessor_normalizes_mysql_time_to_hh_mm(): void
    {
        $syncId = 'test-rr-time-accessor-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Recurring At Half Past',
                'type' => 'cargo',
                'entry_type' => 'egreso',
                'amount' => 100,
                'account_id' => (string) $this->account->sync_id,
                'repeat_frequency' => 'month',
                'repeat_interval' => 1,
                'start_date' => '2026-01-01',
                'time' => '14:30',
                'status' => 'active',
            ],
        ], $this->user->id);

        $record = RecurringRecord::where('sync_id', $syncId)->first();
        $this->assertNotNull($record);

        // Raw DB value is the MySQL TIME shape...
        $this->assertSame('14:30:00', $record->getRawOriginal('time'));
        // ...and the model accessor is what the API and the conflict
        // detector see: "HH:MM", so the field hash matches the one the
        // client computes over its "HH:MM" local value.
        $this->assertSame('14:30', $record->time);
        $this->assertSame('14:30', $record->toArray()['time']);
    }

    public function test_process_stores_single_digit_hour_time(): void
    {
        $syncId = 'test-rr-time-single-digit-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Recurring At Nine',
                'type' => 'cargo',
                'entry_type' => 'egreso',
                'amount' => 100,
                'account_id' => (string) $this->account->sync_id,
                'repeat_frequency' => 'month',
                'repeat_interval' => 1,
                'start_date' => '2026-01-01',
                'time' => '9:00',
                'status' => 'active',
            ],
        ], $this->user->id);

        $record = RecurringRecord::where('sync_id', $syncId)->first();
        $this->assertNotNull($record);
        $this->assertSame('09:00:00', $record->getRawOriginal('time'));
        $this->assertSame('09:00', $record->time);
    }

    public function test_process_treats_empty_time_as_null(): void
    {
        $syncId = 'test-rr-time-empty-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Recurring Without Time',
                'type' => 'cargo',
                'entry_type' => 'egreso',
                'amount' => 100,
                'account_id' => (string) $this->account->sync_id,
                'repeat_frequency' => 'month',
                'repeat_interval' => 1,
                'start_date' => '2026-01-01',
                'time' => '',
                'status' => 'active',
            ],
        ], $this->user->id);

        $record = RecurringRecord::where('sync_id', $syncId)->first();
        $this->assertNotNull($record);
        // An empty string means "no time" — it must not land as a zero time.
        $this->assertNull($record->time);
    }
}
