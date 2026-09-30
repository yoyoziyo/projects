import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import { doc, getDoc, getFirestore } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { firebaseConfig } from '../sorteio/assets/js/firebase-config.js';

const match = location.pathname.match(/^\/encurtador\/([A-Za-z0-9]{3})\/?$/);
if (match) {
  const firebase = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const db = getFirestore(firebase);
  try {
    const snapshot = await getDoc(doc(db, 'shortLinks', match[1]));
    if (snapshot.exists()) {
      const destination = new URL(snapshot.data().url);
      if (['http:', 'https:'].includes(destination.protocol)) location.replace(destination.href);
    }
  } catch {
    // O endereço inexistente ou expirado mantém a página 404 genérica.
  }
}
