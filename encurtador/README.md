# Encurtador YOITES

Interface estática em `yoites.com/encurtador/` com armazenamento no Cloud Firestore do projeto Firebase `sorteio-2eea0`, já usado por este repositório. Os códigos têm três caracteres alfanuméricos e distinguem maiúsculas de minúsculas. Os links não expiram e podem ser abertos repetidas vezes.

## Ativação

1. Confirme no Firebase Console que o projeto `sorteio-2eea0` tem Cloud Firestore e o método de autenticação **Anônimo** ativados.
2. Publique as regras atualizadas de `sorteio/firestore.rules`. No diretório `sorteio`, com o Firebase CLI autenticado, execute `firebase deploy --only firestore:rules --project sorteio-2eea0`. Confira as regras atuais no Console antes de publicar se outras alterações tiverem sido feitas fora deste repositório.
3. Publique os arquivos do repositório no GitHub Pages, incluindo `404.html` na raiz.

O GitHub Pages serve a página do encurtador. A página `404.html` mostra “Aguarde” durante a consulta ao Firestore e abre o destino se o código existir. Os registros ficam no banco até serem apagados manualmente.

Os documentos antigos com `expiresAt` também permanecem acessíveis após a publicação da regra atualizada, desde que não tenham sido apagados manualmente.
