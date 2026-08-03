# YOITES Catalog — demonstração oficial

Primeira versão comercial do catálogo estático e reutilizável da YOITES. A demonstração pública deve ser servida em `https://yoites.com/demo/confeitaria`.

## Personalização

- `data/config.json`: empresa, tema, textos, imagens, contato, entrega e pagamentos.
- `data/products.json`: categorias, produtos, preços, destaques, kits e disponibilidade.

Cada produto pode declarar `variants`, permitindo opções como 50, 100 ou 150 unidades, tamanhos, pesos e versões diferentes. Cada variante possui seu próprio preço e entra separadamente na sacola.

As imagens também são definidas no JSON. A demonstração inclui uma hero original em `assets/images/`; fotos de produtos podem ser substituídas por URL sem alterar o HTML ou JavaScript.

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
