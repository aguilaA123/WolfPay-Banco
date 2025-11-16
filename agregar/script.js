import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

/* ---------------- CONFIG FIREBASE ---------------- */
const firebaseConfig = {
  apiKey: "AIzaSyChWAjNRgPyJSnnCtks25fnmNGAptHsDGQ",
  authDomain: "wolfpay-dd57b.firebaseapp.com",
  projectId: "wolfpay-dd57b",
  storageBucket: "wolfpay-dd57b.firebasestorage.app",
  messagingSenderId: "1001364536237",
  appId: "1:1001364536237:web:81ba233c90677070a17f24",
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

/* ---------------- ELEMENTOS ---------------- */
const tituloBoleta    = document.getElementById("boletaTitulo");
const precioInput     = document.getElementById("precioInput");
const fechaInput      = document.getElementById("fechaInput");
const descInput       = document.getElementById("descInput");
const categoriaSel    = document.getElementById("categoria");

const toggleMontos    = document.getElementById("toggleMontos");
const montosExtraDiv  = document.getElementById("montosExtra");
const montoInicialInp = document.getElementById("montoInicial");
const montoFinalInp   = document.getElementById("montoFinal");

const btnAgregar  = document.getElementById("btnAgregar");
const btnGenerar  = document.getElementById("btnGenerar");

const previewBox        = document.getElementById("previewBox");
const previewPlaceholder = document.getElementById("previewPlaceholder");

/* ---------------- ESTADO ---------------- */
let boletaId = "Boleta-000";
let items = []; // {precioNumber, precioStr, descripcion, fecha, categoria}

/* ---------------- UTILIDADES ---------------- */
function formatearMonto(num) {
  return `${num.toFixed(2)}€`;
}

function fechaHoyDDMMYY() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

function showFlash(msg, color = "#11d7d7") {
  const flash = document.createElement("div");
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
  flash.style.zIndex = "9999";
  flash.style.backdropFilter = "blur(3px)";
  flash.style.animation = "fadeFlash 2s ease";
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 2000);

  if (!document.getElementById("flash-style")) {
    const s = document.createElement("style");
    s.id = "flash-style";
    s.textContent = `
      @keyframes fadeFlash {
        0% {opacity:0; transform:translateX(-50%) translateY(10px);}
        15%{opacity:1; transform:translateX(-50%) translateY(0);}
        80%{opacity:1;}
        100%{opacity:0; transform:translateX(-50%) translateY(-10px);}
      }
    `;
    document.head.appendChild(s);
  }
}

/* ---------------- SIGUIENTE BOLETA ---------------- */
async function obtenerSiguienteBoletaId() {
  const ref = collection(db, "Facturas");
  const snap = await getDocs(ref);
  let maxNum = 0;

  snap.forEach((docSnap) => {
    const id = docSnap.id;    // Ej: Boleta-003
    const parts = id.split("-");
    if (parts[0] === "Boleta" && parts[1]) {
      const n = parseInt(parts[1], 10);
      if (!isNaN(n) && n > maxNum) maxNum = n;
    }
  });

  const siguiente = maxNum + 1;
  const numStr = String(siguiente).padStart(3, "0");
  return `Boleta-${numStr}`;
}

/* ---------------- MONTOS: RECÁLCULO ---------------- */
function recalcularMontos() {
  const totalGasto = items.reduce((acc, it) => acc + it.precioNumber, 0);

  if (!toggleMontos.checked) {
    montoFinalInp.value = "0.00€";
    return;
  }

  const valIni = parseFloat(
    (montoInicialInp.value || "0").toString().replace(",", ".")
  );

  if (!isNaN(valIni)) {
    const final = valIni - totalGasto;
    montoFinalInp.value = formatearMonto(final);
  } else {
    montoFinalInp.value = "0.00€";
  }
}

/* ---------------- VISTA PREVIA ---------------- */
function renderPreview() {
  previewBox.innerHTML = "";

  if (items.length === 0) {
    previewPlaceholder.style.display = "block";
    return;
  }
  previewPlaceholder.style.display = "none";

  const totalGasto = items.reduce((acc, it) => acc + it.precioNumber, 0);
  const usarMontos = toggleMontos.checked;

  if (usarMontos) {
    const valIni = parseFloat(
      (montoInicialInp.value || "0").toString().replace(",", ".")
    );
    const montoIni = !isNaN(valIni) ? valIni : 0;
    const final = montoIni - totalGasto;

    // Monto inicial
    const lineaIni = document.createElement("div");
    lineaIni.className = "preview-item";
    lineaIni.textContent = `Monto inicial: ${formatearMonto(montoIni)}`;
    previewBox.appendChild(lineaIni);

    // Items
    items.forEach((it) => {
      const div = document.createElement("div");
      div.className = "preview-item";
      div.textContent = `${it.precioStr} — ${it.descripcion} — ${it.fecha} — ${it.categoria}`;
      previewBox.appendChild(div);
    });

    // Monto final
    const lineaFin = document.createElement("div");
    lineaFin.className = "preview-item";
    lineaFin.textContent = `Monto final: ${formatearMonto(final)}`;
    previewBox.appendChild(lineaFin);
  } else {
    // Sin montos inicial/final, solo lista
    items.forEach((it) => {
      const div = document.createElement("div");
      div.className = "preview-item";
      div.textContent = `${it.precioStr} — ${it.descripcion} — ${it.fecha} — ${it.categoria}`;
      previewBox.appendChild(div);
    });
  }
}

/* ---------------- TOGGLE MONTOS ---------------- */
function actualizarToggleMontos() {
  if (toggleMontos.checked) {
    montosExtraDiv.classList.remove("montos-disabled");
    montoInicialInp.disabled = false;
    montoFinalInp.disabled = true; // solo lectura
  } else {
    montosExtraDiv.classList.add("montos-disabled");
    montoInicialInp.disabled = true;
    montoFinalInp.disabled = true;
    montoInicialInp.value = "";
    montoFinalInp.value = "0.00€";
  }
  recalcularMontos();
  renderPreview();
}

toggleMontos.addEventListener("change", actualizarToggleMontos);
montoInicialInp.addEventListener("input", () => {
  recalcularMontos();
  renderPreview();
});

/* ---------------- BOTÓN AÑADIR ---------------- */
btnAgregar.addEventListener("click", () => {
  const precioVal = parseFloat(
    (precioInput.value || "").toString().replace(",", ".")
  );
  const descVal = descInput.value.trim();
  const fechaVal = fechaInput.value.trim() || fechaHoyDDMMYY();
  const categoriaVal = categoriaSel.value;

  if (isNaN(precioVal) || precioVal <= 0) {
    showFlash("Coloca un precio válido.", "#ff6666");
    return;
  }
  if (!descVal) {
    showFlash("Escribe una descripción.", "#ff6666");
    return;
  }
  if (!categoriaVal) {
    showFlash("Elige una categoría.", "#ff6666");
    return;
  }

  items.unshift({
    precioNumber: precioVal,
    precioStr: formatearMonto(precioVal),
    descripcion: descVal,
    fecha: fechaVal,
    categoria: categoriaVal,
  });

  // limpiar inputs
  precioInput.value = "";
  descInput.value = "";
  categoriaSel.value = "";

  recalcularMontos();
  renderPreview();
});

/* ---------------- BOTÓN GENERAR FACTURA ---------------- */
btnGenerar.addEventListener("click", async () => {
  if (items.length === 0) {
    showFlash("Agrega al menos un movimiento.", "#ff6666");
    return;
  }

  const usarMontos = toggleMontos.checked;
  let montoInicialVal = 0;
  let montoFinalVal = 0;

  if (usarMontos) {
    const valIni = parseFloat(
      (montoInicialInp.value || "").toString().replace(",", ".")
    );
    if (isNaN(valIni) || valIni <= 0) {
      showFlash(
        "Coloca un monto inicial válido o desactiva el interruptor.",
        "#ff6666"
      );
      return;
    }
    const totalGasto = items.reduce((acc, it) => acc + it.precioNumber, 0);
    montoInicialVal = valIni;
    montoFinalVal = valIni - totalGasto;
  }

  try {
    // recalcular ID por si se creó otra boleta en paralelo
    boletaId = await obtenerSiguienteBoletaId();
    const ref = doc(db, "Facturas", boletaId);

    const data = {
      Fecha: fechaHoyDDMMYY(),
      Nuevo: "Si",
    };

    if (usarMontos) {
      data["Monto Inicial"] = formatearMonto(montoInicialVal);
      data["Monto Final"] = formatearMonto(montoFinalVal);
    } else {
      data["Monto Inicial"] = "0.00€";
      data["Monto Final"] = "0.00€";
    }

    // Items: 3.00€-1 : "Comida - 15/11/25 - Amazon"
    items.forEach((it, idx) => {
      const key = `${it.precioStr}-${idx + 1}`;
      data[key] = `${it.descripcion} - ${it.fecha} - ${it.categoria}`;
    });

    await setDoc(ref, data);

    showFlash("Factura generada correctamente ✔", "#10c76f");

    // reset
    items = [];
    previewBox.innerHTML = "";
    previewPlaceholder.style.display = "block";
    montoInicialInp.value = "";
    montoFinalInp.value = "0.00€";
    precioInput.value = "";
    fechaInput.value = "";
    descInput.value = "";
    categoriaSel.value = "";
    toggleMontos.checked = false;
    actualizarToggleMontos();

    // siguiente boleta
    boletaId = await obtenerSiguienteBoletaId();
    tituloBoleta.textContent = boletaId;
  } catch (err) {
    console.error(err);
    showFlash("Error al guardar la factura.", "#ff6666");
  }
});

/* ---------------- INICIO ---------------- */
(async () => {
  try {
    boletaId = await obtenerSiguienteBoletaId();
    tituloBoleta.textContent = boletaId;
  } catch (e) {
    console.error(e);
  }
  actualizarToggleMontos();
})();