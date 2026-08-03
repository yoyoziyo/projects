# YOITES Catalog

Plataforma estática e reutilizável para catálogos de pequenos comércios. O conteúdo comercial, a identidade visual, os meios de contato, entrega, pagamento, categorias e produtos são controlados por JSON.

## Personalização

- `data/config.json`: empresa, tema, textos, imagens, contato, entrega e pagamentos.
- `data/products.json`: categorias, produtos, preços, destaques, kits e disponibilidade.

Não é necessário alterar HTML ou JavaScript para lançar uma nova marca.

## Execução local

Como o navegador bloqueia `fetch()` em arquivos abertos diretamente, sirva a pasta com qualquer servidor HTTP estático. Exemplo: `npx serve .`.

## Publicação

Compatível com GitHub Pages, Netlify, Cloudflare Pages, Vercel e qualquer hospedagem de arquivos estáticos. Antes de publicar, substitua o telefone e WhatsApp de exemplo em `config.json`.

## Arquitetura

- HTML5 semântico, sem cards fixos.
- CSS mobile first, Grid, Flexbox, variables, scroll snap e preferência de movimento reduzido.
- JavaScript ES6 modular.
- Carrinho persistido em `localStorage`.
- Checkout sem backend com mensagem estruturada para `wa.me`.
- Sem frameworks, banco de dados ou etapa de build.
