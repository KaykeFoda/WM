# WM Barbearia
Landing page em React e Vite, com agenda compartilhada opcional via Supabase.

## Desenvolvimento
Requer Node.js 22.12+ (validado com Node 24) e npm.

```sh
npm ci --cache /workspace/.npm-cache
npm run dev
```

## Produção
```sh
npm run build
npm run preview
```
Publique o diretório `dist` em hospedagem estática. O site estático não precisa de servidor próprio. Para ativar a agenda, configure o Supabase conforme docs/AGENDA.md.

## Conteúdo
Serviços, valores, horários e contatos estão em `src/main.jsx`. Estilos e regras responsivas em `src/style.css`. A logo da WM está em `public/logo-wm.png`; as fotos reais estão em `public/images/`. Fontes Google possuem fallback local. Canonical, sitemap e Open Graph estão configurados para o domínio fornecido: https://wm-barber.vercel.app/.

Verifique os dois contatos WhatsApp antes da publicação. Os links abrem uma mensagem para agendamento; disponibilidade é combinada com o barbeiro. Horário: terça a sábado, 10h–21h; fechado segunda e domingo.

## Animações
Animações adaptadas de `KaykeFoda/nex.ai` (commit `1900fb8`): `useMotion` fornece entradas por IntersectionObserver/Web Animations API; `useScrollEffects` usa Lenis apenas no desktop e parallax decorativo; `MagneticButton` mantém o alvo clicável estável. O poste tem listras em movimento contínuo. A navalha abre ao descer e fecha ao subir, com limites de 0–110°. Movimento reduzido desativa os efeitos. No mobile, o scroll é nativo. Nenhum backend do repositório de referência foi incorporado.

## Fotos reais
As seis fotos fornecidas pelo usuário estão em `public/images/`, mantidas na resolução original, sem detalhes gerados artificialmente. O hero usa uma versão tratada da foto escolhida, com carregamento prioritário em WebP; o original foi preservado. A área escura tem animação dourada discreta que respeita movimento reduzido. A galeria usa lazy loading, proporções uniformes no grid e exibição integral no modal, com Escape, setas e retorno de foco nativos.

## Agendamento
Agenda compartilhada preparada para Supabase, ainda pendente de projeto real e variáveis. Consulte [o guia de ativação](docs/AGENDA.md). A reserva escolhe barbeiro, serviço, dia e hora; o banco impede sobreposição de horários com uma restrição PostgreSQL. Duração padrão 1h; progressiva e alisamento 2h. Sem configuração, permanece disponível a consulta pelo WhatsApp, sem anunciar reserva confirmada.

## Domínio e compartilhamento
Domínio informado: https://wm-barber.vercel.app/. Metadados em `index.html` incluem canonical, descrição, Open Graph, Twitter e dados estruturados. A imagem social é `/og-wm-barbearia.png`; favicon e ícone Apple são locais. Mudanças só aparecem no domínio após deploy; WhatsApp e buscadores podem manter cache da prévia. Google Maps é incorporado por iframe e depende do acesso à rede do Google.
