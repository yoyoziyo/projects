import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';
import { doc, getDoc, getFirestore, runTransaction, serverTimestamp, Timestamp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { firebaseConfig } from '../sorteio/assets/js/firebase-config.js';

const firebase = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(firebase);
const db = getFirestore(firebase);
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const form = document.querySelector('#form');
const field = document.querySelector('#url');
const button = document.querySelector('#submit');
const status = document.querySelector('#status');
const result = document.querySelector('#result');
const shortLink = document.querySelector('#short-link');
const expiry = document.querySelector('#expiry');
const copy = document.querySelector('#copy');

function randomCode() {
  const letters = [];
  while (letters.length < 3) {
    const bytes = crypto.getRandomValues(new Uint8Array(3));
    for (const byte of bytes) {
      if (byte < 248 && letters.length < 3) letters.push(alphabet[byte % 62]);
    }
  }
  return letters.join('');
}

async function createLink(url) {
  const user = auth.currentUser || (await signInAnonymously(auth)).user;
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = randomCode();
    const reference = doc(db, 'shortLinks', code);
    const created = await runTransaction(db, async transaction => {
      if ((await transaction.get(reference)).exists()) return false;
      transaction.set(reference, {
        url,
        uid: user.uid,
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromMillis(Date.now() + 600_000)
      });
      return true;
    });
    if (!created) continue;
    const saved = await getDoc(reference);
    return { code, expiresAt: saved.data().createdAt.toMillis() + 600_000 };
  }
  throw new Error('Não foi possível reservar um código. Tente novamente.');
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  status.textContent = '';
  result.hidden = true;
  let destination;
  try {
    destination = new URL(field.value.trim());
    if (!['http:', 'https:'].includes(destination.protocol)) throw new Error();
  } catch {
    status.textContent = 'Digite um link HTTP ou HTTPS válido.';
    return;
  }
  button.disabled = true;
  button.textContent = 'Criando…';
  try {
    const created = await createLink(destination.href);
    const address = new URL('/encurtador/' + created.code, location.origin).href;
    shortLink.href = address;
    shortLink.textContent = address;
    expiry.textContent = 'Disponível até ' + new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(created.expiresAt) + '.';
    result.hidden = false;
  } catch {
    status.textContent = 'O serviço ainda não está disponível. Tente novamente mais tarde.';
  } finally {
    button.disabled = false;
    button.textContent = 'Encurtar link';
  }
});

copy.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(shortLink.href);
    copy.textContent = 'Copiado';
    setTimeout(() => copy.textContent = 'Copiar link', 1800);
  } catch {
    status.textContent = 'Não foi possível copiar. Selecione o link acima.';
  }
});
