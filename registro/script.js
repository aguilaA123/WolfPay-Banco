import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import {
  getFirestore,
  collection,
  onSnapshot,
  updateDoc,
  doc
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

/* -------- Contenedor HTML donde van las boletas -------- */
const contenedor = document.getElementById("contenedorRegistros");

/* ---------------- Escuchar Facturas en vivo ---------------- */
onSnapshot(collection(db, "Facturas"), (snap) => {
  if (snap.empty) {
    contenedor.innerHTML = `
      <p class="placeholder">Aún no hay registros generados.</p>
    `;
    return;
  }

  let docs = [];
  snap.forEach((d) => docs.push({ id: d.id, ...d.data() }));

  docs.sort((a, b) => {
    let A = parseInt(a.id.split("-")[1]);
    let B = parseInt(b.id.split("-")[1]);
    return B - A;
  });

  contenedor.innerHTML = "";

  docs.forEach((item) => {
    const tarjeta = document.createElement("div");
    tarjeta.className = "boleta";

    tarjeta.innerHTML = `
      <span class="boleta-titulo">${item.id}</span>
      <span class="boleta-fecha">${item.Fecha || ""}</span>
      ${item.Nuevo === "Si" ? `<span class="new-tag">NEW</span>` : ""}
    `;

    tarjeta.addEventListener("click", async () => {
      // marcar como visto
      if (item.Nuevo === "Si") {
        await updateDoc(doc(db, "Facturas", item.id), { Nuevo: "No" });
      }

      // 📌 REDIRIGE A factura/ CON EL ID REAL
      window.location.href = `../factura/?id=${item.id}`;
    });

    contenedor.appendChild(tarjeta);
  });
});