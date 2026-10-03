export const TASK_TONES = ["estudo", "trabalho", "casa", "saude", "compra", "comida", "sair", "pessoal", "tarefa"] as const;

export type TaskTone = (typeof TASK_TONES)[number];

export const TONE_LABEL: Record<TaskTone, string> = {
  estudo: "Estudo",
  trabalho: "Trabalho",
  casa: "Casa",
  saude: "Saúde",
  compra: "Compra",
  comida: "Cozinha",
  sair: "Sair",
  pessoal: "Pessoal",
  tarefa: "",
};

/** Palavra inteira, já sem acento. Evita “feira” dentro de “sexta-feira” e “compr” dentro de “compromisso”. */
const EXACT: Record<string, TaskTone> = {
  estudar: "estudo",
  estudo: "estudo",
  estudos: "estudo",
  estudante: "estudo",
  estudando: "estudo",
  ler: "estudo",
  lendo: "estudo",
  leitura: "estudo",
  livro: "estudo",
  livros: "estudo",
  aula: "estudo",
  aulas: "estudo",
  prova: "estudo",
  provas: "estudo",
  faculdade: "estudo",
  escola: "estudo",
  licao: "estudo",
  licacoes: "estudo",
  revisar: "estudo",
  revisao: "estudo",
  trabalhar: "trabalho",
  trabalho: "trabalho",
  trabalhos: "trabalho",
  trabalhando: "trabalho",
  reuniao: "trabalho",
  reunioes: "trabalho",
  reunir: "trabalho",
  cliente: "trabalho",
  clientes: "trabalho",
  escritorio: "trabalho",
  email: "trabalho",
  projeto: "trabalho",
  projetos: "trabalho",
  casa: "casa",
  casas: "casa",
  limpar: "casa",
  limpeza: "casa",
  louca: "casa",
  loucas: "casa",
  roupa: "casa",
  roupas: "casa",
  lavar: "casa",
  lavanderia: "casa",
  arrumar: "casa",
  faxina: "casa",
  varrer: "casa",
  medico: "saude",
  medica: "saude",
  medicina: "saude",
  remedio: "saude",
  remedios: "saude",
  academia: "saude",
  treino: "saude",
  treinar: "saude",
  treinos: "saude",
  dentista: "saude",
  consulta: "saude",
  hospital: "saude",
  exame: "saude",
  saude: "saude",
  comprar: "compra",
  compra: "compra",
  compras: "compra",
  comprando: "compra",
  comprei: "compra",
  mercado: "compra",
  farmacia: "compra",
  shopping: "compra",
  feira: "compra",
  cozinhar: "comida",
  cozinha: "comida",
  cozinhando: "comida",
  comida: "comida",
  jantar: "comida",
  almoco: "comida",
  almocar: "comida",
  lanche: "comida",
  receita: "comida",
  cafe: "comida",
  padaria: "comida",
  sair: "sair",
  saida: "sair",
  passeio: "sair",
  passear: "sair",
  viagem: "sair",
  viajar: "sair",
  viajando: "sair",
  cinema: "sair",
  encontro: "sair",
  aniversario: "pessoal",
  familia: "pessoal",
  amigo: "pessoal",
  amigos: "pessoal",
  ligar: "pessoal",
};

const WEEKDAYS = new Set(["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"]);

function fold(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function tokens(text: string) {
  const words = fold(text).split(/[^a-z0-9]+/).filter(Boolean);
  const hasWeekday = words.some((word) => WEEKDAYS.has(word));
  if (!hasWeekday) return words;
  return words.filter((word) => word !== "feira" && !WEEKDAYS.has(word));
}

function fromWords(text: string): TaskTone | null {
  for (const word of tokens(text)) {
    const tone = EXACT[word];
    if (tone) return tone;
  }
  return null;
}

export function categoryFromText(text: string): TaskTone {
  return fromWords(text) ?? "tarefa";
}

export function taskTone(task: { text: string; priority?: string }) {
  return { tone: categoryFromText(task.text), urgent: task.priority === "urgente" };
}
