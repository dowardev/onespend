/// <reference types="cypress" />

const SSO_TOKEN_KEY = '@tu-org/sso-client:token';

Cypress.Commands.add('login', (token?: string) => {
  cy.window().then((win) => {
    win.localStorage.setItem(SSO_TOKEN_KEY, token ?? 'test-sso-token');
  });
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- required Cypress type augmentation
  namespace Cypress {
    interface Chainable {
      login(token?: string): Chainable<void>
    }
  }
}
