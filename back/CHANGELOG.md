# Changelog

All notable changes to the OneSpend backend will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [v0.76.1-rc.4] - 2026-09-04

### Added

- Nullable `category` (string, 100) field on budget entries: migration `2026_09_01_000000_add_category_to_budget_entries_table`, `BudgetEntry::$fillable`, and `BudgetEntrySyncRequest` validation (`nullable|string|max:100`) (LBDS-210).
