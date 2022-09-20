context("Login Test", () => {
  const username = Cypress.env("username");
  const password = Cypress.env("password"); // run with that command:  npx cypress run --env password=PASSWORD For account
  beforeEach(() => {
    cy.visit("/");
    cy.get("[data-cy=userField]").clear();
    cy.get("[data-cy=pwField]").clear();
  });

  it("checks if an error is returned after sending an invalid username", () => {
    cy.get("[data-cy=userField]").type("");
    cy.get("[data-cy=pwField]").type("1234");
    cy.get("[data-cy=submitbutton]").click();
    cy.get("[data-cy=errormsg]").should("contain", "Error");
  });

  it("checks if an error is returned after sending an invalid pw", () => {
    cy.get("[data-cy=userField]").type("");
    cy.get("[data-cy=pwField]").type("1234");
    cy.get("[data-cy=submitbutton]").click();
    cy.get("[data-cy=errormsg]").should("contain", "403");
  });

  it("checks if an user can login after losing token", () => {
    cy.get("[data-cy=userField]").type(username);
    cy.get("[data-cy=pwField]").type(password, { log: false });
    cy.get("[data-cy=submitbutton]").click();
    cy.clearLocalStorage();
    cy.reload();
    cy.get("#loginContainer").should("exist");
  });
});
