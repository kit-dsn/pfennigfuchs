describe('OneToOne_ContactList', () => {

  function doConditional(selector, callback) {
    cy.get('body').then($body => {
      if ($body.find(selector).length) {
        return selector;
      }
      return "nothing";
    })
      .then(selector => {
        if (selector != "nothing") {
          callback();
        }
      });
  }

  //tests sometimes fail because of rate limiting

  before(() => {
    //Log into first account
    cy.visit("/");
    cy.get("[data-cy=userField]").clear();
    cy.get("[data-cy=pwField]").clear();
    cy.get("[data-cy=pwField]").type("", { force: true });
    cy.get("[data-cy=userField]").type("", { force: true });
    cy.get("[data-cy=submitbutton]").click({ force: true });
    cy.wait(4000);

    //leave one-to-one room
    doConditional("[data-cy='']", () => {
      cy.get("[data-cy='roomCard-']").click({ force: true });
      cy.get("[data-cy=Leave]").click({ force: true });
      cy.wait(1500);
      cy.get("[data-cy=LeaveConf]").click({ force: true });
      cy.wait(2000);
    });

    //Logout
    cy.get("[data-cy=Logout]").eq(1).click({ force: true });

    //log into the other account
    cy.wait(2000);
    cy.visit("/");
    cy.get("[data-cy=userField]").clear();
    cy.get("[data-cy=pwField]").clear();
    cy.get("[data-cy=pwField]").type("", { force: true });
    cy.get("[data-cy=userField]").type("", { force: true });
    cy.get("[data-cy=submitbutton]").click({ force: true });
    cy.wait(4000);

    //leave other one-to-one room
    doConditional("[data-cy='roomCard-']", () => {
      cy.get("[data-cy='roomCard-']").click({ force: true });
      cy.get("[data-cy=Leave]").click({ force: true });
      cy.wait(1500);
      cy.get("[data-cy=LeaveConf]").click({ force: true });
      cy.wait(2000);
    });
    cy.get("[data-cy=Logout]").eq(1).click({ force: true });
  });

  beforeEach(() => {
    cy.visit("/");
    cy.wait(2000);
    cy.get("[data-cy=userField]").clear();
    cy.get("[data-cy=pwField]").clear();
    cy.get("[data-cy=pwField]").type("", { force: true });
  });

  it("Same Effect / Buttons working", () => {

    cy.get("[data-cy=userField]").type("", { force: true });
    cy.get("[data-cy=submitbutton]").click({ force: true });
    cy.wait(2000);

    cy.visit("/contacts");
    cy.wait(3000);
    //add contact to 1-1 room
    cy.get("[data-cy='createButton-@:matrix.org']").should('not.have.css', 'display', 'none');

    cy.get("[data-cy=addInput]").type("@:matrix.org", { force: true });
    cy.get("[data-cy=addButton]").click({ force: true });
    cy.wait(2000);

    cy.get("[data-cy='createButton-@:matrix.org']").should('have.css', 'display', 'none');
  });

  it("visit room / no settings / user-card displayed", () => {
    //in the previous test devlmaier created (and joined) the room
    cy.get("[data-cy=userField]").type("@:matrix.org", { force: true });
    cy.get("[data-cy=submitbutton]").click({ force: true });
    cy.wait(2000);
    cy.visit("/contacts");
    //give Sync some time
    cy.wait(5000);
    //visit room fails if room doesnt exist
    //also fails because join is sometimes rate-limited
    cy.get("[data-cy='visitButton-@:matrix.org']").click({ force: true });
    cy.wait(2000);
    //check if settings are accessible
    cy.get("[data-cy='settingsTab']").should('have.css', 'display', 'none');
    //fails if usercard is not displayed
    cy.get("[data-cy='card-@:matrix.org']").eq(1).click({ force: true });
  });

  //test only if joining is rate limited
  it("(already joined) visit room / no settings / user-card displayed", () => {
    //in the previous test  created (and joined) the room
    cy.get("[data-cy=userField]").type("@:matrix.org", { force: true });
    cy.get("[data-cy=submitbutton]").click({ force: true });
    cy.wait(2000);
    cy.visit("/contacts");
    //give Sync some time
    cy.wait(5000);
    //visit room fails if room doesnt exist
    //also fails because join is sometimes rate-limited
    cy.get("[data-cy='visitButton-@:matrix.org']").click({ force: true });
    cy.wait(2000);
    //check if settings are accessible
    cy.get("[data-cy='settingsTab']").should('have.css', 'display', 'none');
    //fails if usercard is not displayed
    cy.get("[data-cy='room-navbar'] > [data-cy='card-@:matrix.org']").click({ force: true });
  });
})