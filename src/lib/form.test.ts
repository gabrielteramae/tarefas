import assert from "node:assert/strict";
import test from "node:test";
import {
  confirmPasswordProblem,
  emailProblem,
  nameProblem,
  newPasswordProblem,
  signInPasswordProblem,
  taskProblem,
} from "./form.ts";

test("e-mail vazio ou torto não passa", () => {
  assert.equal(emailProblem("  "), "Informe o e-mail.");
  assert.equal(emailProblem("gabriel"), "Esse e-mail não parece válido.");
  assert.equal(emailProblem("a@b.com"), "");
});

test("senha de entrada e senha nova têm regras diferentes", () => {
  assert.equal(signInPasswordProblem(""), "Informe a senha.");
  assert.equal(signInPasswordProblem("curta"), "A senha precisa ter entre 8 e 128 caracteres.");
  assert.equal(signInPasswordProblem("12345678"), "");
  assert.match(newPasswordProblem("12345678"), /maiúscula/);
  assert.equal(newPasswordProblem("Senha123!"), "");
});

test("confirmação, nome e tarefa", () => {
  assert.equal(confirmPasswordProblem("Senha123!", ""), "Confirme a senha.");
  assert.equal(confirmPasswordProblem("Senha123!", "outra"), "As senhas não conferem.");
  assert.equal(confirmPasswordProblem("Senha123!", "Senha123!"), "");
  assert.equal(nameProblem("  <b></b> "), "Informe o nome.");
  assert.equal(nameProblem("Ana"), "");
  assert.equal(taskProblem("   "), "Escreva a tarefa.");
  assert.equal(taskProblem("Comprar pão"), "");
});
