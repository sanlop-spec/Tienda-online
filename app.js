/* ============================================================
   1. CONFIGURACIÓN — pega aquí tus credenciales de Supabase
   ============================================================
   Estas dos claves son PÚBLICAS por diseño (claves "anon"),
   están hechas para vivir en el navegador. La seguridad real
   la da la política RLS que configures en Supabase (ver guía).
*/
const SUPABASE_URL = "https://TU-PROYECTO.supabase.co";
const SUPABASE_ANON_KEY = "TU-ANON-KEY-PUBLICA";

// Número de WhatsApp del vendedor, formato internacional sin signos: 521XXXXXXXXXX
const WHATSAPP_NUMBER = "521XXXXXXXXXX";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ============================================================
   2. ESTADO
   ============================================================ */
let PRODUCTS = [];       // catálogo completo traído de Supabase
let CART = loadCart();   // [{ id, titulo, imagen_url, talla, cantidad }]

/* ============================================================
   3. CARGA DE PRODUCTOS
   ============================================================ */
async function fetchProducts() {
  const loadingEl = document.getElementById("loadingState");
  const gridEl = document.getElementById("productGrid");

  const { data, error } = await supabase
    .from("productos")
    .select("*")
    .order("id", { ascending: true });

  loadingEl.classList.add("hidden");

  if (error) {
    gridEl.innerHTML = `<p class="font-mono text-sm text-accent col-span-full">
      No se pudo cargar el catálogo. Revisa la conexión con Supabase (consola del navegador).
    </p>`;
    console.error("Error Supabase:", error);
    return;
  }

  PRODUCTS = data || [];
  renderProducts(PRODUCTS);
}

/* ============================================================
   4. RENDER DEL CATÁLOGO
   ============================================================ */
function renderProducts(list) {
  const gridEl = document.getElementById("productGrid");
  const emptyEl = document.getElementById("emptyState");
  const template = document.getElementById("productCardTemplate");

  gridEl.innerHTML = "";

  if (!list.length) {
    emptyEl.classList.remove("hidden");
    return;
  }
  emptyEl.classList.add("hidden");

  list.forEach((producto) => {
    const card = template.content.cloneNode(true);

    const img = card.querySelector(".product-img");
    img.src = producto.imagen_url || "";
    img.alt = producto.titulo || "Producto";

    card.querySelector(".product-title").textContent = producto.titulo || "Sin título";
    card.querySelector(".product-detalles").textContent = producto.detalles || "";

    // tallas: se espera una columna tipo array/texto separado por comas, ej: "S,M,L" o "Única"
    const tallas = parseTallas(producto.tallas);
    const select = card.querySelector(".size-select");
    tallas.forEach((talla) => {
      const opt = document.createElement("option");
      opt.value = talla;
      opt.textContent = talla;
      select.appendChild(opt);
    });

    // existencias (columna opcional 'existencias' tipo número)
    const stockTag = card.querySelector(".stock-tag");
    const hayStock = producto.existencias === undefined || producto.existencias === null || producto.existencias > 0;
    stockTag.textContent = hayStock ? "disponible" : "agotado";
    if (!hayStock) {
      stockTag.style.background = "#36322A";
      stockTag.style.color = "#A39C8C";
    }

    const addBtn = card.querySelector(".add-btn");
    if (!hayStock) {
      addBtn.disabled = true;
      addBtn.textContent = "Agotado";
      addBtn.classList.add("opacity-40", "cursor-not-allowed");
    } else {
      addBtn.addEventListener("click", () => {
        addToCart(producto, select.value);
      });
    }

    gridEl.appendChild(card);
  });
}

function parseTallas(rawTallas) {
  if (!rawTallas) return ["Única"];
  if (Array.isArray(rawTallas)) return rawTallas;
  return String(rawTallas).split(",").map((t) => t.trim()).filter(Boolean);
}

/* ============================================================
   5. BUSCADOR
   ============================================================ */
document.getElementById("searchInput").addEventListener("input", (e) => {
  const q = e.target.value.trim().toLowerCase();
  const filtered = PRODUCTS.filter((p) =>
    (p.titulo || "").toLowerCase().includes(q) ||
    (p.detalles || "").toLowerCase().includes(q)
  );
  renderProducts(filtered);
});

/* ============================================================
   6. CARRITO — almacenamiento local
   ============================================================ */
function loadCart() {
  try {
    return JSON.parse(localStorage.getItem("carrito_v1")) || [];
  } catch {
    return [];
  }
}

function saveCart() {
  localStorage.setItem("carrito_v1", JSON.stringify(CART));
}

function addToCart(producto, talla) {
  const existing = CART.find((item) => item.id === producto.id && item.talla === talla);
  if (existing) {
    existing.cantidad += 1;
  } else {
    CART.push({
      id: producto.id,
      titulo: producto.titulo,
      imagen_url: producto.imagen_url,
      talla: talla,
      cantidad: 1,
    });
  }
  saveCart();
  renderCart();
  pulseCartButton();
}

function updateQty(id, talla, delta) {
  const item = CART.find((i) => i.id === id && i.talla === talla);
  if (!item) return;
  item.cantidad += delta;
  if (item.cantidad <= 0) {
    CART = CART.filter((i) => !(i.id === id && i.talla === talla));
  }
  saveCart();
  renderCart();
}

function removeFromCart(id, talla) {
  CART = CART.filter((i) => !(i.id === id && i.talla === talla));
  saveCart();
  renderCart();
}

function pulseCartButton() {
  const btn = document.getElementById("cartButton");
  btn.style.transform = "rotate(0deg) scale(1.15)";
  setTimeout(() => { btn.style.transform = ""; }, 180);
}

/* ============================================================
   7. RENDER DEL CARRITO
   ============================================================ */
function renderCart() {
  const itemsEl = document.getElementById("cartItems");
  const emptyMsg = document.getElementById("cartEmptyMsg");
  const template = document.getElementById("cartItemTemplate");
  const checkoutBtn = document.getElementById("checkoutBtn");

  itemsEl.innerHTML = "";

  const totalItems = CART.reduce((sum, i) => sum + i.cantidad, 0);
  document.getElementById("cartCount").textContent = totalItems;
  document.getElementById("cartTotalItems").textContent = totalItems;

  if (!CART.length) {
    emptyMsg.classList.remove("hidden");
    checkoutBtn.disabled = true;
    return;
  }
  emptyMsg.classList.add("hidden");
  checkoutBtn.disabled = false;

  CART.forEach((item) => {
    const node = template.content.cloneNode(true);
    node.querySelector(".cart-item-img").src = item.imagen_url || "";
    node.querySelector(".cart-item-title").textContent = item.titulo;
    node.querySelector(".cart-item-size").textContent = `Talla: ${item.talla}`;
    node.querySelector(".cart-item-qty").textContent = item.cantidad;

    node.querySelector(".qty-minus").addEventListener("click", () => updateQty(item.id, item.talla, -1));
    node.querySelector(".qty-plus").addEventListener("click", () => updateQty(item.id, item.talla, 1));
    node.querySelector(".remove-btn").addEventListener("click", () => removeFromCart(item.id, item.talla));

    itemsEl.appendChild(node);
  });
}

/* ============================================================
   8. APERTURA / CIERRE DEL CAJÓN
   ============================================================ */
const cartDrawer = document.getElementById("cartDrawer");
const cartOverlay = document.getElementById("cartOverlay");

function openCart() {
  cartDrawer.classList.add("open");
  cartOverlay.classList.remove("hidden");
  requestAnimationFrame(() => cartOverlay.classList.add("visible"));
}

function closeCart() {
  cartDrawer.classList.remove("open");
  cartOverlay.classList.remove("visible");
  setTimeout(() => cartOverlay.classList.add("hidden"), 250);
}

document.getElementById("cartButton").addEventListener("click", openCart);
document.getElementById("closeCart").addEventListener("click", closeCart);
cartOverlay.addEventListener("click", closeCart);

/* ============================================================
   9. CHECKOUT POR WHATSAPP
   ============================================================ */
document.getElementById("checkoutBtn").addEventListener("click", () => {
  if (!CART.length) return;

  let mensaje = "¡Hola! Me interesa realizar el siguiente pedido:\n";
  CART.forEach((item) => {
    mensaje += `- ${item.cantidad}x ${item.titulo} (Talla ${item.talla})\n`;
  });
  mensaje += "¿Están disponibles?";

  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, "_blank");
});

/* ============================================================
   10. INICIO
   ============================================================ */
renderCart();
fetchProducts();
