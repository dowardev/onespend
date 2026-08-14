// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

/// <reference types="cypress" />
 

function mergeResponse(status: 'created' | 'updated', syncId: string) {
  const bucket = status === 'created' ? 'created' : 'updated';
  return {
    success: true,
    results: {
      [bucket]: { budget_entry: [{ sync_id: syncId, id: 123 }] },
      updated: status === 'updated' ? { budget_entry: [{ sync_id: syncId, id: 123 }] } : {},
      deleted: {},
      skipped: {},
      conflicts: {},
      errors: {},
    },
    serverTime: new Date().toISOString(),
  };
}

describe('Create entry then edit immediately', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/budget');

    cy.intercept('POST', '/api/sync/merge', (req) => {
      const entryBody = req.body?.budget_entry?.[0];
      if (entryBody?._deleted) {
        req.reply(mergeResponse('updated', entryBody.id));
      } else if (entryBody?.name && !entryBody._conflict) {
        const wasCreated = entryBody.name.startsWith('Edit');
        req.reply(mergeResponse(wasCreated ? 'updated' : 'created', entryBody.id));
      } else {
        req.reply({ success: true, results: {}, serverTime: new Date().toISOString() });
      }
    }).as('syncMerge');
  });

  it('should create entry, edit immediately, and not leave stuck items in queue', () => {
    const originalName = 'Test Entry ' + Date.now();
    const editedName = 'Edited ' + originalName;

    // 1. Open add menu → choose "Registro"
    cy.get('#add-btn', { timeout: 10000 }).should('be.visible').click();
    cy.contains('ion-label', 'Registro').click();
    cy.url({ timeout: 10000 }).should('include', '/budget/entry/new');

    // 2. Fill name and save
    cy.get('ion-input[data-cy="entry-name-input"]', { timeout: 10000 }).type(originalName);
    cy.get('ion-button[data-cy="save-entry-btn"]').click();

    // 3. Wait for create sync
    cy.wait('@syncMerge', { timeout: 15000 });
    cy.url({ timeout: 10000 }).should('not.include', '/budget/entry/new');

    // 4. Click the entry to edit
    cy.contains('ion-item.transparent[button]', originalName, { timeout: 10000 }).click();
    cy.url({ timeout: 10000 }).should('include', '/budget/entry/edit');

    // 5. Change name and save
    cy.get('ion-input[data-cy="entry-name-input"]', { timeout: 10000 }).clear().type(editedName);
    cy.get('ion-button[data-cy="save-entry-btn"]').click();

    // 6. Wait for edit sync
    cy.wait('@syncMerge', { timeout: 15000 });
    cy.url({ timeout: 10000 }).should('not.include', '/budget/entry/edit');

    // 7. Assert queue is empty (no stuck items)
    cy.window().then(async (win: Window) => {
      if (win.__devDb) {
        const count = await win.__devDb.countSyncQueue();
        expect(count, 'sync queue should be empty after processing').to.equal(0);
      }
    });

    // 8. Assert entry exists in Dexie with edited name and version > 0
    cy.window().then(async (win: Window) => {
      if (win.__devDb) {
        const entries = await win.__devDb.getBudgetEntries();
        const target = entries.find((e: { name: string }) => e.name === editedName);
        expect(target, `entry "${editedName}" should exist in Dexie`).to.not.equal(undefined);
        expect(target?.version, 'version should be > 0 after sync').to.be.greaterThan(0);
      }
    });
  });
});
