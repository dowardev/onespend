<?php

namespace App\Http\Requests\Sync;

use Illuminate\Foundation\Http\FormRequest;

class RecurringRecordSyncRequest extends FormRequest
{
    public static function validationRules(): array
    {
        return [
            'type' => 'required|in:cargo,provedor',
            'entry_type' => 'required|in:ingreso,egreso',
            'name' => 'required|string|max:255',
            'amount' => 'nullable|numeric',
            'account_id' => 'nullable|string|max:100',
            'repeat_frequency' => 'required|in:day,week,month,year',
            'repeat_interval' => 'required|integer|min:1',
            'repeat_days' => 'nullable|array',
            'repeat_month_day' => 'nullable|integer|min:1|max:31',
            'repeat_month_weekday_mode' => 'nullable|boolean',
            'repeat_month_weekday' => 'nullable|integer|min:0|max:6',
            'repeat_month_weekday_ordinal' => 'nullable|integer|min:1|max:5',
            'repeat_year_month' => 'nullable|integer|min:1|max:12',
            'repeat_year_day' => 'nullable|integer|min:1|max:31',
            'time' => 'nullable|date_format:H:i',
            'auto_insert' => 'nullable|boolean',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'estimated' => 'nullable|numeric',
            'items' => 'nullable|array',
            'notes' => 'nullable|string',
            'status' => 'sometimes|in:active,paused,deleted',
            'deleted_at' => 'nullable|date',
        ];
    }

    public function rules(): array
    {
        return self::validationRules();
    }
}
