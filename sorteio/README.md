# Sorteio ao vivo

Página estática para GitHub Pages com inscrições, sorteio automático e resultado sincronizados pelo Firebase no plano gratuito. Não há painel ou login administrativo.

## 1. Criar e configurar o Firebase

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com/).
2. Ative somente **Authentication > Anônimo**.
3. Crie o banco **Cloud Firestore** em modo de produção, preferencialmente em `southamerica-east1`.
4. O app Web `sorteio-2eea0` já está configurado em `assets/js/firebase-config.js`.
5. No Firestore, crie `config/evento` com `closesAt` do tipo **Timestamp** em **07/08/2026 às 22:00 no horário de Brasília** e `active` do tipo **boolean** com valor `true`.

Exemplo de estrutura:

```text
config/evento
  closesAt: Timestamp
  title: "Sorteio especial"
  active: true
```

## 2. Publicar as regras

Na pasta `sorteio/`:

```bash
npm install -g firebase-tools
firebase login
firebase use --add sorteio-2eea0
firebase deploy --only firestore
```

## 3. Publicar o site

Ao enviar esta pasta para a branch publicada pelo GitHub Pages, a página ficará em:

```text
https://yoites.com/sorteio/
```

## Garantias e limites

- Cada instalação/navegador recebe um UID anônimo e só consegue criar uma inscrição.
- O primeiro uso de um nick o reserva. Maiúsculas, minúsculas e acentos são ignorados ao comparar duplicidade.
- As regras recusam novas inscrições após `closesAt`, mesmo que alguém altere o relógio ou o JavaScript local.
- IP não é usado: GitHub Pages não consegue obtê-lo com segurança, e armazená-lo criaria implicações de privacidade (LGPD).
- Limpar dados do navegador ou usar outro dispositivo cria uma nova identidade, mas o mesmo nick continuará reservado.
- Às 22h, os navegadores conectados tentam criar o resultado. Uma transação permite que somente o primeiro resultado seja gravado; todos recebem esse mesmo documento.
- Se ninguém estiver com o site aberto às 22h, o primeiro acesso posterior executará o sorteio.
- A seleção usa `crypto.getRandomValues`, não `Math.random`, e salva cinco vencedores sem repetição no documento global.
- Para desativar o site, altere `config/evento.active` para `false`.

## Preparar outro sorteio

1. Altere `config/evento.active` para `false`.
2. Apague os documentos das coleções `participantes`, `inscricoes` e `resultado` pelo Console do Firebase.
3. Atualize `config/evento.closesAt` para a nova data e horário.
4. Altere `config/evento.active` novamente para `true`.

Sem uma função protegida no servidor, as regras garantem um único resultado global e cinco participantes existentes, mas não conseguem provar matematicamente que um navegador modificado utilizou o algoritmo aleatório. Esse é o compromisso técnico necessário para funcionar sem administrador e sem plano Blaze.
