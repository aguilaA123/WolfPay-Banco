import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

/* ------------------------  CONFIG FIREBASE  ------------------------ */
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

/* ------------------------ ELEMENTOS DOM ------------------------ */
const numeroFactura = document.getElementById("numeroFactura");
const fechaFactura = document.getElementById("fechaFactura");
const infoMontos = document.getElementById("infoMontos");
const listaMovimientos = document.getElementById("listaMovimientos");
const valorTotal = document.getElementById("valorTotal");
const tituloTotal = document.getElementById("tituloTotal");

/* ------------------------ ID en la URL ------------------------ */
const url = new URL(window.location.href);
const facturaID = url.searchParams.get("id");

if (!facturaID) {
  numeroFactura.textContent = "FACTURA - Nº ???";
  alert("Error: No se envió ID de factura en la URL");
}

/* ------------------------ ICONOS POR CATEGORÍA ------------------------ */
const iconos = {
  "Supermercado": "../img/super.png",
  "Amazon": "../img/amazon.png",
  "Aliexpress": "../img/aliexpress.png",
  "J&S": "../img/chino.png",
  "Comida": "../img/almuerzo.png",
  "Ocio": "../img/ocio.png",
  "Otros": "../img/otros.png"
};

/* ------------------------ FORMATO EUROS ------------------------ */
function euros(num) {
  return Number(num).toFixed(2) + "€";
}

/* ------------------------ FECHA A OBJETO REAL ------------------------ */
function parseFecha(fechaStr) {
  // formato: DD/MM/YY
  const [dd, mm, yy] = fechaStr.split("/").map(n => parseInt(n));
  const fullYear = 2000 + yy;
  return new Date(fullYear, mm - 1, dd);
}

/* ------------------------ CARGAR FACTURA ------------------------ */
async function cargarFactura() {
  try {
    const ref = doc(db, "Facturas", facturaID);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      alert("No existe la factura solicitada.");
      return;
    }

    const data = snap.data();

    /* ------------------ TITULO ------------------ */
    numeroFactura.textContent = `FACTURA - N° ${facturaID.split("-")[1]}`;

    /* ------------------ FECHA ------------------ */
    fechaFactura.textContent = data.Fecha || "--/--/--";

    /* ------------------ MONTOS ------------------ */
    const montoInicial = data["Monto Inicial"] || "0.00€";
    const montoFinal = data["Monto Final"] || "0.00€";

    let totalGasto = 0;
    let tieneMontoInicial = montoInicial !== "0.00€";

    infoMontos.textContent = tieneMontoInicial ? `Monto inicial: ${montoInicial}` : "";

    /* ------------------ MOVIMIENTOS ------------------ */
    let movimientos = [];

    Object.keys(data).forEach((key) => {
      if (key.includes("€-")) {
        const precio = key.split("-")[0]; 
        const partes = data[key].split(" - ");

        const descripcion = partes[0];
        const fecha = partes[1];
        const categoria = partes[2] || "Otros";

        movimientos.push({
          precio,
          descripcion,
          fecha,
          categoria,
          fechaReal: parseFecha(fecha)
        });

        totalGasto += parseFloat(precio.replace("€", ""));
      }
    });

    /* ------------------ Ordenar por fecha REAL ------------------ */
    movimientos.sort((a, b) => b.fechaReal - a.fechaReal);

    /* ------------------ IMPRIMIR LISTA ------------------ */
    listaMovimientos.innerHTML = "";

    movimientos.forEach((m) => {
      const fila = document.createElement("div");
      const icon = iconos[m.categoria] || "../img/otros.png";

      fila.innerHTML = `
        <span style="display:flex; align-items:center; gap:6px;">
          <img src="${icon}" style="width:20px;">
          ${m.precio}
        </span>
        <span>${m.descripcion}</span>
        <span>${m.fecha}</span>
      `;

      listaMovimientos.appendChild(fila);
    });

    /* ------------------ TOTAL / GASTADO ------------------ */
    if (tieneMontoInicial) {
      tituloTotal.textContent = "TOTAL:";
      valorTotal.textContent = montoFinal;
    } else {
      tituloTotal.textContent = "GASTADO:";
      valorTotal.textContent = "-" + euros(totalGasto);
    }

  } catch (e) {
    console.error(e);
    alert("Error cargando la factura.");
  }
}

cargarFactura();