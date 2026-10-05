import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import { doc, getDoc, getFirestore } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { firebaseConfig } from '../sorteio/assets/js/firebase-config.js';

const match = location.pathname.match(/^\/encurtador\/([A-Za-z0-9]{3})\/?$/);
const title = document.querySelector('#page-title');
const message = document.querySelector('#page-message');
if (!match) {
  title.textContent = 'Página não encontrada.';
  message.textContent = 'O endereço que você tentou abrir não existe.';
}
if (match) {
  const firebase = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const db = getFirestore(firebase);
  try {
    const snapshot = await getDoc(doc(db, 'shortLinks', match[1]));
    if (snapshot.exists()) {
      const destination = new URL(snapshot.data().url);
      if (['http:', 'https:'].includes(destination.protocol)) location.replace(destination.href);
    } else {
      title.textContent = 'Link não encontrado.';
      message.textContent = 'Confira se o endereço foi digitado corretamente.';
    }
  } catch {
    title.textContent = 'Não foi possível abrir o link.';
    message.textContent = 'Aguarde um instante e tente novamente.';
  }
}
