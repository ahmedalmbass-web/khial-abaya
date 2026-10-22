(() => {
  const loginPanel = document.getElementById("loginPanel");
  const dashboard = document.getElementById("dashboard");
  if (!loginPanel || !dashboard) return;

  const loginForm = document.getElementById("loginForm");
  const loginMessage = document.getElementById("loginMessage");
  const adminProducts = document.getElementById("adminProducts");
  const productForm = document.getElementById("productForm");
  const formTitle = document.getElementById("formTitle");
  const saveButton = document.getElementById("saveProduct");
  const formMessage = document.getElementById("formMessage");
  const toast = document.getElementById("adminToast");

  let products = [];
  let toastTimer;

  const $ = id => document.getElementById(id);

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
    toastTimer = setTimeout(() => { toast.hidden = true; }, 3000);
  }

  async function api(path, options = {}) {
    const response = await fetch(path, {
      credentials: "same-origin",
      ...options,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        ...(options.headers || {})
      }
    });

    let data = {};
    try { data = await response.json(); } catch (_) {}

    if (!response.ok) {
      throw new Error(data.error || "حدث خطأ. حاول مرة أخرى.");
    }
    return data;
  }

  function showDashboard() {
    loginPanel.hidden = true;
    dashboard.hidden = false;
    loadProducts();
  }

  function showLogin() {
    loginPanel.hidden = false;
    dashboard.hidden = true;
  }

  async function checkSession() {
    try {
      const result = await api("/api/auth");
      if (result.authenticated) showDashboard();
      else showLogin();
    } catch (_) {
      showLogin();
    }
  }

  loginForm?.addEventListener("submit", async event => {
    event.preventDefault();
    loginMessage.textContent = "";
    const password = $("adminPassword").value;

    try {
      await api("/api/auth", {
        method: "POST",
        body: JSON.stringify({ action: "login", password })
      });
      loginForm.reset();
      showDashboard();
    } catch (error) {
      loginMessage.textContent = error.message;
    }
  });

  $("logoutButton")?.addEventListener("click", async () => {
    try {
      await api("/api/auth", {
        method: "POST",
        body: JSON.stringify({ action: "logout" })
      });
    } catch (_) {}
    showLogin();
    showToast("تم تسجيل الخروج.");
  });

  function renderProducts() {
    if (!products.length) {
      adminProducts.innerHTML = `<div class="empty-state">
        <strong>لا توجد منتجات حتى الآن</strong>
        أضيفي أول منتج من النموذج.
      </div>`;
      return;
    }

    adminProducts.innerHTML = products.map(product => `
      <div class="admin-product-row">
        <div>
          <strong>${escapeHTML(product.name)}</strong>
          <small>${escapeHTML(product.category || "عبايات")} · ${escapeHTML(product.price)} ر.ي · ${product.active ? "ظاهر في المتجر" : "مخفي"}</small>
        </div>
        <div class="admin-actions">
          <button class="small-button" type="button" data-edit="${escapeHTML(product.id)}">تعديل</button>
          <button class="small-button danger" type="button" data-delete="${escapeHTML(product.id)}">حذف</button>
        </div>
      </div>
    `).join("");
  }

  async function loadProducts() {
    adminProducts.innerHTML = `<div class="loading-state">جارٍ تحميل المنتجات...</div>`;
    try {
      const result = await api("/api/admin-products");
      products = Array.isArray(result.products) ? result.products : [];
      renderProducts();
    } catch (error) {
      adminProducts.innerHTML = `<div class="empty-state">${escapeHTML(error.message)}</div>`;
    }
  }

  function resetForm() {
    productForm.reset();
    $("productId").value = "";
    $("productActive").checked = true;
    formTitle.textContent = "إضافة منتج جديد";
    saveButton.textContent = "حفظ المنتج";
    formMessage.textContent = "";
  }

  function editProduct(id) {
    const product = products.find(item => String(item.id) === String(id));
    if (!product) return;

    $("productId").value = product.id;
    $("productName").value = product.name || "";
    $("productCategory").value = product.category || "عبايات";
    $("productPrice").value = product.price ?? "";
    $("productImage").value = product.image || "";
    $("productBadge").value = product.badge || "";
    $("productDescription").value = product.description || "";
    $("productActive").checked = product.active !== false;

    formTitle.textContent = "تعديل المنتج";
    saveButton.textContent = "حفظ التعديلات";
    formMessage.textContent = "";
    productForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  adminProducts?.addEventListener("click", async event => {
    const editButton = event.target.closest("[data-edit]");
    const deleteButton = event.target.closest("[data-delete]");

    if (editButton) {
      editProduct(editButton.dataset.edit);
      return;
    }

    if (deleteButton) {
      const id = deleteButton.dataset.delete;
      if (!confirm("هل أنت متأكد من حذف هذا المنتج؟")) return;

      try {
        await api(`/api/admin-products/${encodeURIComponent(id)}`, {
          method: "DELETE"
        });
        products = products.filter(product => String(product.id) !== String(id));
        renderProducts();
        showToast("تم حذف المنتج.");
      } catch (error) {
        showToast(error.message);
      }
    }
  });

  productForm?.addEventListener("submit", async event => {
    event.preventDefault();
    formMessage.textContent = "";
    saveButton.disabled = true;

    const id = $("productId").value;
    const price = Number($("productPrice").value);

    if (!Number.isFinite(price) || price < 0) {
      formMessage.textContent = "أدخلي سعرًا صحيحًا.";
      saveButton.disabled = false;
      return;
    }

    const product = {
      name: $("productName").value.trim(),
      category: $("productCategory").value.trim(),
      price,
      image: $("productImage").value.trim(),
      badge: $("productBadge").value.trim(),
      description: $("productDescription").value.trim(),
      active: $("productActive").checked
    };

    try {
      const result = await api("/api/admin-products", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(id ? { ...product, id } : product)
      });

      products = result.products;
      renderProducts();
      resetForm();
      showToast(id ? "تم تحديث المنتج." : "تمت إضافة المنتج.");
    } catch (error) {
      formMessage.textContent = error.message;
    } finally {
      saveButton.disabled = false;
    }
  });

  $("resetForm")?.addEventListener("click", resetForm);
  checkSession();
})();
