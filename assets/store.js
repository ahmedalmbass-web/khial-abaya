
(() => {
  const grid = document.getElementById("products");
  if (!grid) return;

  const search = document.getElementById("search");
  const count = document.getElementById("product-count");
  const modal = document.getElementById("product-modal");
  const modalImage = document.getElementById("modal-image");
  const modalTitle = document.getElementById("modal-title");
  const modalDescription = document.getElementById("modal-description");
  const modalPrice = document.getElementById("modal-price");
  const modalColor = document.getElementById("modal-color");
  const modalSize = document.getElementById("modal-size");
  const modalQty = document.getElementById("modal-qty");
  const orderButton = document.getElementById("order-button");
  const closeButton = document.getElementById("modal-close");
  const toast = document.getElementById("toast");
  const generalWhatsApp = document.getElementById("general-whatsapp");

  let products = [];
  let whatsappNumber = "";
  let selectedProduct = null;
  let toastTimer;

  const escapeHTML = value =>
    String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.hidden = true;
    }, 3200);
  }

  function formatPrice(value) {
    const price = Number(value);
    if (!Number.isFinite(price)) return "السعر عند الطلب";

    return new Intl.NumberFormat("ar", {
      maximumFractionDigits: 2
    }).format(price) + " ر.ي";
  }

  function imagePlaceholder() {
    return `<div class="product-placeholder">
      <span>خَيَال</span>
      <small>ABAYA COLLECTION</small>
    </div>`;
  }

  function productCard(product) {
    const image = String(product.image || "").trim();

    return `
      <article class="product-card">
        <button class="product-open" type="button"
          data-product-id="${escapeHTML(product.id)}"
          aria-label="عرض ${escapeHTML(product.name || "العباية")}"
          style="display:block;width:100%;padding:0;border:0;background:transparent;text-align:right">
          <div class="product-image">
            ${image
              ? `<img src="${escapeHTML(image)}"
                   alt="${escapeHTML(product.name || "عباية")}"
                   loading="lazy">`
              : imagePlaceholder()}
            ${product.badge
              ? `<span class="product-badge">${escapeHTML(product.badge)}</span>`
              : ""}
          </div>
          <div class="product-info">
            <span class="product-category">${escapeHTML(product.category || "عبايات")}</span>
            <h3 class="product-title">${escapeHTML(product.name || "عباية")}</h3>
            <p class="product-description">${escapeHTML(product.description || "تفاصيل أنيقة بتصميم راقٍ.")}</p>
            <div class="product-bottom">
              <span class="product-price">${formatPrice(product.price)}</span>
              <span class="product-order">عرض التفاصيل</span>
            </div>
          </div>
        </button>
      </article>`;
  }

  function renderProducts() {
    const term = (search?.value || "").trim().toLocaleLowerCase("ar");

    const filtered = products.filter(product => {
      const text = [
        product.name,
        product.category,
        product.description
      ].join(" ").toLocaleLowerCase("ar");

      return text.includes(term);
    });

    if (count) {
      count.textContent = `عدد المنتجات: ${filtered.length}`;
    }

    if (!filtered.length) {
      grid.innerHTML = `
        <div class="empty-state">
          <strong>${products.length ? "لم نعثر على منتجات" : "المجموعة قيد التجهيز"}</strong>
          ${products.length
            ? "جرّبي البحث باسم آخر."
            : "ستظهر العبايات هنا عند إضافتها من لوحة الإدارة."}
        </div>`;
      return;
    }

    grid.innerHTML = filtered.map(productCard).join("");

    grid.querySelectorAll(".product-image img").forEach(img => {
      img.addEventListener("error", () => {
        const parent = img.parentElement;
        if (parent) parent.innerHTML = imagePlaceholder();
      }, { once: true });
    });
  }

  function openProduct(product) {
    selectedProduct = product;

    if (modalTitle) modalTitle.textContent = product.name || "عباية";

    if (modalDescription) {
      modalDescription.textContent =
        product.description ||
        "للاستفسار عن تفاصيل المنتج، تواصلي معنا عبر واتساب.";
    }

    if (modalPrice) modalPrice.textContent = formatPrice(product.price);

    if (modalImage) {
      const image = String(product.image || "").trim();

      modalImage.innerHTML = image
        ? `<img src="${escapeHTML(image)}" alt="${escapeHTML(product.name || "عباية")}">`
        : imagePlaceholder();

      const img = modalImage.querySelector("img");

      img?.addEventListener("error", () => {
        modalImage.innerHTML = imagePlaceholder();
      }, { once: true });
    }

    
    function fillOptions(select, values, label) {
      if (!select) return;

      const options = Array.isArray(values)
        ? [...new Set(values.filter(
            value => typeof value === "string" && value.trim()
          ).map(value => value.trim()))]
        : [];

      select.replaceChildren();

      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = options.length
        ? `اختاري ${label}`
        : `لا توجد خيارات محددة`;
      select.appendChild(placeholder);

      options.forEach(value => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
      });

      select.disabled = options.length === 0;
      select.required = options.length > 0;
      select.hidden = options.length === 0;
    }

    fillOptions(modalColor, product.colors, "اللون");
fillOptions(modalSize, product.sizes, "المقاس");

if (modalColor) modalColor.value = "";
if (modalSize) modalSize.value = "";
if (modalQty) modalQty.value = "1";


    if (modal) {
  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  closeButton?.focus();
    }
  }

  function closeModal() {
  if (modal) {
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
  }

  document.body.style.overflow = "";
  selectedProduct = null;
  }

  function sendWhatsApp(product, details = false) {
    const number = whatsappNumber.replace(/\D/g, "");

    if (!number) {
      showToast("رقم واتساب المتجر غير مضبوط. أضيفيه في إعدادات Netlify.");
      return;
    }

    const lines = [
      "مرحبًا، أرغب بالاستفسار عن منتج من خيال للعبايات.",
      `المنتج: ${product.name || "عباية"}`,
      `السعر: ${formatPrice(product.price)}`,
      `رمز المنتج: ${product.id}`
    ];

    if (details) {
      const quantity = Math.min(
        10,
        Math.max(1, Number(modalQty?.value) || 1)
      );

      lines.push(`الكمية: ${quantity}`);

      if (modalColor?.value) lines.push(`اللون: ${modalColor.value}`);
      if (modalSize?.value) lines.push(`المقاس: ${modalSize.value}`);
    }

    const url =
      `https://wa.me/${number}?text=${encodeURIComponent(lines.join("\n"))}`;

    const opened = window.open(url, "_blank", "noopener,noreferrer");

    if (!opened) {
      showToast("تعذّر فتح واتساب تلقائيًا. تحققي من إعدادات المتصفح.");
    }
  }

  grid.addEventListener("click", event => {
    const button = event.target.closest("[data-product-id]");
    if (!button) return;

    const product = products.find(item =>
      String(item.id) === button.dataset.productId
    );

    if (product) openProduct(product);
  });

  search?.addEventListener("input", renderProducts);

  closeButton?.addEventListener("click", closeModal);

  modal?.addEventListener("click", event => {
    if (event.target === modal) closeModal();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && modal && !modal.hidden) closeModal();
  });

  
  orderButton?.addEventListener("click", () => {
    if (!selectedProduct) return;

    const hasColors =
      Array.isArray(selectedProduct.colors) &&
      selectedProduct.colors.some(
        value => typeof value === "string" && value.trim()
      );

    const hasSizes =
      Array.isArray(selectedProduct.sizes) &&
      selectedProduct.sizes.some(
        value => typeof value === "string" && value.trim()
      );

    if (hasColors && !modalColor?.value) {
      showToast("يرجى اختيار لون العباية أولًا.");
      modalColor?.focus();
      return;
    }

    if (hasSizes && !modalSize?.value) {
      showToast("يرجى اختيار مقاس العباية أولًا.");
      modalSize?.focus();
      return;
    }

    sendWhatsApp(selectedProduct, true);
  });


  generalWhatsApp?.addEventListener("click", event => {
    event.preventDefault();

    const number = whatsappNumber.replace(/\D/g, "");

    if (!number) {
      showToast("رقم واتساب المتجر غير مضبوط بعد.");
      return;
    }

    window.open(
      `https://wa.me/${number}?text=${encodeURIComponent("مرحبًا، أرغب بالاستفسار عن عبايات خيال.")}`,
      "_blank",
      "noopener,noreferrer"
    );
  });

  grid.addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") return;

    const button = event.target.closest("[data-product-id]");
    if (!button) return;

    event.preventDefault();

    const product = products.find(item =>
      String(item.id) === button.dataset.productId
    );

    if (product) openProduct(product);
  });

  async function loadProducts() {
    try {
      const response = await fetch("/api/products", {
        headers: { Accept: "application/json" },
        cache: "no-store"
      });

      if (!response.ok) throw new Error("تعذّر تحميل المنتجات");

      const data = await response.json();

      products = Array.isArray(data.products)
        ? data.products.filter(product => product && product.active !== false)
        : [];

      whatsappNumber = String(data.whatsappNumber || "").trim();

      renderProducts();
    } catch (error) {
      console.error("Product loading failed:", error);

      grid.innerHTML = `
        <div class="empty-state">
          <strong>تعذّر تحميل المنتجات حاليًا</strong>
          تحققي من نشر الموقع ووظائف Netlify.
        </div>`;

      if (count) count.textContent = "تعذّر تحميل المجموعة";
    }
  }

  loadProducts();
})();
