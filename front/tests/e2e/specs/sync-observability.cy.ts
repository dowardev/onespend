/// <reference types="cypress" />

describe('Sync Observability Features', () => {
  beforeEach(() => {
    cy.login()
    cy.visit('/sync')
  })

  it('should expose metrics endpoint with correct format', () => {
    cy.request('/api/metrics').its('headers').its('content-type').should('contain', 'text/plain; version=0.0.4')
    cy.request('/api/metrics').then((response) => {
      expect(response.body).to.contain('# HELP')
      expect(response.body).to.contain('# TYPE')
    })
  })

  it('should expose sync health endpoint with JSON', () => {
    cy.request('/api/sync/health').then((response) => {
      expect(response.body).to.have.property('database_connection')
      expect(response.body).to.have.property('last_successful_sync')
    })
  })
})
