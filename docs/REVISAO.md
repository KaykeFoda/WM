# Revisão de bugs

## Correções

- Reserva gravada com resposta perdida: a interface agora conserva a mesma solicitação e oferece **Verificar minha reserva**. É possível recuperar o comprovante após fechar e reabrir a janela ou recarregar a página. A sessão armazena apenas os dados da solicitação; disponibilidade e bloqueio continuam exclusivamente no PostgreSQL.
- Respostas inválidas da agenda: datas, intervalos, preços e identificação da confirmação são validados antes de renderizar. Um retorno inválido produz uma mensagem recuperável, em vez de derrubar a página ou mostrar uma confirmação incorreta.
- Consultas substituídas/abortadas: uma resposta antiga não pode sobrescrever a consulta atual; erros de consulta e de reserva são tratados separadamente.
- Rolagem em janelas: Lenis para ao abrir agendamento ou galeria e elimina a inércia que antes continuava movendo a página por trás da janela.
- Acessibilidade: Escape fecha o menu mobile e devolve foco, a confirmação da reserva recebe foco, os nomes acessíveis da marca incluem o conteúdo visível, e textos secundários receberam contraste adequado. O dourado principal continua #D3AF37.
- Fontes: arquivos locais substituem a dependência do Google Fonts, mantendo as famílias previstas e as licenças OFL.
- Configuração: URL/chave pública toleram espaços ao copiar. Vite interrompe a compilação se uma chave privada for colocada em `VITE_SUPABASE_ANON_KEY`, antes de incluí-la no bundle.

## Validação

- `npm run test:unit`: datas/fuso, configuração pública e recuperação de solicitações.
- `npm run test:db`: PostgreSQL 17 isolado, concorrência, sobreposição, duração, dias fechados, repetição da mesma solicitação e permissões.
- `npm run test:booking`: navegador usando as funções reais do banco isolado por transporte HTTP local; inclui resposta perdida após gravação, recarregamento, conflito entre clientes, dados inválidos e falha de rede.
- `npm run test:ui`: 11 larguras de 320 a 1920 px, imagens, fontes, títulos, menu/galeria por teclado, âncoras, tabela, bloqueio da inércia atrás de diálogos, movimento reduzido e axe-core WCAG A/AA na página, no agendamento e na galeria.
- `npm run build` e `npm audit`.

Os testes não criam reservas no Supabase hospedado. A consulta em produção foi confirmada pelo usuário; o deploy desta revisão ainda deve ser acompanhado na Vercel. Testes automatizados de acessibilidade não substituem avaliação com leitores de tela e dispositivos reais. O conteúdo externo do Google Maps não é auditado pelo teste local.
