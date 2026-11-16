# GRANALUME — preparação do site e PWA

Esta versão parte do ZIP `GRANALUME_filtros_periodos_v2` enviado nesta conversa.

## O que foi alterado
- Metadados do site em português do Brasil, título, descrição e cor da marca.
- Manifesto PWA com nome, cores, modo standalone e ícones de 192 px e 512 px.
- Service worker para cache do shell do aplicativo e dos arquivos estáticos do Vite, com fallback offline para a página inicial.
- Registro do service worker somente em build de produção; o fluxo de desenvolvimento local permanece sem service worker.
- Limpeza do CSS inicial do template Vite que limitava e centralizava o `#root`, para deixar o layout do GRANALUME controlar a largura.
- Ajustes de navegação inferior e áreas seguras em telas pequenas.

## O que foi preservado
- React + TypeScript + Vite.
- Estrutura das telas e navegação existente.
- Persistência atual em `localStorage`.
- Regras e cálculos financeiros existentes.
- Filtros mensal, anual e personalizado presentes na versão de origem.

## Validação
- JSON do manifesto validado.
- Sintaxe JavaScript do service worker validada.
- Dimensões dos dois ícones verificadas.
- `npm run build` não foi concluído neste ambiente porque a instalação de dependências foi interrompida por timeout; o TypeScript não encontrou os pacotes `vite/client` e `node`. Portanto, esta versão ainda precisa passar pelo build no StackBlitz/Replit antes de ser considerada validada.

## Observações
- Não foi feita publicação na internet.
- O modo instalável PWA depende de hospedagem em HTTPS (ou localhost para testes) e deve ser testado em navegador/dispositivo real.
- O armazenamento continua local no dispositivo/navegador. Esta versão não adiciona login, sincronização em nuvem ou backend.
