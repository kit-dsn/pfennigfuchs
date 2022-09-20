import "cypress-localstorage-commands";

context("Room Tests", () => {
  const username = Cypress.env("username");
  const password = Cypress.env("password"); // run with that command:  npx cypress run --env password=PASSWORD For account

  before(() => {
    cy.visit("/");
    cy.get("[data-cy=userField]").clear();
    cy.get("[data-cy=pwField]").clear();
    cy.get("[data-cy=userField]").type("@", {force: true});
    cy.get("[data-cy=pwField]").type("", {force: true});
    cy.get("[data-cy=submitbutton]").click({force: true});
    cy.wait(5000);
    cy.get("[data-cy=newRoomBtn]").click({force: true});
    cy.get("[data-cy=roomName]").type("E2E", {force: true});
    cy.get("[data-cy=createRoom]").click({force: true});
    cy.wait(10000);
    cy.get("[data-cy=E2E]").click({force: true});
    cy.saveLocalStorage();
  });

  after(() => {
    cy.visit("/");
    cy.wait(2000);
    cy.get("[data-cy=E2E]").click({force: true});
    cy.wait(2000);
    cy.get("[data-cy=Leave]").click({force: true});
    cy.wait(2000);
    cy.get("[data-cy=LeaveConf]").click({force: true});
    cy.wait(3000);
    cy.location().should((loc) => {
        expect(loc.pathname).to.eq("/")
    });
    cy.get("[data-cy=E2E]").should("not.exist");
  });
  
  beforeEach(() => {
    cy.restoreLocalStorage();
    cy.wait(2000);
  });

  afterEach(() => {
    cy.get("[data-cy=entriesTab]").click({force: true});
    cy.wait(2000);
  });

  it("Update room description", () => {
    cy.get("[data-cy=settingsTab]").click({force: true})
    cy.wait(2000);
    cy.get("[data-cy=roomDesc]").type("Blub", {force: true});
    cy.wait(2000);
    cy.get("[data-cy=submitCy]").click({force: true});
    cy.wait(2000);
    cy.get("[data-cy=roomNavDesc]").should(($div) => {
        expect($div).to.contain("Blub");
    });

  });

  it("Avatar input fields are visible", () => {
    cy.get("[data-cy=settingsTab]").click({force: true})
    cy.wait(2000);
    cy.get("[data-cy=selectAvatar]").should("be.visible");
    cy.get("[data-cy=clearAvatar]").should("be.visible");
  });

  it("Expense creation, order and infos", () => {
    cy.get("[data-cy=expenseBtn]").click({force: true});
    cy.wait(2000);
    cy.get("[data-cy=expenseDesc]").type("First", {force: true});
    cy.get("[data-cy=expenseAmount]").type("200", {force: true});
    cy.get("[data-cy=submitExpense]").click({force: true});
    cy.wait(2000);
    cy.get("[data-cy=expenseBtn]").click({force: true});
    cy.wait(2000);
    cy.get("[data-cy=expenseDesc]").type("Second", {force: true});
    cy.get("[data-cy=expenseAmount]").type("500", {force: true});
    cy.get("[data-cy=submitExpense]").click({force: true});
    cy.wait(2000);
    cy.get("[data-cy=expense]").first().get("[data-cy=expense-subject]").should(subj => {
        expect(subj).to.contain("Second");
    });
    cy.get("[data-cy=expense]").first().get("[data-cy=expense-amount]").should(amnt => {
        expect(amnt).to.contain("500");
    });
    cy.get("[data-cy=expense]").next().get("[data-cy=expense-subject]").should(subj => {
        expect(subj).to.contain("First");
    });
    cy.get("[data-cy=expense]").next().get("[data-cy=expense-amount]").should(amnt => {
        expect(amnt).to.contain("200");
    });
    cy.get("[data-cy=expense]").first().click({force:true})
    cy.wait(1000);
    cy.get("[data-cy=expense]").first().get("[data-cy=expense-participants]").should(part => {
        expect(part).to.have.length(1);
    });
  });
});
