// Generated from: features/inicio.feature
import { test } from "playwright-bdd";

test.describe('Página de inicio', () => {

  test('La página muestra el nombre del proyecto', { tag: ['@plantilla', '@smoke'] }, async ({ Given, Then, page }) => { 
    await Given('que abro la página de inicio', null, { page }); 
    await Then('veo el nombre del proyecto como título', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('features/inicio.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":7,"tags":["@plantilla","@smoke"],"steps":[{"pwStepLine":7,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"Dado que abro la página de inicio","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":9,"keywordType":"Outcome","textWithKeyword":"Entonces veo el nombre del proyecto como título","stepMatchArguments":[]}]},
]; // bdd-data-end