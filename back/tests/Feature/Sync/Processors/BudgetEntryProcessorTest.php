<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace Tests\Feature\Sync\Processors;

use App\Models\Account;
use App\Models\BudgetEntry;
use App\Models\BudgetEntryGroup;
use App\Models\User;
use App\Services\Sync\Processors\BudgetEntryProcessor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BudgetEntryProcessorTest extends TestCase
{
    use RefreshDatabase;

    private BudgetEntryProcessor $processor;

    private User $user;

    private Account $account;

    protected function setUp(): void
    {
        parent::setUp();
        $this->processor = app(BudgetEntryProcessor::class);
        $this->user = User::factory()->create();
        $this->account = Account::create([
            'user_id' => $this->user->id,
            'sync_id' => 'test-account-be-1',
            'name' => 'Test Account',
            'status' => 'active',
        ]);
    }

    public function test_process_creates_entity(): void
    {
        $syncId = 'test-budget-entry-create-1';

        $result = $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Test Entry',
                'amount' => 150.00,
                'date' => '2026-06-01',
                'entry_type' => 'egreso',
                'payment_type' => 'cash',
                'account_id' => (string) $this->account->sync_id,
                'status' => 'active',
            ],
        ], $this->user->id);

        $this->assertCount(1, $result);
        $this->assertEquals($syncId, $result[0]['sync_id']);
        $this->assertDatabaseHas('budget_entries', [
            'sync_id' => $syncId,
            'name' => 'Test Entry',
            'amount' => 150.00,
            'entry_type' => 'egreso',
            'user_id' => $this->user->id,
        ]);
    }

    public function test_process_creates_entity_with_groups(): void
    {
        $syncId = 'test-be-groups-1';
        $account2 = Account::create([
            'user_id' => $this->user->id,
            'sync_id' => 'test-account-be-g-2',
            'name' => 'Account 2',
            'status' => 'active',
        ]);

        $result = $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Entry With Groups',
                'amount' => 300,
                'date' => '2026-06-15',
                'entry_type' => 'egreso',
                'payment_type' => 'cash',
                'account_id' => (string) $this->account->sync_id,
                'status' => 'active',
                'groups' => [
                    ['account_id' => (string) $this->account->sync_id, 'amount' => 100],
                    ['account_id' => (string) $account2->sync_id, 'amount' => 200],
                ],
            ],
        ], $this->user->id);

        $this->assertCount(1, $result);
        $this->assertEquals($syncId, $result[0]['sync_id']);

        $entry = BudgetEntry::where('sync_id', $syncId)->first();
        $this->assertNotNull($entry);

        $groups = BudgetEntryGroup::where('budget_entry_id', $entry->id)->get();
        $this->assertCount(2, $groups);
    }

    public function test_process_updates_entity(): void
    {
        $syncId = 'test-be-update-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Original',
                'amount' => 100,
                'date' => '2026-06-01',
                'entry_type' => 'egreso',
                'status' => 'active',
            ],
        ], $this->user->id);

        $result = $this->processor->update([
            [
                'id' => $syncId,
                'name' => 'Updated Entry',
                'amount' => 200,
                'account_id' => (string) $this->account->sync_id,
            ],
        ], $this->user->id);

        $this->assertCount(1, $result);
        $this->assertEquals($syncId, $result[0]['sync_id']);
        $this->assertDatabaseHas('budget_entries', [
            'sync_id' => $syncId,
            'name' => 'Updated Entry',
            'amount' => 200,
        ]);
    }

    public function test_process_deletes_entity(): void
    {
        $syncId = 'test-be-delete-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'To Delete',
                'amount' => 50,
                'date' => '2026-06-01',
                'entry_type' => 'egreso',
                'status' => 'active',
            ],
        ], $this->user->id);

        $result = $this->processor->delete([$syncId], $this->user->id);

        $this->assertCount(1, $result);
        $this->assertContains($syncId, $result);

        $entry = BudgetEntry::withTrashed()->where('sync_id', $syncId)->first();
        $this->assertNotNull($entry->deleted_at);
        $this->assertEquals('deleted', $entry->status);
    }

    public function test_process_skips_unchanged_entity(): void
    {
        $syncId = 'test-be-skip-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Skip Test',
                'amount' => 75,
                'date' => '2026-06-01',
                'entry_type' => 'egreso',
                'status' => 'active',
            ],
        ], $this->user->id);

        $result = $this->processor->update([
            ['id' => $syncId, 'name' => 'Skip Test'],
        ], $this->user->id);

        $this->assertCount(1, $result);
        $this->assertDatabaseHas('budget_entries', [
            'sync_id' => $syncId,
            'name' => 'Skip Test',
        ]);
    }

    public function test_process_creates_entity_with_category(): void
    {
        $syncId = 'test-be-category-1';

        $result = $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Salary Entry',
                'amount' => 1000.00,
                'date' => '2026-09-01',
                'entry_type' => 'ingreso',
                'payment_type' => 'cash',
                'category' => 'salary',
                'account_id' => (string) $this->account->sync_id,
                'status' => 'active',
            ],
        ], $this->user->id);

        $this->assertCount(1, $result);
        $this->assertEquals($syncId, $result[0]['sync_id']);
        $this->assertDatabaseHas('budget_entries', [
            'sync_id' => $syncId,
            'category' => 'salary',
        ]);
    }

    public function test_process_creates_entity_without_category(): void
    {
        $syncId = 'test-be-no-category-1';

        $result = $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Uncategorized Entry',
                'amount' => 50.00,
                'date' => '2026-09-01',
                'entry_type' => 'egreso',
                'payment_type' => 'cash',
                'account_id' => (string) $this->account->sync_id,
                'status' => 'active',
            ],
        ], $this->user->id);

        $this->assertCount(1, $result);
        $entry = BudgetEntry::where('sync_id', $syncId)->first();
        $this->assertNotNull($entry);
        $this->assertNull($entry->category);
    }

    public function test_process_handles_conflict(): void
    {
        $syncId = 'test-be-conflict-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Server Version',
                'amount' => 100,
                'date' => '2026-06-01',
                'entry_type' => 'egreso',
                'status' => 'active',
            ],
        ], $this->user->id);

        BudgetEntry::where('sync_id', $syncId)->update([
            'name' => 'Server Version Changed',
            'updated_at' => now()->addDay(),
        ]);

        $oldTimestamp = now()->subDay()->timestamp;

        $result = $this->processor->detectConflicts([
            ['id' => $syncId, 'name' => 'Client Version', 'updated_at' => $oldTimestamp],
        ], $this->user->id);

        // GitLab #15: a conflict is reported when both sides changed the
        // same field since the merge base.
        $this->assertCount(1, $result['conflicts']);
        $this->assertEquals($syncId, $result['conflicts'][0]['sync_id']);
        $this->assertEquals('semantic', $result['conflicts'][0]['conflict_type']);
        $this->assertContains('name', $result['conflicts'][0]['overlapping_fields']);
    }
    public function test_process_updates_entity_with_groups(): void
    {
        $syncId = 'test-be-update-groups-1';
        $account2 = Account::create([
            'user_id' => $this->user->id,
            'sync_id' => 'test-account-be-ug-2',
            'name' => 'Account 2',
            'status' => 'active',
        ]);

        $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Entry To Update Groups',
                'amount' => 300,
                'date' => '2026-06-15',
                'entry_type' => 'egreso',
                'payment_type' => 'cash',
                'account_id' => (string) $this->account->sync_id,
                'status' => 'active',
                'groups' => [
                    ['sync_id' => 'g-seed-1', 'account_id' => (string) $this->account->sync_id, 'amount' => 300],
                ],
            ],
        ], $this->user->id);

        $entry = BudgetEntry::where('sync_id', $syncId)->first();
        $this->assertNotNull($entry);
        $this->assertCount(1, BudgetEntryGroup::where('budget_entry_id', $entry->id)->get());

        // Update with stable client sync_ids: replaces groups idempotently.
        $this->processor->update([
            [
                'id' => $syncId,
                'name' => 'Entry To Update Groups',
                'groups' => [
                    ['sync_id' => 'g-1', 'account_id' => (string) $this->account->sync_id, 'amount' => 150],
                    ['sync_id' => 'g-2', 'account_id' => (string) $account2->sync_id, 'amount' => 250],
                ],
            ],
        ], $this->user->id);

        $groups = BudgetEntryGroup::where('budget_entry_id', $entry->id)->orderBy('amount')->get();
        $this->assertCount(2, $groups);
        $this->assertEquals(['g-1', 'g-2'], $groups->pluck('sync_id')->all());
        $this->assertEquals($this->account->id, $groups[0]->account_id);
        $this->assertEquals($account2->id, $groups[1]->account_id);
        $this->assertEquals([150, 250], $groups->pluck('amount')->map(fn ($v) => (int) $v)->all());

        // Re-applying the same payload is idempotent (no churn, no duplicates).
        $this->processor->update([
            [
                'id' => $syncId,
                'name' => 'Entry To Update Groups',
                'groups' => [
                    ['sync_id' => 'g-1', 'account_id' => (string) $this->account->sync_id, 'amount' => 150],
                    ['sync_id' => 'g-2', 'account_id' => (string) $account2->sync_id, 'amount' => 250],
                ],
            ],
        ], $this->user->id);
        $this->assertCount(2, BudgetEntryGroup::where('budget_entry_id', $entry->id)->get());

        // Update without the groups key leaves existing groups untouched.
        $this->processor->update([
            ['id' => $syncId, 'name' => 'Entry To Update Groups'],
        ], $this->user->id);
        $this->assertCount(2, BudgetEntryGroup::where('budget_entry_id', $entry->id)->get());

        // Explicit empty groups clears all groups for the entry.
        $this->processor->update([
            ['id' => $syncId, 'name' => 'Entry To Update Groups', 'groups' => []],
        ], $this->user->id);
        $this->assertCount(0, BudgetEntryGroup::where('budget_entry_id', $entry->id)->get());
    }

    // LBDS-275: the entry form collected a free-form note per budget entry,
    // but no column / fillable entry existed, so the note was lost on save.
    // The migration adds the column and the model's $fillable accepts it;
    // these tests pin both the create and the update paths so a regression
    // anywhere in the chain (processor, fillable, migration) is caught here.
    public function test_process_creates_entity_with_notes(): void
    {
        $syncId = 'test-be-notes-create-1';

        $result = $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Entry With Note',
                'amount' => 42.50,
                'date' => '2026-10-12',
                'entry_type' => 'egreso',
                'payment_type' => 'cash',
                'account_id' => (string) $this->account->sync_id,
                'notes' => 'Pagué en efectivo, dejar recibo',
                'status' => 'active',
            ],
        ], $this->user->id);

        $this->assertCount(1, $result);
        $this->assertDatabaseHas('budget_entries', [
            'sync_id' => $syncId,
            'notes' => 'Pagué en efectivo, dejar recibo',
        ]);
    }

    public function test_process_creates_entity_without_notes(): void
    {
        $syncId = 'test-be-notes-create-empty-1';

        $result = $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Entry Without Note',
                'amount' => 20.00,
                'date' => '2026-10-12',
                'entry_type' => 'egreso',
                'payment_type' => 'cash',
                'account_id' => (string) $this->account->sync_id,
                'status' => 'active',
            ],
        ], $this->user->id);

        $this->assertCount(1, $result);
        $entry = BudgetEntry::where('sync_id', $syncId)->first();
        $this->assertNotNull($entry);
        $this->assertNull($entry->notes);
    }

    public function test_process_updates_entity_notes(): void
    {
        $syncId = 'test-be-notes-update-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Entry To Annotate',
                'amount' => 100.00,
                'date' => '2026-10-12',
                'entry_type' => 'egreso',
                'payment_type' => 'cash',
                'account_id' => (string) $this->account->sync_id,
                'status' => 'active',
            ],
        ], $this->user->id);

        $this->processor->update([
            [
                'id' => $syncId,
                'notes' => 'Nota agregada en un update posterior',
            ],
        ], $this->user->id);

        $this->assertDatabaseHas('budget_entries', [
            'sync_id' => $syncId,
            'notes' => 'Nota agregada en un update posterior',
        ]);

        // Clearing the note back to null also has to land in the DB.
        $this->processor->update([
            ['id' => $syncId, 'notes' => null],
        ], $this->user->id);

        $entry = BudgetEntry::where('sync_id', $syncId)->first();
        $this->assertNotNull($entry);
        $this->assertNull($entry->notes);
    }

    // LBDS-273 (GitLab #13): mirror the `time` column that recurring_records
    // already has. The column is nullable (D2: optional) and stored as
    // HH:MM. These tests pin the create-with-time, create-without-time
    // and update-time paths so a regression in the migration, the model's
    // $fillable or the push request's `time` rule is caught here.
    public function test_process_creates_entity_with_time(): void
    {
        $syncId = 'test-be-time-create-1';

        $result = $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Entry With Time',
                'amount' => 30.00,
                'date' => '2026-10-18',
                'entry_type' => 'egreso',
                'payment_type' => 'cash',
                'account_id' => (string) $this->account->sync_id,
                'time' => '14:30',
                'status' => 'active',
            ],
        ], $this->user->id);

        $this->assertCount(1, $result);
        $this->assertDatabaseHas('budget_entries', [
            'sync_id' => $syncId,
            'time' => '14:30:00',
        ]);
    }

    public function test_process_creates_entity_without_time(): void
    {
        $syncId = 'test-be-time-create-empty-1';

        $result = $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Entry Without Time',
                'amount' => 15.00,
                'date' => '2026-10-18',
                'entry_type' => 'egreso',
                'payment_type' => 'cash',
                'account_id' => (string) $this->account->sync_id,
                'status' => 'active',
            ],
        ], $this->user->id);

        $this->assertCount(1, $result);
        $entry = BudgetEntry::where('sync_id', $syncId)->first();
        $this->assertNotNull($entry);
        $this->assertNull($entry->time);
    }

    public function test_process_updates_entity_time(): void
    {
        $syncId = 'test-be-time-update-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Entry To Time',
                'amount' => 25.00,
                'date' => '2026-10-18',
                'entry_type' => 'egreso',
                'payment_type' => 'cash',
                'account_id' => (string) $this->account->sync_id,
                'status' => 'active',
            ],
        ], $this->user->id);

        $this->processor->update([
            [
                'id' => $syncId,
                'time' => '09:15',
            ],
        ], $this->user->id);

        $this->assertDatabaseHas('budget_entries', [
            'sync_id' => $syncId,
            'time' => '09:15:00',
        ]);

        // Clearing time back to null also has to land in the DB (D2: optional).
        $this->processor->update([
            ['id' => $syncId, 'time' => null],
        ], $this->user->id);

        $entry = BudgetEntry::where('sync_id', $syncId)->first();
        $this->assertNotNull($entry);
        $this->assertNull($entry->time);
    }

    // LBDS-273 (F7): edge cases of the `time` field.
    //
    // The column is a MySQL TIME, so the database stores "14:30:00" while
    // the wire format (and the local row) is "HH:MM". The model accessor
    // normalizes on read; these tests pin that contract, the empty-string
    // handling, and the single-digit hour that PHP's H:i format accepts.

    public function test_process_stores_single_digit_hour_time(): void
    {
        $syncId = 'test-be-time-single-digit-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Entry At Nine',
                'amount' => 10.00,
                'date' => '2026-10-18',
                'entry_type' => 'egreso',
                'payment_type' => 'cash',
                'account_id' => (string) $this->account->sync_id,
                'time' => '9:00',
                'status' => 'active',
            ],
        ], $this->user->id);

        $entry = BudgetEntry::where('sync_id', $syncId)->first();
        $this->assertNotNull($entry);
        // MySQL zero-pads the hour when it stores a TIME, so the raw value
        // is "09:00:00" and the accessor returns "09:00". Both shapes are
        // accepted by the back's H:i validation, and the client-side pull
        // normalizer keeps whatever padding the server sent.
        $this->assertSame('09:00:00', $entry->getRawOriginal('time'));
        $this->assertSame('09:00', $entry->time);
    }

    public function test_time_accessor_normalizes_mysql_time_to_hh_mm(): void
    {
        $syncId = 'test-be-time-accessor-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Entry For Accessor',
                'amount' => 20.00,
                'date' => '2026-10-18',
                'entry_type' => 'egreso',
                'payment_type' => 'cash',
                'account_id' => (string) $this->account->sync_id,
                'time' => '14:30',
                'status' => 'active',
            ],
        ], $this->user->id);

        $entry = BudgetEntry::where('sync_id', $syncId)->first();
        $this->assertNotNull($entry);

        // Raw DB value is the MySQL TIME shape...
        $this->assertSame('14:30:00', $entry->getRawOriginal('time'));
        // ...and the model accessor is what the API and the conflict
        // detector see: "HH:MM", so the field hash matches the one the
        // client computes over its "HH:MM" local value.
        $this->assertSame('14:30', $entry->time);
        $this->assertSame('14:30', $entry->toArray()['time']);
    }

    public function test_process_treats_empty_time_as_null(): void
    {
        $syncId = 'test-be-time-empty-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Entry With Empty Time',
                'amount' => 30.00,
                'date' => '2026-10-18',
                'entry_type' => 'egreso',
                'payment_type' => 'cash',
                'account_id' => (string) $this->account->sync_id,
                'time' => '',
                'status' => 'active',
            ],
        ], $this->user->id);

        $entry = BudgetEntry::where('sync_id', $syncId)->first();
        $this->assertNotNull($entry);
        // An empty string means "no time" — it must not be stored as a
        // zero time, and it must not blow up the validation either.
        $this->assertNull($entry->time);
    }

    public function test_no_false_conflict_when_client_omits_time(): void
    {
        $syncId = 'test-be-no-false-conflict-time-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Entry Without Time',
                'amount' => 50.00,
                'date' => '2026-10-18',
                'entry_type' => 'egreso',
                'payment_type' => 'cash',
                'account_id' => (string) $this->account->sync_id,
                'status' => 'active',
            ],
        ], $this->user->id);

        // The client always sends the `time` key (null when the entry has
        // no time) so the payload hashes the same way the stored row does.
        // A payload that OMITS the key hashes differently from the stored
        // row (which carries a null time), and that used to raise a
        // phantom conflict on every push of an entry without a time.
        $result = $this->processor->detectConflicts([
            [
                'id' => $syncId,
                'name' => 'Entry Without Time',
                'amount' => 50.00,
                'date' => '2026-10-18',
                'entry_type' => 'egreso',
                'payment_type' => 'cash',
                'account_id' => (string) $this->account->sync_id,
                'time' => null,
                'status' => 'active',
                'updated_at' => now()->timestamp,
            ],
        ], $this->user->id);

        $this->assertCount(0, $result['conflicts']);
    }

    public function test_no_false_conflict_when_client_predates_the_time_field(): void
    {
        $syncId = 'test-be-no-false-conflict-old-client-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Entry For Old Client',
                'amount' => 50.00,
                'date' => '2026-10-18',
                'entry_type' => 'egreso',
                'payment_type' => 'cash',
                'account_id' => (string) $this->account->sync_id,
                'status' => 'active',
            ],
        ], $this->user->id);

        // A client build that predates the `time` field does not send the
        // key at all. The stored row carries a null time, so the two field
        // hashes still have to match — otherwise every push from an older
        // client would raise a phantom conflict on the entries that do not
        // use a time.
        $result = $this->processor->detectConflicts([
            [
                'id' => $syncId,
                'name' => 'Entry For Old Client',
                'amount' => 50.00,
                'date' => '2026-10-18',
                'entry_type' => 'egreso',
                'payment_type' => 'cash',
                'account_id' => (string) $this->account->sync_id,
                'status' => 'active',
                'updated_at' => now()->timestamp,
            ],
        ], $this->user->id);

        $this->assertCount(0, $result['conflicts']);
    }

    public function test_no_false_conflict_for_single_digit_hour(): void
    {
        $syncId = 'test-be-no-false-conflict-single-digit-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Entry At Nine',
                'amount' => 50.00,
                'date' => '2026-10-18',
                'entry_type' => 'egreso',
                'payment_type' => 'cash',
                'account_id' => (string) $this->account->sync_id,
                'time' => '9:00',
                'status' => 'active',
            ],
        ], $this->user->id);

        // MySQL zero-pads the hour ("9:00" is stored as "09:00:00"), and the
        // accessor returns the canonical "09:00". The client normalizes to
        // the same shape before pushing, so the two hashes match and the
        // second push of the row does not raise a phantom conflict.
        $result = $this->processor->detectConflicts([
            [
                'id' => $syncId,
                'name' => 'Entry At Nine',
                'amount' => 50.00,
                'date' => '2026-10-18',
                'entry_type' => 'egreso',
                'payment_type' => 'cash',
                'account_id' => (string) $this->account->sync_id,
                'time' => '09:00',
                'status' => 'active',
                'updated_at' => now()->timestamp,
            ],
        ], $this->user->id);

        $this->assertCount(0, $result['conflicts']);
    }

    public function test_batch_update_applies_time_to_every_item(): void
    {
        $first = 'test-be-batch-time-1';
        $second = 'test-be-batch-time-2';

        foreach ([$first, $second] as $syncId) {
            $this->processor->create([
                [
                    'id' => $syncId,
                    'name' => 'Entry',
                    'amount' => 50.00,
                    'date' => '2026-10-18',
                    'entry_type' => 'egreso',
                    'payment_type' => 'cash',
                    'account_id' => (string) $this->account->sync_id,
                    'time' => '09:00',
                    'status' => 'active',
                ],
            ], $this->user->id);
        }

        // Both items carry the `time` key, so the batch update applies it
        // to both. (Before GitLab #16 the bulk update derived the column
        // set from the FIRST item of the batch only, so an item that
        // omitted the key used to lose its time change silently.)
        $this->processor->update([
            [
                'id' => $first,
                'name' => 'Entry One',
                'amount' => 50.00,
                'date' => '2026-10-18',
                'entry_type' => 'egreso',
                'payment_type' => 'cash',
                'account_id' => (string) $this->account->sync_id,
                'time' => '18:45',
                'status' => 'active',
            ],
            [
                'id' => $second,
                'name' => 'Entry Two',
                'amount' => 50.00,
                'date' => '2026-10-18',
                'entry_type' => 'egreso',
                'payment_type' => 'cash',
                'account_id' => (string) $this->account->sync_id,
                'time' => '20:00',
                'status' => 'active',
            ],
        ], $this->user->id);

        $this->assertSame('18:45', BudgetEntry::where('sync_id', $first)->first()->time);
        $this->assertSame('20:00', BudgetEntry::where('sync_id', $second)->first()->time);
    }

    // GitLab #16 (P2): the bulk update used to derive the SET column list
    // from the FIRST item of the batch only. A column that a later item
    // carried (here `notes`) was silently dropped from the UPDATE, so the
    // later item's note never reached the DB. The column set is now the
    // union of every item's keys.
    public function test_batch_update_applies_notes_to_every_item(): void
    {
        $withoutNote = 'test-be-batch-notes-1';
        $withNote = 'test-be-batch-notes-2';

        $this->processor->create([
            [
                'id' => $withoutNote,
                'name' => 'Entry Without Note',
                'amount' => 10.00,
                'date' => '2026-10-20',
                'entry_type' => 'egreso',
                'payment_type' => 'cash',
                'account_id' => (string) $this->account->sync_id,
                'notes' => 'Nota que el cliente no manda',
                'status' => 'active',
            ],
        ], $this->user->id);

        $this->processor->create([
            [
                'id' => $withNote,
                'name' => 'Entry With Note',
                'amount' => 20.00,
                'date' => '2026-10-20',
                'entry_type' => 'egreso',
                'payment_type' => 'cash',
                'account_id' => (string) $this->account->sync_id,
                'notes' => 'Nota original del servidor',
                'status' => 'active',
            ],
        ], $this->user->id);

        // The FIRST item of the batch does not carry the `notes` key; the
        // second one does. Before the fix, the `notes` column was not part
        // of the SET list at all and the second item kept its old note.
        $this->processor->update([
            [
                'id' => $withoutNote,
                'name' => 'Entry Without Note',
                'amount' => 10.00,
                'date' => '2026-10-20',
                'entry_type' => 'egreso',
                'payment_type' => 'cash',
                'account_id' => (string) $this->account->sync_id,
                'status' => 'active',
            ],
            [
                'id' => $withNote,
                'name' => 'Entry With Note',
                'amount' => 20.00,
                'date' => '2026-10-20',
                'entry_type' => 'egreso',
                'payment_type' => 'cash',
                'account_id' => (string) $this->account->sync_id,
                'notes' => 'Nota nueva del cliente',
                'status' => 'active',
            ],
        ], $this->user->id);

        $this->assertDatabaseHas('budget_entries', [
            'sync_id' => $withNote,
            'notes' => 'Nota nueva del cliente',
        ]);

        // GitLab #16 (F1): the first item did not carry the `notes` key,
        // which on the client means "don't touch the note" (only an
        // explicit null clears it). Its server-side note has to survive
        // the batch update instead of being wiped to NULL.
        $entry = BudgetEntry::where('sync_id', $withoutNote)->first();
        $this->assertNotNull($entry);
        $this->assertSame('Nota que el cliente no manda', $entry->notes);
    }

    public function test_process_drops_malformed_time(): void
    {
        $syncId = 'test-be-time-malformed-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Entry With Garbage Time',
                'amount' => 50.00,
                'date' => '2026-10-18',
                'entry_type' => 'egreso',
                'payment_type' => 'cash',
                'account_id' => (string) $this->account->sync_id,
                'time' => '99:99',
                'status' => 'active',
            ],
        ], $this->user->id);

        // A value that is not a usable time of day is dropped rather than
        // stored: MySQL would silently coerce it to a zero time in
        // non-strict mode, and the user would see "00:00" on the entry.
        $entry = BudgetEntry::where('sync_id', $syncId)->first();
        $this->assertNotNull($entry);
        $this->assertNull($entry->time);
    }
}