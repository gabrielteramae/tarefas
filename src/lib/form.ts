import { strongPassword, validEmail } from "./security.ts";
import { plainText } from "./text.ts";

const INVISIBLE = /[\u200B-\u200D\uFEFF]/g;

export function cleanEmail(raw: string) {
  return raw.trim().toLowerCase().replace(INVISIBLE, "");
}

export function emailProblem(raw: string) {
  const email = cleanEmail(raw);
  if (!email) return "Informe o e-mail.";
  if (!validEmail(email)) return "Esse e-mail não parece válido.";
  return "";
}

export function signInPasswordProblem(password: string) {
  if (!password) return "Informe a senha.";
  if (password.length < 8 || password.length > 128) return "A senha precisa ter entre 8 e 128 caracteres.";
  return "";
}

export function newPasswordProblem(password: string) {
  if (!password) return "Informe a senha.";
  if (password.length > 128) return "A senha passou de 128 caracteres.";
  if (!strongPassword(password)) return "Mínimo 8 caracteres, com maiúscula, minúscula, número e símbolo.";
  return "";
}

export function confirmPasswordProblem(password: string, confirm: string) {
  if (!confirm) return "Confirme a senha.";
  if (password !== confirm) return "As senhas não conferem.";
  return "";
}

export function nameProblem(raw: string) {
  const name = plainText(raw, 80);
  if (!name) return "Informe o nome.";
  if (name.length > 40) return "O nome pode ter no máximo 40 caracteres.";
  return "";
}

export function taskProblem(raw: string) {
  if (!plainText(raw, 80)) return "Escreva a tarefa.";
  return "";
}
