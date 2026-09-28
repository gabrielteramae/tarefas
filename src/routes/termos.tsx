import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { LegalScreen } from "@/components/legal-screen";

export const Route = createFileRoute("/termos")({ component: Termos });

const UPDATED = "26 de setembro de 2026";

function Block({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-8">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted">{children}</div>
    </section>
  );
}

function Termos() {
  return (
    <LegalScreen title="Termos e direitos">
      <p className="text-sm text-muted">Atualizado em {UPDATED}.</p>
      <nav className="mt-4 flex flex-wrap gap-2 text-sm">
        <a href="#uso" className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-fg">
          Termos de uso
        </a>
        <a href="#privacidade" className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-fg">
          Privacidade
        </a>
        <a href="#direitos" className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-fg">
          Direitos
        </a>
      </nav>

      <div className="mt-8 flex flex-col gap-8">
        <Block id="uso" title="Termos de uso">
          <p>
            O presente aplicativo consiste em uma lista pessoal de tarefas. A criação de conta ou o início de sessão
            implica a aceitação destes termos, da política de privacidade e das disposições de direitos autorais.
          </p>
          <p>
            A conta é individual. A autenticação ocorre por correio eletrônico e senha ou por provedor Google. O
            titular responde pela guarda das credenciais e pelo conteúdo inserido na lista.
          </p>
          <p>
            O texto das tarefas permanece de titularidade do usuário. O aplicativo o armazena exclusivamente para
            exibir a lista na conta correspondente.
          </p>
          <p>
            É vedado o uso para conteúdo ilícito, acesso não autorizado a conta de terceiro ou prejuízo a outra pessoa.
            Os registros de cada conta são isolados.
          </p>
          <p>
            O uso pode ser interrompido a qualquer momento, mediante encerramento da sessão. O titular dos direitos do
            aplicativo pode suspender ou encerrar o acesso em caso de uso ilícito, abuso ou descumprimento destes
            termos. O encerramento da sessão ou do acesso não elimina, por si, os dados já gravados: a lista permanece
            até exclusão na tela Privacidade ou até a remoção dos registros.
          </p>
          <p>
            O aplicativo é fornecido no estado em que se encontra. Na extensão permitida pela legislação brasileira,
            Gabriel Teramae Chan não responde por dano indireto, perda de tarefas, falha de conexão ou indisponibilidade.
            Nenhuma cláusula afasta direito irrenunciável do Código de Defesa do Consumidor.
          </p>
          <p>Aplica-se a legislação brasileira.</p>
        </Block>

        <Block id="privacidade" title="Política de privacidade">
          <p>
            O controlador dos dados pessoais é Gabriel Teramae Chan. Esta política rege o tratamento da conta e da lista
            deste aplicativo, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
          </p>
          <p>
            Na hipótese de distribuição pela Apple App Store, o tratamento também observa a diretriz 5.1 (Privacy) das
            App Store Review Guidelines. Em especial: a política deve identificar quais dados são coletados, por qual
            meio e para qual finalidade, e permanecer acessível no próprio aplicativo (item 5.1.1, i); o uso e o
            compartilhamento limitam-se ao que esta política declara (item 5.1.2); não há rastreamento entre aplicativos
            ou sites de terceiros, de modo que não se aplica o quadro App Tracking Transparency; e, havendo criação de
            conta, a diretriz 5.1.1 (v) exige meio de exclusão da conta, descrito abaixo.
          </p>
          <p>
            Categorias tratadas, no vocabulário dos rótulos de privacidade da App Store (Privacy Nutrition Labels),
            todas vinculadas à identidade da conta e nenhuma utilizada para rastreamento:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Informação de contato: correio eletrônico e nome informados pelo titular.</li>
            <li>Credencial: senha armazenada apenas como hash, jamais em texto claro.</li>
            <li>Conteúdo do usuário: tarefas, intervalo de datas, ordem e estado de conclusão.</li>
            <li>Identificadores de sessão: cookie necessário e, neste aparelho, cópia local da sessão.</li>
            <li>Preferências: tema claro ou escuro, somente se o titular autorizar a categoria correspondente.</li>
            <li>Identificador devolvido pelo Google, quando a autenticação ocorrer por esse provedor, com o respectivo e-mail.</li>
          </ul>
          <p>
            O tráfego em rede móvel restringe-se às operações iniciadas pelo titular: autenticação, leitura e gravação
            da lista, persistência do tema quando autorizada e, apenas se as notificações estiverem habilitadas, envio
            de aviso. O encerramento do aplicativo interrompe novas transmissões. Não há transmissão contínua em
            segundo plano, venda de dados nem uso publicitário da lista.
          </p>
          <p>
            As finalidades são autenticação, exibição exclusiva da lista do titular e manutenção das preferências. Na
            autenticação Google, a senha desse provedor não é recebida nem armazenada; o Google confirma a identidade e
            devolve apenas os dados necessários à abertura da conta. A marca Google indica esse método e permanece de
            titularidade da Google.
          </p>
          <p>
            A sessão é mantida por cookie estritamente necessário, com validade de sete dias. Preferências, análise,
            marketing e recursos de terceiros são categorias independentes. Análise e marketing não são utilizados.
            Recurso de terceiro, quando permitido, limita-se ao carregamento da fonte tipográfica.
          </p>
          <p>
            Os dados permanecem pelo tempo necessário às finalidades informadas, em regra enquanto a conta existir.
            Bases legais, nos termos do art. 7º da LGPD: execução de contrato para conta, lista e sessão necessária
            (inciso V); consentimento para preferências, avisos e recurso de terceiro (inciso I). O tratamento observa
            os princípios do art. 6º, em especial finalidade, necessidade, transparência e segurança.
          </p>
          <p>
            Direitos do titular, art. 18 da LGPD: confirmação e acesso, correção, anonimização, bloqueio ou eliminação
            de dado desnecessário ou tratado em desconformidade, portabilidade, informação sobre compartilhamento e
            revogação do consentimento. O prazo de resposta segue o art. 19. A autoridade nacional é a ANPD. O
            aplicativo não se destina a criança, art. 14.
          </p>
          <p>Exclusão, de forma iniciada no próprio aplicativo, em atendimento à diretriz 5.1.1 (v) da App Store:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Exportação: a tela Privacidade gera arquivo JSON das tarefas, para portabilidade.</li>
            <li>Exclusão da lista: remove somente as tarefas. Permanecem conta, e-mail, nome e credencial.</li>
            <li>
              Exclusão da conta e dos dados: remove, de forma irreversível, usuário, credencial, sessões, tarefas,
              preferências, sequência, inscrições de aviso e verificações associadas ao e-mail. Em seguida a sessão
              local é encerrada.
            </li>
            <li>Revogação de consentimento: as categorias opcionais podem ser desligadas na mesma tela, sem apagar a conta.</li>
          </ul>
          <p>
            Se a infraestrutura de hospedagem estiver fora do Brasil, a transferência internacional limita-se à
            prestação do serviço e observa o art. 33 da LGPD. Não há venda de dados nem compartilhamento para
            publicidade. Registro de conexão não é conservado além da sessão. Medidas do art. 46 incluem senha em hash,
            cookie de sessão inacessível a script e consultas restritas ao identificador autenticado.
          </p>
        </Block>

        <Block id="direitos" title="Direitos autorais">
          <p>
            O aplicativo, os textos de interface e o ícone são de titularidade de Gabriel Teramae Chan. © 2026. Todos os
            direitos reservados. É vedada a cópia, a revenda ou a publicação, total ou parcial, sem autorização.
          </p>
          <p>
            O conteúdo redigido nas tarefas permanece do usuário. O envio de uma tarefa não transfere a titularidade
            desse texto ao autor do aplicativo.
          </p>
          <p>
            Bibliotecas de código aberto conservam a licença de seus respectivos autores. O nome e o logotipo Google
            pertencem à Google e não integram esta marca.
          </p>
        </Block>
      </div>

      <p className="mt-8 text-sm text-muted">
        A tela{" "}
        <Link to="/privacidade" className="font-medium text-accent hover:underline">
          Privacidade
        </Link>
        , com sessão ativa, permite exportar ou excluir a lista.
      </p>
    </LegalScreen>
  );
}
