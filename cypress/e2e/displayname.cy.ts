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
    // cy.get("[data-cy=displaynameCy]").type("HalloWelt123", {force: true});
    // cy.get("[data-cy=numberCy]").type("+00000000000", {force: true});
    // cy.get("[data-cy=submitCy]").click({force: true});
    // cy.wait(1000);
    cy.saveLocalStorage();
  })
  
  beforeEach(() => {
    cy.restoreLocalStorage();
    cy.visit("/settings");
    cy.wait(2000);
  })

  it("Has input field", () => {
    cy.get("[data-cy=displaynameCy]").type("123", {force: true});
    cy.get("[data-cy=submitCy]").click({force: true});
    cy.wait(1000);
    cy.get('[data-cy=displaynameCy]').should('have.attr', 'placeholder', '123');
  });

  it("No change on no input", () => {
    cy.get("[data-cy=displaynameCy]").type("Dev", {force: true});
    cy.get("[data-cy=submitCy]").click({force: true});
    cy.wait(1000);
    cy.get('[data-cy=displaynameCy]').should('have.attr', 'placeholder', 'Dev');
    cy.get("[data-cy=numberCy]").type("+1234567890", {force: true});
    cy.get("[data-cy=displaynameCy]").clear({force: true});
    cy.get("[data-cy=submitCy]").click({force: true});
    cy.wait(1000);
    cy.get('[data-cy=displaynameCy]').should('have.attr', 'placeholder', 'Dev');
  });

  it("Save button disabled wrong input", () => {
    cy.get("[data-cy=displaynameCy]").type("12312sdasdasdAA.,+", {force: true});
    cy.wait(1000);
    cy.get('[data-cy=submitCy]').should('be.disabled')
  });
});
