import "cypress-localstorage-commands";

context("Login Test", () => {
  const username = Cypress.env("username");
  const password = Cypress.env("password"); // run with that command:  npx cypress run --env password=PASSWORD For account

  before(() => {
    cy.visit("/");
    cy.get("[data-cy=userField]").clear();
    cy.get("[data-cy=pwField]").clear();
    cy.get("[data-cy=userField]").type("", {force: true});
    cy.get("[data-cy=pwField]").type("", {force: true});
    cy.get("[data-cy=submitbutton]").click({force: true});
    cy.wait(2000);
    cy.visit("/settings");
    cy.get("[data-cy=displaynameCy]").type("HalloWelt123", {force: true});
    cy.get("[data-cy=numberCy]").type("+00000000000", {force: true});
    cy.get("[data-cy=submitCy]").click({force: true});
    cy.wait(1000);
    cy.saveLocalStorage();
  })
  
  beforeEach(() => {
    cy.restoreLocalStorage();
    cy.visit("/settings");
    cy.wait(2000);
  })
  
  it("Save only updates", () => {
    cy.get("[data-cy=emailCy]").type("3.4@5.cd", {force : true});
    cy.get("[data-cy=numberCy]").type("+1234567890", {force : true});
    cy.get("[data-cy=submitCy]").click({force: true});
    cy.wait(1000);
    cy.get('[data-cy=emailCy]').should('have.attr', 'placeholder', '3.4@5.cd');
    cy.get('[data-cy=numberCy]').should('have.attr', 'placeholder', '+1234567890');

    cy.get("[data-cy=numberCy]").type("+00000000000", {force : true});
    cy.get("[data-cy=submitCy]").click({force: true});
    cy.wait(1000);
    cy.get('[data-cy=emailCy]').should('have.attr', 'placeholder', '3.4@5.cd');
    cy.get('[data-cy=numberCy]').should('have.attr', 'placeholder', '+00000000000');
  });

  it("are placeholders", () => {
    cy.get("[data-cy=emailCy]").type("3.4@5.cd", {force : true});
    cy.get("[data-cy=numberCy]").type("+1234567890", {force : true});
    cy.get("[data-cy=submitCy]").click({force: true});
    cy.reload();
    cy.get('[data-cy=emailCy]').should('have.attr', 'placeholder', '3.4@5.cd');
    cy.get('[data-cy=numberCy]').should('have.attr', 'placeholder', '+1234567890');
  });

  it("regex telephone neg", () => {
    cy.get("[data-cy=numberCy]").type("+000.00|0000 00", {force : true});
    cy.get('[data-cy=submitCy]').should('be.disabled')
  });

  it("regex telephone pos", () => {
    cy.get("[data-cy=numberCy]").type("+00000000000", {force : true});
    cy.get('[data-cy=submitCy]').should('not.be.disabled')
  });

  it("regex email neg", () => {
    cy.get("[data-cy=emailCy]").type("23233sdsas,,frdfer", {force : true});
    cy.get('[data-cy=submitCy]').should('be.disabled')
  });

  it("regex email pos", () => {
    cy.get("[data-cy=emailCy]").type("dfsdf.dd@hjhfd.cd", {force : true});
    cy.get('[data-cy=submitCy]').should('not.be.disabled')
  });
});
