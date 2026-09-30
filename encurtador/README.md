# Encurtador YOITES

Interface estática em `yoites.com/encurtador/` e um Cloudflare Worker pequeno para guardar os links. Os códigos têm três caracteres alfanuméricos e distinguem maiúsculas de minúsculas. Cada registro deixa de resolver em 10 minutos e é removido por alarme. Se a consulta chegar antes do alarme, ela também apaga o registro expirado.

## Ativação

1. Em uma conta Cloudflare, publique `worker.js` a partir desta pasta com `npx wrangler deploy`. O Worker usa o subdomínio padrão `*.workers.dev`; o DNS de `yoites.com` não precisa mudar.
2. Copie a URL pública do Worker para `encurtador/config.js`, sem barra final.
3. Publique os arquivos do repositório no GitHub Pages, incluindo o `404.html` da raiz.

O GitHub Pages serve a página do encurtador. Um código curto inexistente cai no `404.html`, que consulta o Worker e abre o destino apenas enquanto o registro estiver ativo. Um código expirado continua na página genérica de endereço indisponível, sem aviso específico. O Worker não recebe outros caminhos do site.

Enquanto `config.js` estiver vazio, a página abre, mas não cria links. Nenhuma credencial deve ser colocada nesse arquivo.
