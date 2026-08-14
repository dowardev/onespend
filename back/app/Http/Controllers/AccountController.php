<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace App\Http\Controllers;

use App\Http\Requests\StoreAccountRequest;
use App\Models\Account;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AccountController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $accounts = Account::forUser($request->user()->id)
            ->active()
            ->orderBy('name')
            ->get(['id', 'sync_id', 'name', 'initial_balance', 'status', 'created_at', 'updated_at']);

        return response()->json(['data' => $accounts]);
    }

    public function store(StoreAccountRequest $request): JsonResponse
    {
        $account = Account::create([
            ...$request->validated(),
            'user_id' => $request->user()->id,
            'sync_id' => (string) Str::uuid(),
        ]);

        return response()->json(['data' => $account], 201);
    }

    public function show(Request $request, Account $account): JsonResponse
    {
        if ($account->user_id !== $request->user()->id) {
            return response()->json(['error' => 'Not found'], 404);
        }

        return response()->json(['data' => $account]);
    }

    public function update(StoreAccountRequest $request, Account $account): JsonResponse
    {
        if ($account->user_id !== $request->user()->id) {
            return response()->json(['error' => 'Not found'], 404);
        }

        $account->update($request->validated());

        return response()->json(['data' => $account]);
    }

    public function destroy(Request $request, Account $account): JsonResponse
    {
        if ($account->user_id !== $request->user()->id) {
            return response()->json(['error' => 'Not found'], 404);
        }

        $account->delete();

        return response()->json(['message' => 'Deleted']);
    }
}
