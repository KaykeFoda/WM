# WM Barbearia
Landing page frontend-only em React e Vite.

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
Publique o diretório `dist` em hospedagem estática. Não há backend ou credenciais.

## Conteúdo
Serviços, valores, horários e contatos estão em `src/main.jsx`. Estilos e regras responsivas em `src/style.css`. A assinatura WM é tipográfica e provisória; a ilustração está em `public/barbearia.svg`. Fontes Google possuem fallback local. Canonical, sitemap e URL do Open Graph devem ser configurados quando o domínio definitivo for conhecido, sem inventar URLs.

Verifique os dois contatos WhatsApp antes da publicação. Os links abrem uma mensagem para agendamento; disponibilidade é combinada com o barbeiro. Horário: terça a sábado, 10h–21h; fechado segunda e domingo.
