# Preferências do projeto

- Landing page React/Vite da WM Barbearia; preservar as decisões visuais aprovadas. O usuário autorizou agenda compartilhada com Supabase; não adicionar outras funcionalidades de backend sem necessidade.
- Atendimento terça a sábado, das 10h às 21h; fechado às segundas e aos domingos.
- Dourado principal aprovado pelo usuário: #D3AF37.
- Logo criada para o projeto: public/logo-wm.png, original preservado em public/logo-wm-original.png. Aplicar no site e metadados de compartilhamento.
- O usuário escolheu a última foto enviada (barbeiro de boné atendendo, com cliente em primeiro plano) para o hero. Original em public/images/wm-hero.jpg e versão tratada em public/images/wm-hero-enhanced.webp; as outras cinco fotos estão na galeria de cortes.
- Otimizar qualidade e proporções das fotos, preservando a aparência real dos cortes. Não inventar detalhes.
- Ao concluir uma etapa, verificar build e responsividade, salvar em commit e enviar ao repositório quando houver acesso. Relatar bloqueios com precisão.
- Cada tarefa cloud já é isolada; usar este checkout sem criar worktrees, salvo solicitação explícita.

- Agenda: bloqueio imediato por barbeiro, duração padrão 1h, progressiva e alisamento 2h. Consultar docs/AGENDA.md. Ainda é preciso conectar um projeto Supabase real para ativar. Não simular indisponibilidade com localStorage.
- Hero: foto tratada e animação discreta dourada no fundo escuro, respeitando movimento reduzido.
