# YOITES Catalog — demonstração oficial

Primeira versão comercial do catálogo estático e reutilizável da YOITES. A demonstração pública deve ser servida em `https://yoites.com/demo/confeitaria`.

## Personalização

- `data/config.json`: empresa, tema, textos, imagens, contato, entrega e pagamentos.
- `data/products.json`: categorias, produtos, preços, destaques, kits e disponibilidade.

Cada produto pode declarar `variants`, permitindo opções como 50, 100 ou 150 unidades, tamanhos, pesos e versões diferentes. Cada variante possui seu próprio preço e entra separadamente na sacola.

O modo de demonstração não utiliza fotografias: os produtos recebem composições abstratas em rosa e cinza para que cada comerciante imagine o próprio catálogo. Se um cliente desejar fotos, a arquitetura continua preparada para receber essa camada visual futuramente.

Não é necessário alterar HTML ou JavaScript para lançar uma nova marca.

## Modo demonstração

Com `demoMode: true`, todos os pedidos são direcionados ao número informado em `demoWhatsapp`. Para entregar a um cliente, desative o modo demonstração e configure `contact.whatsapp`.

O fechamento coleta nome, telefone, entrega ou retirada, endereço estruturado, agendamento opcional, pagamento e observações. Cada método de entrega possui um campo `fee` configurável; subtotal, frete, data agendada e total são incluídos automaticamente no resumo e na mensagem do WhatsApp.

## Execução local

Como o navegador bloqueia `fetch()` em arquivos abertos diretamente, sirva a pasta com qualquer servidor HTTP estático. Exemplo: `npx serve .`.

## Publicação

Publique o conteúdo desta pasta sob `/demo/confeitaria2/`. A unidade escolhida define o WhatsApp de destino conforme `data/config.json`.

## Arquitetura

- HTML5 semântico, sem cards fixos.
- CSS mobile first, Grid, Flexbox, variables, scroll snap e preferência de movimento reduzido.
- JavaScript ES6 modular.
- Carrinho persistido em `localStorage`.
- Checkout sem backend com mensagem estruturada para `wa.me`.
- Sem frameworks, banco de dados ou etapa de build.
