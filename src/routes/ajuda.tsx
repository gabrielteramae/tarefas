import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen, SettingGroup, SettingRow } from "@/components/auth-screen";

export const Route = createFileRoute("/ajuda")({ component: Ajuda });

const FAQS = [
  {
    title: "Como adiciono uma tarefa?",
    hint: "Escreva e toque no +.",
  },
  {
    title: "Como marco como feita?",
    hint: "Toque no quadrado. Toque de novo para desfazer.",
  },
  {
    title: "Como reordeno?",
    hint: "Toque as linhas à esquerda e arraste.",
  },
  {
    title: "Como marco o dia?",
    hint: "Toque o calendário da tarefa e escolha De e Até.",
  },
  {
    title: "Como acho uma tarefa?",
    hint: "Use a busca, embaixo do campo.",
  },
  {
    title: "Onde ficam as feitas?",
    hint: "Na aba Feitas, embaixo.",
  },
  {
    title: "Outra pessoa vê minha lista?",
    hint: "Não. Cada conta vê só a própria.",
  },
  {
    title: "Como saio?",
    hint: "Engrenagem → Sair.",
  },
];

function Ajuda() {
  return (
    <AuthScreen title="Ajuda">
      <SettingGroup>
        {FAQS.map((item) => (
          <SettingRow key={item.title} title={item.title} hint={item.hint} />
        ))}
      </SettingGroup>
      <p className="mt-8 text-center text-[11px] leading-relaxed text-subtle">
        © 2026 Gabriel Teramae Chan. Todos os direitos reservados.
      </p>
    </AuthScreen>
  );
}
