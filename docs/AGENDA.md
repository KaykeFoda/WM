# Ativar a agenda compartilhada

A agenda está implementada e foi testada com PostgreSQL 17 local, inclusive duas reservas concorrentes. Projeto informado pelo usuário: `https://rchyxxcxpgjjybcebktp.supabase.co`. O usuário confirmou a aplicação do SQL, a configuração na Vercel e a consulta de horários funcionando. As verificações automatizadas deste workspace usam PostgreSQL isolado e não alteram o banco hospedado. Sem configuração, o site oferece apenas consulta pelo WhatsApp e não anuncia reservas confirmadas.

## 1. Criar o Supabase

1. Entre em https://supabase.com/dashboard e crie um projeto na sua conta.
2. Escolha nome e região do projeto. A senha do banco fica com você; não a envie no chat e não a coloque no frontend.
3. Espere o projeto ficar disponível.
4. Abra **SQL Editor**, crie uma consulta e execute uma única vez todo o arquivo [001_shared_booking.sql](../supabase/migrations/001_shared_booking.sql).
5. Em **Project Settings → API / API Keys**, encontre a URL do projeto e a chave **publishable** ou a chave pública legada **anon**. Não use `service_role`, `sb_secret_` ou a senha do banco.

## 2. Conectar na Vercel

No projeto que publica `wm-barber.vercel.app`, abra **Settings → Environment Variables** e adicione:

| Nome | Valor |
| --- | --- |
| `VITE_SUPABASE_URL` | URL HTTPS do seu projeto, como `https://<referencia>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Chave pública publishable ou anon desse mesmo projeto |

Configure o ambiente **Production** e os demais que você realmente usa. Faça um **Redeploy**: o Vite incorpora as variáveis na compilação. A chave pública foi feita para uso no navegador; a proteção é feita pelas permissões do banco, pelas funções validadas e pela restrição que impede sobreposição.

Para desenvolver na nuvem, use as mesmas duas variáveis nas configurações do ambiente ou copie `.env.example` para `.env.local` e preencha somente a URL e chave pública. `.env.local` é ignorado pelo Git. Reinicie o Vite após alterar. O domínio específico `<referencia>.supabase.co` precisará ser adicionado à lista de rede do ambiente cloud, preservando os demais domínios. A URL pública do projeto pode ser informada no chat; senhas e chaves privadas não.

## 3. Conferir a ativação

1. Abra o site publicado, escolha um barbeiro e serviço e selecione uma data entre terça e sábado.
2. Verifique que aparecem horários reais e o botão **Reservar horário**.
3. Reserve um horário. A confirmação deve mostrar o período e o WhatsApp com o comprovante.
4. Em outro navegador ou celular, escolha o mesmo barbeiro: o período deve aparecer indisponível. Com serviço de duas horas, as sobreposições também ficam bloqueadas.
5. O outro barbeiro continua disponível se não tiver reserva própria.
6. Cancele a reserva de teste pelo SQL Editor, conforme abaixo.

## Regras implementadas

- Terça a sábado, das 10h às 21h, no fuso `America/Sao_Paulo`.
- Inícios a cada 30 minutos, com até 60 dias de antecedência. Esses dois valores são padrões técnicos adotados para a agenda.
- Duração padrão de 60 minutos. Progressiva e Aliza/alisamento: 120 minutos.
- Um serviço precisa terminar até 21h: último início às 20h para 1h e às 19h para 2h.
- Bloqueio imediato por barbeiro ao clicar em **Reservar horário** e receber sucesso do banco. Abrir o WhatsApp não é necessário para bloquear.
- A agenda atualiza ao trocar serviço/dia, ao voltar à janela e a cada 30 segundos. O banco verifica o conflito novamente na gravação.
- Reservas contíguas são permitidas; reservas sobrepostas do mesmo barbeiro são proibidas por uma restrição de exclusão PostgreSQL, inclusive em requisições concorrentes.
- Uma repetição da mesma solicitação retorna a reserva existente, sem duplicá-la. Se a resposta se perder, use **Verificar minha reserva**. A identificação da solicitação é preservada na sessão para recuperar o resultado mesmo após recarregar a página. Isso não substitui o bloqueio no banco.
- Sem banco configurado ou com erro de consulta, o site não inventa horários livres nem confirma uma reserva localmente.

## Consultar e cancelar reservas

Use somente o SQL Editor na conta do proprietário. Não há painel administrativo público e os clientes anônimos não podem consultar os registros completos, alterar reservas ou cancelar reservas de terceiros. A função de disponibilidade devolve somente horários e se estão livres.

Consulta da agenda:

```sql
select b.id, r.name as barbeiro, s.name as servico,
       b.starts_at at time zone 'America/Sao_Paulo' as inicio,
       b.ends_at at time zone 'America/Sao_Paulo' as fim,
       b.status
from public.wm_bookings b
join public.wm_barbers r on r.id=b.barber_id
join public.wm_services s on s.id=b.service_id
order by b.starts_at;
```

Para cancelar e liberar o horário, substitua o identificador pelo da reserva correta:

```sql
update public.wm_bookings
set status='cancelled'
where id='<UUID_DA_RESERVA>' and status='booked';
```

Os agendamentos combinados fora do site também precisam entrar nessa agenda para bloquear seus horários. Um proprietário pode registrá-los no SQL Editor com `wm_reserve`, informando um UUID novo, o ID do barbeiro, o ID do serviço e o início com fuso. A mensagem WhatsApp de uma reserva do site contém o identificador para facilitar alterações e cancelamentos.

## Testes locais reproduzíveis

Não execute testes destrutivos contra um projeto real. A suíte de banco recusa contêiner que não esteja sem rede e usa apenas `wm-booking-test`.

```sh
docker run --detach --name wm-booking-test --network none --memory 512m \
  -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17
docker exec wm-booking-test pg_isready -U postgres
docker exec wm-booking-test psql -U postgres -c 'CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;'
docker exec -i wm-booking-test psql -U postgres -v ON_ERROR_STOP=1 < supabase/migrations/001_shared_booking.sql
npm run test:unit
npm run test:db
```

O teste de navegador usa as funções reais desse PostgreSQL por um transporte HTTP local de teste. Não comprova conexão com Supabase hospedado. Execute o Vite normal na porta 5173 sem as variáveis de agenda e outra instância na 5174 com variáveis fictícias que o teste intercepta:

```sh
VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npm run dev -- --port 5173
# Em outro terminal:
VITE_SUPABASE_URL=https://wm-booking-test.supabase.co \
VITE_SUPABASE_ANON_KEY=sb_publishable_wm-test npm run dev -- --port 5174
# Em outro terminal, Chromium instalado:
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:booking
```

Ao terminar, pare somente os processos que iniciou e remova o contêiner de teste com `docker rm -f wm-booking-test`.

A compilação recusa chaves privadas em `VITE_SUPABASE_ANON_KEY`. As fontes ficam em arquivos locais; `npm run test:ui` verifica layout, teclado, bloqueio de rolagem e acessibilidade automatizada com o Vite da porta 5173.
