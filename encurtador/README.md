# Encurtador YOITES

Interface estática em `yoites.com/encurtador/` com armazenamento no Cloud Firestore do projeto Firebase `sorteio-2eea0`, já usado por este repositório. Os códigos têm três caracteres alfanuméricos e distinguem maiúsculas de minúsculas. A regra do Firestore bloqueia a leitura 10 minutos após a criação; a política TTL remove o documento depois.

## Ativação

1. Confirme no Firebase Console que o projeto `sorteio-2eea0` tem Cloud Firestore e o método de autenticação **Anônimo** ativados.
2. Publique as regras atualizadas de `sorteio/firestore.rules`. No diretório `sorteio`, com o Firebase CLI autenticado, execute `firebase deploy --only firestore:rules --project sorteio-2eea0`. Confira as regras atuais no Console antes de publicar se outras alterações tiverem sido feitas fora deste repositório.
3. No Google Cloud Console, crie uma política TTL para o grupo de coleções `shortLinks` no campo `expiresAt`.
4. Publique os arquivos do repositório no GitHub Pages, incluindo `404.html` na raiz.

O GitHub Pages serve a página do encurtador. Um código curto inexistente cai no `404.html`, que consulta o Firestore e abre o destino apenas enquanto a regra permite. Um código expirado continua na página genérica de endereço indisponível, sem aviso específico.

O prazo de acesso é exato na regra de leitura, baseado no horário do servidor. O TTL do Firestore não apaga instantaneamente; a documentação do Firebase informa que a exclusão física costuma acontecer em até 24 horas. Assim, o link para de funcionar aos 10 minutos, enquanto a limpeza do registro ocorre depois.
