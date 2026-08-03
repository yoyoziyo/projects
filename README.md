# YOITES Catalog — demonstração oficial

Primeira versão comercial do catálogo estático e reutilizável da YOITES. A demonstração pública deve ser servida em `https://yoites.com/demo/confeitaria`.

## Personalização

- `data/config.json`: empresa, tema, textos, imagens, contato, entrega e pagamentos.
- `data/products.json`: categorias, produtos, preços, destaques, kits e disponibilidade.

Não é necessário alterar HTML ou JavaScript para lançar uma nova marca.

## Modo demonstração

Com `demoMode: true`, todos os pedidos são direcionados ao número informado em `demoWhatsapp`. Para entregar a um cliente, desative o modo demonstração e configure `contact.whatsapp`.

## Execução local

Como o navegador bloqueia `fetch()` em arquivos abertos diretamente, sirva a pasta com qualquer servidor HTTP estático. Exemplo: `npx serve .`.

## Publicação

Publique o conteúdo desta pasta sob `/demo/confeitaria/`. Compatível com qualquer hospedagem de arquivos estáticos.

## Arquitetura

- HTML5 semântico, sem cards fixos.
- CSS mobile first, Grid, Flexbox, variables, scroll snap e preferência de movimento reduzido.
- JavaScript ES6 modular.
- Carrinho persistido em `localStorage`.
- Checkout sem backend com mensagem estruturada para `wa.me`.
- Sem frameworks, banco de dados ou etapa de build.
