import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import {
  getFirestore,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

/* ---------------- CONFIG FIREBASE ---------------- */
const firebaseConfig = {
  apiKey: "AIzaSyChWAjNRgPyJSnnCtks25fnmNGAptHsDGQ",
  authDomain: "wolfpay-dd57b.firebaseapp.com",
  projectId: "wolfpay-dd57b",
  storageBucket: "wolfpay-dd57b.firebasestorage.app",
  messagingSenderId: "1001364536237",
  appId: "1:1001364536237:web:81ba233c90677070a17f24",
  measurementId: "G-24Y3D7QNT1",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* ---------------- ELEMENTOS ---------------- */
const saldoDiv = document.querySelector(".saldo");
const btnRestar = document.getElementById("btnRestar");
const btnSumar = document.getElementById("btnSumar");
const btnEditar = document.getElementById("btnEditar");
const modalBg = document.getElementById("modalOperacion");
const cerrarModal = modalBg.querySelector(".cerrar");
const confirmarOperacion = document.getElementById("confirmarOperacion");
const inputMonto = document.getElementById("montoInput");
const modalTitulo = document.getElementById("modalTitulo");

const bizumMontoLabel = document.getElementById("bizumMonto");
const btnOnline = document.getElementById("btnOnline");
const btnLlego = document.getElementById("btnLlego");
const btnNoLlego = document.getElementById("btnNoLlego");

let saldoActual = 0;
let ultimoEstado = "";

/* ---------------- ESCUCHAR CAMBIOS DE SALDO ---------------- */
onSnapshot(doc(db, "Bank", "Monto"), (snap) => {
  if (snap.exists()) {
    const nuevo = snap.data()?.Total || "0.00€";
    saldoDiv.textContent = nuevo;
    saldoDiv.classList.remove("flash");
    void saldoDiv.offsetWidth;
    saldoDiv.classList.add("flash");
    saldoActual = parseFloat(nuevo.replace("€", ""));
  }
});

/* ---------------- MODAL ---------------- */
let tipoOperacion = "";

function abrirModal(tipo) {
  tipoOperacion = tipo;
  modalTitulo.textContent =
    tipo === "restar" ? "Restar monto" :
    tipo === "sumar" ? "Sumar monto" :
    "Editar saldo";
  inputMonto.value = "";
  modalBg.style.display = "flex";
  inputMonto.focus();
}
function cerrar() { modalBg.style.display = "none"; }

btnRestar.addEventListener("click", () => abrirModal("restar"));
btnSumar.addEventListener("click", () => abrirModal("sumar"));
btnEditar.addEventListener("click", () => abrirModal("editar"));
cerrarModal.addEventListener("click", cerrar);

confirmarOperacion.addEventListener("click", async () => {
  const val = parseFloat(inputMonto.value);
  if (isNaN(val)) return cerrar();
  let nuevoSaldo = saldoActual;

  if (tipoOperacion === "restar") nuevoSaldo -= val;
  if (tipoOperacion === "sumar") nuevoSaldo += val;
  if (tipoOperacion === "editar") nuevoSaldo = val;

  if (nuevoSaldo < 0) nuevoSaldo = 0;

  await setDoc(doc(db, "Bank", "Monto"), { Total: nuevoSaldo.toFixed(2) + "€" });
  cerrar();
  showFlashMessage(`Saldo actualizado: ${nuevoSaldo.toFixed(2)}€`);
});

/* ---------------- FLASH MESSAGE ---------------- */
function showFlashMessage(msg, color = "#11d7d7") {
  let flash = document.createElement("div");
  flash.textContent = msg;
  flash.style.position = "fixed";
  flash.style.bottom = "80px";
  flash.style.left = "50%";
  flash.style.transform = "translateX(-50%)";
  flash.style.background = "rgba(17, 215, 215, 0.18)";
  flash.style.color = color;
  flash.style.fontWeight = "700";
  flash.style.padding = "12px 22px";
  flash.style.borderRadius = "12px";
  flash.style.boxShadow = "0 0 15px rgba(17,215,215,0.25)";
  flash.style.zIndex = "2000";
  flash.style.animation = "fadeFlash 2s ease";
  flash.style.backdropFilter = "blur(3px)";
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 2000);
}

const style = document.createElement("style");
style.textContent = `
@keyframes fadeFlash {
  0% {opacity: 0; transform: translateX(-50%) translateY(10px);}
  15% {opacity: 1; transform: translateX(-50%) translateY(0);}
  80% {opacity: 1;}
  100% {opacity: 0; transform: translateX(-50%) translateY(-10px);}
}`;
document.head.appendChild(style);

/* ---------------- FIREBASE BIZUM ---------------- */
const verificarRef = doc(db, "Bizum", "Verificar");
const recibidoRef = doc(db, "Bizum", "Recibido");

/* Mostrar monto Bizum cuando esté activo */
onSnapshot(recibidoRef, (snap) => {
  if (snap.exists()) {
    const monto = snap.data()?.Monto;
    if (monto && monto !== "0.00€") {
      bizumMontoLabel.textContent = monto;
      bizumMontoLabel.classList.add("visible");
    } else {
      // 🔁 Si monto es 0.00 o vacío, ocultamos los botones al instante
      bizumMontoLabel.classList.remove("visible");
      btnOnline.style.display = "none";
      btnLlego.style.display = "none";
      btnNoLlego.style.display = "none";
    }
  }
});

/* Lógica de botones dinámicos según estado */
let primerCarga = true; // ✅ evita spam al cargar por primera vez

onSnapshot(verificarRef, async (snap) => {
  if (!snap.exists()) return;
  const estado = snap.data().Estado;
  const montoSnap = await getDoc(recibidoRef);
  const monto = montoSnap.data()?.Monto || "";

  // 🔁 Mostrar según estado
  if (estado === "Esperando") {
    btnOnline.style.display = "block";
    btnLlego.style.display = "none";
    btnNoLlego.style.display = "none";

    // ✅ Notificar solo si realmente cambió a “Esperando”
    if (estado !== ultimoEstado && !primerCarga) {
      enviarNotificacionTelegram(monto);
    }
  }

  if (estado === "Verificando") {
    btnOnline.style.display = "none";
    btnLlego.style.display = "block";
    btnNoLlego.style.display = "block";
  }

  if (estado === "Recibido" || estado === "Rechazo") {
    btnOnline.style.display = "none";
    btnLlego.style.display = "none";
    btnNoLlego.style.display = "none";
  }

  ultimoEstado = estado;
  primerCarga = false; // solo se marca después de la primera lectura
});

/* ---------------- BOTONES DE ACCIÓN ---------------- */
btnOnline.addEventListener("click", async () => {
  await updateDoc(verificarRef, { Estado: "Verificando" });
  showFlashMessage("🟡 Cambiado a Verificando...", "#ffcc00");
});

btnLlego.addEventListener("click", async () => {
  await updateDoc(verificarRef, { Estado: "Recibido" });
  await updateDoc(recibidoRef, { Estado: "Recibido" });
  showFlashMessage("Bizum marcado como Recibido ✅", "#10c76f");
});

btnNoLlego.addEventListener("click", async () => {
  await updateDoc(verificarRef, { Estado: "Rechazo" });
  showFlashMessage("Bizum marcado como Rechazo ❌", "#b91c1c");
});

/* ---------------- TELEGRAM ---------------- */
async function enviarNotificacionTelegram(monto) {
  const token = "8530583161:AAHXahSmOF0CvgIdEogCfRMgd7lyFl6FqO0";
  const chatId = "6574043107";

  const mensaje = `🕒 *Bizum pendiente en verificar*\nMonto: ${monto}`;
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const body = { chat_id: chatId, text: mensaje, parse_mode: "Markdown" };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (res.ok) console.log("✅ Notificación enviada a Telegram");
    else console.error("❌ Error enviando:", await res.text());
  } catch (err) {
    console.error("⚠️ Error red Telegram:", err);
  }
}

/* ---------------- COPIAR IBAN ---------------- */
const copyBtn = document.getElementById("copyIbanBtn");
const ibanText = document.querySelector(".iban-text");

copyBtn.addEventListener("click", async () => {
  try {
    const text = ibanText.textContent.replace("IBAN: ", "").trim();
    await navigator.clipboard.writeText(text);
    showFlashMessage("IBAN copiado ✅", "#10c76f");
  } catch (err) {
    showFlashMessage("Error al copiar", "#b91c1c");
  }
});