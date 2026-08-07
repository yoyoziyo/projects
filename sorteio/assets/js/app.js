import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import {
  collection, doc, getDoc, getDocs, getFirestore, onSnapshot, orderBy, query,
  runTransaction, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
import { firebaseConfig, fallbackEvent } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const el = Object.fromEntries([
  "hours", "minutes", "seconds", "join-form", "nickname", "join-button", "form-message",
  "registered-state", "registered-nick", "participant-count", "participants", "draw-section",
  "draw-title", "draw-status", "roulette-track", "winners", "winner-list", "inactive-screen",
  "main-content", "page-footer"
].map(id => [id, document.getElementById(id)]));

let currentUser = null;
let participants = [];
let closesAt = new Date(fallbackEvent.closesAt);
let registrationClosed = Date.now() >= closesAt.getTime();
let activeDrawId = null;
let hasOfficialResult = false;
let eventActive = fallbackEvent.active;
let drawAttempted = false;
let countdownTimer;

const normalizeNick = value => value.trim().replace(/\s+/g, " ");
const nickKey = value => normalizeNick(value).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const validNick = value => /^[\p{L}\p{N}_. -]{2,24}$/u.test(value);

function setMessage(message = "", type = "") {
  el["form-message"].textContent = message;
  el["form-message"].className = `form-message ${type}`;
}

function setRegistrationClosed(closed) {
  registrationClosed = closed;
  el.nickname.disabled = closed || !eventActive || Boolean(el["registered-state"].dataset.active);
  el["join-button"].disabled = el.nickname.disabled || !currentUser;
  if (closed && !el["registered-state"].dataset.active) setMessage("As inscrições foram encerradas.");
}

function updateCountdown() {
  if (!eventActive) {
    el.hours.textContent = el.minutes.textContent = el.seconds.textContent = "00";
    setRegistrationClosed(true);
    return;
  }
  const distance = Math.max(0, closesAt.getTime() - Date.now());
  const totalSeconds = Math.floor(distance / 1000);
  el.hours.textContent = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  el.minutes.textContent = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  el.seconds.textContent = String(totalSeconds % 60).padStart(2, "0");
  setRegistrationClosed(distance === 0);
  if (distance === 0) attemptAutomaticDraw();
}

function startCountdown() {
  clearInterval(countdownTimer);
  updateCountdown();
  countdownTimer = setInterval(updateCountdown, 1000);
}

function showRegistered(nick) {
  el["registered-state"].hidden = false;
  el["registered-state"].dataset.active = "true";
  el["registered-nick"].textContent = nick;
  el["join-form"].hidden = true;
}

async function restoreRegistration() {
  if (!currentUser) return;
  const registration = await getDoc(doc(db, "inscricoes", currentUser.uid));
  if (!registration.exists()) return;
  const participant = await getDoc(doc(db, "participantes", registration.data().nickKey));
  if (participant.exists()) showRegistered(participant.data().nick);
}

el["join-form"].addEventListener("submit", async event => {
  event.preventDefault();
  const nick = normalizeNick(el.nickname.value);
  if (!currentUser) return setMessage("Conectando ao sorteio…");
  if (registrationClosed) return setMessage("As inscrições foram encerradas.", "error");
  if (!validNick(nick)) return setMessage("Use entre 2 e 24 caracteres: letras, números, espaço, ponto, hífen ou _.", "error");

  el["join-button"].disabled = true;
  setMessage("Confirmando sua participação…");
  try {
    await runTransaction(db, async transaction => {
      const key = nickKey(nick);
      const participantRef = doc(db, "participantes", key);
      const registrationRef = doc(db, "inscricoes", currentUser.uid);
      const participant = await transaction.get(participantRef);
      const registration = await transaction.get(registrationRef);
      if (registration.exists()) throw new Error("already-registered");
      if (participant.exists()) throw new Error("nick-taken");
      transaction.set(participantRef, { nick, nickKey: key, uid: currentUser.uid, createdAt: serverTimestamp() });
      transaction.set(registrationRef, { nickKey: key, createdAt: serverTimestamp() });
    });
    showRegistered(nick);
    setMessage("");
  } catch (error) {
    if (error.message === "already-registered") await restoreRegistration();
    else if (error.message === "nick-taken") setMessage("Este nick já está participando. Escolha outro nick.", "error");
    else setMessage("Não foi possível participar. Confira sua conexão e tente novamente.", "error");
  } finally {
    if (!registrationClosed && !el["registered-state"].dataset.active) el["join-button"].disabled = false;
  }
});

function renderParticipants() {
  el["participant-count"].textContent = participants.length;
  if (!participants.length) {
    el.participants.innerHTML = '<p class="empty-state">Aguardando os primeiros participantes…</p>';
    return;
  }
  const fragment = document.createDocumentFragment();
  participants.forEach(({ nick }) => {
    const item = document.createElement("span");
    item.className = "participant";
    item.textContent = nick;
    fragment.appendChild(item);
  });
  el.participants.replaceChildren(fragment);
}

function renderRoulettePreview() {
  if (hasOfficialResult || activeDrawId) return;
  el["roulette-track"].getAnimations().forEach(animation => animation.cancel());
  el["roulette-track"].style.transform = "translateX(0)";
  if (!participants.length) {
    const item = document.createElement("div");
    item.className = "roulette-item muted";
    item.textContent = "Aguardando participantes";
    el["roulette-track"].replaceChildren(item);
    return;
  }
  const items = participants.map(person => {
    const item = document.createElement("div");
    item.className = "roulette-item";
    item.textContent = person.nick;
    return item;
  });
  el["roulette-track"].replaceChildren(...items);
}

function randomIndex(max) {
  const limit = Math.floor(0x100000000 / max) * max;
  const value = new Uint32Array(1);
  do crypto.getRandomValues(value); while (value[0] >= limit);
  return value[0] % max;
}

function secureSample(items, amount) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, amount);
}

async function attemptAutomaticDraw() {
  if (!currentUser || drawAttempted || hasOfficialResult || !eventActive || Date.now() < closesAt.getTime()) return;
  drawAttempted = true;
  try {
    const participantSnapshot = await getDocs(collection(db, "participantes"));
    if (participantSnapshot.size < 5) {
      el["draw-title"].textContent = "Sorteio não realizado";
      el["draw-status"].textContent = "São necessários pelo menos 5 participantes.";
      return;
    }
    const eligible = participantSnapshot.docs.map(item => ({ id: item.id, nick: item.data().nick }));
    await runTransaction(db, async transaction => {
      const resultRef = doc(db, "resultado", "atual");
      const configRef = doc(db, "config", "evento");
      const result = await transaction.get(resultRef);
      const config = await transaction.get(configRef);
      if (result.exists()) return;
      if (!config.exists() || config.data().active !== true) throw new Error("inactive");
      if (Date.now() < config.data().closesAt.toMillis()) throw new Error("still-open");
      transaction.set(resultRef, {
        winners: secureSample(eligible, 5),
        participantCount: eligible.length,
        drawnAt: serverTimestamp(),
        drawnBy: currentUser.uid,
        version: 1
      });
    });
  } catch (error) {
    if (!["inactive", "still-open"].includes(error.message)) {
      drawAttempted = false;
      el["draw-status"].textContent = "Aguardando a confirmação do resultado…";
    }
  }
}

function setSiteActive(active) {
  eventActive = active;
  el["inactive-screen"].hidden = active;
  el["main-content"].hidden = !active;
  el["page-footer"].hidden = !active;
  if (active) startCountdown();
  else updateCountdown();
}

function showWinners(winners) {
  el["winner-list"].replaceChildren(...winners.map((winner, index) => {
    const li = document.createElement("li");
    li.textContent = winner.nick;
    li.style.animationDelay = `${index * 100}ms`;
    return li;
  }));
  el.winners.hidden = false;
  el["draw-title"].textContent = "Temos nossos vencedores!";
  el["draw-status"].textContent = "Este é o resultado oficial e único do sorteio.";
}

function animateRoulette(draw, drawnAt) {
  if (activeDrawId === draw.id) return;
  activeDrawId = draw.id;
  el.winners.hidden = true;
  el["draw-title"].textContent = "Sorteando ao vivo…";
  el["draw-status"].textContent = "A mesma animação está acontecendo para todos os participantes.";
  el["draw-section"].scrollIntoView({ behavior: "smooth", block: "center" });

  const pool = participants.length ? participants : draw.winners;
  const sequence = Array.from({ length: 45 }, (_, i) => pool[i % pool.length]);
  sequence.splice(-5, 5, ...draw.winners);
  const items = sequence.map(person => {
    const item = document.createElement("div");
    item.className = "roulette-item";
    item.textContent = person.nick;
    return item;
  });
  el["roulette-track"].replaceChildren(...items);
  const duration = 9000;
  const elapsed = Math.max(0, Date.now() - drawnAt);
  const finalOffset = -(sequence.length - 3) * 180;
  el["roulette-track"].getAnimations().forEach(animation => animation.cancel());
  const animation = el["roulette-track"].animate([
    { transform: "translateX(200px)" },
    { transform: `translateX(${finalOffset}px)` }
  ], { duration, easing: "cubic-bezier(.08,.68,.08,1)", fill: "forwards" });
  // Coloca cada navegador no mesmo ponto da animação usando o horário oficial do servidor.
  animation.currentTime = Math.min(elapsed, duration);
  setTimeout(() => showWinners(draw.winners), Math.max(0, duration - elapsed) + 200);
}

onSnapshot(doc(db, "config", "evento"), snapshot => {
  if (!snapshot.exists()) return setSiteActive(false);
  const data = snapshot.data();
  if (data.closesAt?.toDate) closesAt = data.closesAt.toDate();
  setSiteActive(data.active === true);
}, () => setSiteActive(false));

onSnapshot(query(collection(db, "participantes"), orderBy("createdAt", "asc")), snapshot => {
  participants = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
  renderParticipants();
  renderRoulettePreview();
  if (registrationClosed) attemptAutomaticDraw();
});

onSnapshot(doc(db, "resultado", "atual"), snapshot => {
  if (!snapshot.exists()) return;
  hasOfficialResult = true;
  const draw = { id: snapshot.id + String(snapshot.data().drawnAt?.seconds || ""), ...snapshot.data() };
  if (!Array.isArray(draw.winners) || draw.winners.length !== 5) return;
  const drawnAt = draw.drawnAt?.toMillis?.() || Date.now();
  if (Date.now() - drawnAt > 11000) showWinners(draw.winners);
  else animateRoulette(draw, drawnAt);
});

onAuthStateChanged(auth, async user => {
  if (!user) return;
  currentUser = user;
  el["join-button"].disabled = registrationClosed;
  await restoreRegistration();
  if (registrationClosed) attemptAutomaticDraw();
});

signInAnonymously(auth).catch(() => setMessage("Não foi possível conectar ao sorteio. Atualize a página.", "error"));
startCountdown();
