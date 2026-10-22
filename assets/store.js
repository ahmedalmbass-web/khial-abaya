(() => {
  const grid = document.getElementById("productGrid");
  if (!grid) return;

  const search = document.getElementById("productSearch");
  const filters = document.getElementById("productFilters");
  const modal = document.getElementById("orderModal");
  const toast = document.getElementById("toast");
  let products = [];
  let category = "الكل";
  let whatsappNumber = "";
  let toastTimer;

  const escapeHTML = (value = "") =>
    String(value).replace(/[&<>"']/g, char => ({
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
    toastTimer = setTimeout(() => { toast.hidden = true; }, 3200);
  }

  function formatPrice(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "السعر عند الطلب";
    return new Intl.NumberFormat("ar", {
      maximumFractionDigits: 2
    }).format(number) + " ر.ي";
  }

  function placeholder() {
    return `<div class="product-placeholder">
      <span>KHIAL</span><small>ABAYA COLLECTION</small>
    </div>`;
  }

  function productCard(product) {
    const name = escapeHTML(product.name || "عباية");
    const image = String(product.image || "").trim();
    const categoryName = escapeHTML(product.category || "عبايات");
    const description = escapeHTML(product.description || "تفاصيل أنيقة بتصميم راقٍ.");
    const price = formatPrice(product.price);
    const badge = product.badge
      ? `<span class="product-badge">${escapeHTML(product.badge)}</span>`
      : "";
    const imageHTML = image
      ? `<img src="${escapeHTML(image)}" alt="${name}" loading="lazy"
             onerror="this.remove();this.parentElement.insertAdjacentHTML('afterbegin','<div class=&quot;product-placeholder&quot;><span>KHIAL</span><small>ABAYA COLLECTION</small></div>')">`
      : placeholder();

    return `<article class="product-card">
      <div class="product-image">
        ${imageHTML}
        ${badge}
      </div>
      <div class="product-info">
        <span class="product-category">${categoryName}</span>
        <h3 class="product-title">${name}</h3>
        <p class="product-description">${description}</p>
        <div class="product-bottom">
          <span class="product-price">${price}</span>
          <button class="product-order" type="button"
            data-order-id="${escapeHTML(product.id)}">اطلبي عبر واتساب</button>
        </div>
      </div>
    </article>`;
  }

  function renderProducts() {
    const term = (search?.value || "").trim().toLowerCase();
    const filtered = products.filter(product => {
      const searchable = [
        product.name, product.category, product.description
      ].join(" ").toLowerCase();
      return (category === "الكل" || product.category === category)
        && searchable.includes(term);
    });

    if (!filtered.length) {
      grid.innerHTML = `<div class="empty-state">
        <strong>لم نعثر على منتجات</strong>
        جرّبي البحث باسم آخر أو اختاري تصنيفًا مختلفًا.
      </div>`;
      return;
    }

    grid.innerHTML = filtered.map(productCard).join("");
  }

  function renderFilters() {
    if (!filters) return;
    const categories = ["الكل", ...new Set(
      products.map(p => p.category).filter(Boolean)
    )];

    filters.innerHTML = categories.map(item => `
      <button type="button"
        class="filter-button ${item === category ? "active" : ""}"
        data-category="${escapeHTML(item)}">${escapeHTML(item)}</button>
    `).join("");
  }

  function openWhatsApp(product) {
    if (!whatsappNumber) {
      showToast("لم يُضف رقم واتساب المتجر بعد. أضف الرقم في إعدادات Netlify.");
      return;
    }

    const cleanNumber = whatsappNumber.replace(/\D/g, "");
    if (!cleanNumber) {
      showToast("رقم واتساب المتجر غير صحيح.");
      return;
    }

    const message = [
      "مرحبًا، أرغب بالاستفسار عن هذا المنتج من خيال للعبايات:",
      `المنتج: ${product.name}`,
      `السعر: ${formatPrice(product.price)}`,
      `رمز المنتج: ${product.id}`,
      "هل يمكن تزويدي بالتفاصيل وطريقة الطلب؟"
    ].join("\n");

    window.open(
      `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  grid.addEventListener("click", event => {
    const button = event.target.closest("[data-order-id]");
    if (!button) return;
    const product = products.find(p => String(p.id) === button.dataset.orderId);
    if (product) openWhatsApp(product);
  });

  filters?.addEventListener("click", event => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    category = button.dataset.category;
    renderFilters();
    renderProducts();
  });

  search?.addEventListener("input", renderProducts);

  document.getElementById("menuToggle")?.addEventListener("click", () => {
    document.getElementById("navLinks")?.classList.toggle("open");
  });

  document.querySelectorAll("#navLinks a").forEach(link => {
    link.addEventListener("click", () => {
      document.getElementById("navLinks")?.classList.remove("open");
    });
  });

  document.getElementById("contactOrder")?.addEventListener("click", () => {
    if (!whatsappNumber) {
      showToast("سيُفعّل واتساب المتجر بعد إضافة الرقم في Netlify.");
      return;
    }
    const cleanNumber = whatsappNumber.replace(/\D/g, "");
    if (cleanNumber) {
      window.open(
        `https://wa.me/${cleanNumber}?text=${encodeURIComponent("مرحبًا، أرغب بالاستفسار عن عبايات خيال.")}`,
        "_blank",
        "noopener,noreferrer"
      );
    }
  });

  document.querySelectorAll("[data-close-modal]").forEach(button => {
    button.addEventListener("click", () => {
      if (modal) modal.hidden = true;
    });
  });

  async function loadProducts() {
    try {
      const response = await fetch("/api/products", {
        headers: { "Accept": "application/json" }
      });
      if (!response.ok) throw new Error("تعذر تحميل المنتجات");

      const data = await response.json();
      products = Array.isArray(data.products) ? data.products : [];
      whatsappNumber = String(data.whatsappNumber || "").trim();

      renderFilters();
      renderProducts();
    } catch (error) {
      grid.innerHTML = `<div class="empty-state">
        <strong>تعذر تحميل المنتجات حاليًا</strong>
        تأكدي من نشر وظائف الموقع وإعداد قاعدة تخزين المنتجات.
      </div>`;
    }
  }

  loadProducts();
})();
