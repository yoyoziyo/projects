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
  "draw-title", "draw-status", "wheel-canvas", "winners", "winner-list", "inactive-screen",
  "main-content"
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
  drawWheel(participants, 0);
}

function drawWheel(people, rotation = 0) {
  const canvas = el["wheel-canvas"];
  const context = canvas.getContext("2d");
  const size = canvas.width;
  const center = size / 2;
  const radius = center - 12;
  context.clearRect(0, 0, size, size);

  if (!people.length) {
    context.beginPath();
    context.arc(center, center, radius, 0, Math.PI * 2);
    context.fillStyle = "#17142f";
    context.fill();
    context.strokeStyle = "#8d50f5";
    context.lineWidth = 3;
    context.stroke();
    context.fillStyle = "#999fb4";
    context.font = "600 20px Inter, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("Aguardando participantes", center, center - radius * .46);
    return;
  }

  const arc = (Math.PI * 2) / people.length;
  const fontSize = Math.max(9, Math.min(22, 185 / Math.sqrt(people.length)));
  people.forEach((person, index) => {
    const start = rotation + index * arc - Math.PI / 2;
    const end = start + arc;
    context.beginPath();
    context.moveTo(center, center);
    context.arc(center, center, radius, start, end);
    context.closePath();
    const gradient = context.createRadialGradient(center, center, radius * .1, center, center, radius);
    if (index % 2 === 0) {
      gradient.addColorStop(0, "#47208f");
      gradient.addColorStop(1, "#7d3de2");
    } else {
      gradient.addColorStop(0, "#12152d");
      gradient.addColorStop(1, "#29205a");
    }
    context.fillStyle = gradient;
    context.fill();
    context.strokeStyle = "rgba(173, 118, 255, .55)";
    context.lineWidth = 1.5;
    context.stroke();

    const middle = start + arc / 2;
    context.save();
    context.translate(center, center);
    context.rotate(middle + Math.PI / 2);
    context.translate(0, -radius * .72);
    context.fillStyle = "#ffffff";
    context.font = `700 ${fontSize}px Inter, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    const label = person.nick.length > 16 ? `${person.nick.slice(0, 15)}…` : person.nick;
    context.fillText(label, 0, 0, Math.max(55, radius * arc * .72));
    context.restore();
  });

  context.beginPath();
  context.arc(center, center, radius, 0, Math.PI * 2);
  context.strokeStyle = "#a260ff";
  context.lineWidth = 4;
  context.stroke();
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
  const wheelPeople = participants.length ? participants : winners;
  const selectedIndex = Math.max(0, wheelPeople.findIndex(person => person.id === winners[0].id));
  const arc = (Math.PI * 2) / wheelPeople.length;
  drawWheel(wheelPeople, -(selectedIndex + .5) * arc);
  el["draw-title"].textContent = "Temos nossos vencedores!";
  el["draw-status"].textContent = "Confira abaixo os cinco ganhadores.";
}

function animateRoulette(draw, drawnAt) {
  if (activeDrawId === draw.id) return;
  activeDrawId = draw.id;
  el["winner-list"].innerHTML = '<li class="waiting">-</li><li class="waiting">-</li><li class="waiting">-</li><li class="waiting">-</li><li class="waiting">-</li>';
  el["draw-title"].textContent = "Sorteando ao vivo…";
  el["draw-status"].textContent = "Aguarde a roleta parar.";
  el["draw-section"].scrollIntoView({ behavior: "smooth", block: "center" });

  const pool = participants.length ? participants : draw.winners;
  const duration = 9000;
  const selectedIndex = Math.max(0, pool.findIndex(person => person.id === draw.winners[0].id));
  const arc = (Math.PI * 2) / pool.length;
  const finalRotation = Math.PI * 2 * 10 - (selectedIndex + .5) * arc;
  const animate = () => {
    const elapsed = Math.max(0, Date.now() - drawnAt);
    const progress = Math.min(1, elapsed / duration);
    const eased = 1 - Math.pow(1 - progress, 4);
    drawWheel(pool, finalRotation * eased);
    if (progress < 1) requestAnimationFrame(animate);
    else setTimeout(() => showWinners(draw.winners), 180);
  };
  requestAnimationFrame(animate);
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
