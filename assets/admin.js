
(() => {
  const $ = id => document.getElementById(id);
  const loginPanel = $("loginPanel");
  const dashboard = $("dashboard");
  if (!loginPanel || !dashboard) return;

  const loginForm = $("loginForm");
  const productForm = $("productForm");
  const fileInput = $("productFile");
  const imageInput = $("productImage");
  const previewBox = $("imagePreviewBox");
  const preview = $("imagePreview");
  const saveButton = $("saveProduct");
  let products = [];
  let toastTimer;

  const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  })[char]);

  function toast(message) {
    $("adminToast").textContent = message;
    $("adminToast").hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      $("adminToast").hidden = true;
    }, 3500);
  }

  async function api(path, options = {}) {
    const response = await fetch(path, {
      credentials: "same-origin",
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {})
      }
    });

    let data = {};
    try { data = await response.json(); } catch (_) {}

    if (!response.ok) {
      throw new Error(data.error || "تعذر إكمال العملية.");
    }
    return data;
  }

  function showLogin() {
    loginPanel.hidden = false;
    dashboard.hidden = true;
  }

  function showDashboard() {
    loginPanel.hidden = true;
    dashboard.hidden = false;
    loadProducts();
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

  loginForm.addEventListener("submit", async event => {
    event.preventDefault();
    $("loginMessage").textContent = "";

    try {
      await api("/api/auth", {
        method: "POST",
        body: JSON.stringify({
          action: "login",
          password: $("adminPassword").value
        })
      });
      loginForm.reset();
      showDashboard();
    } catch (error) {
      $("loginMessage").textContent = error.message;
    }
  });

  $("logoutButton").addEventListener("click", async () => {
    try {
      await api("/api/auth", {
        method: "POST",
        body: JSON.stringify({ action: "logout" })
      });
    } catch (_) {}
    showLogin();
    toast("تم تسجيل الخروج.");
  });

  function previewFile(file) {
    if (!file) {
      previewBox.hidden = true;
      preview.removeAttribute("src");
      return;
    }

    preview.src = URL.createObjectURL(file);
    previewBox.hidden = false;
  }

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];

    if (!file) {
      previewFile(null);
      return;
    }

    const allowed = ["image/jpeg", "image/png", "image/webp"];

    if (!allowed.includes(file.type)) {
      fileInput.value = "";
      previewFile(null);
      toast("اختاري صورة JPG أو PNG أو WebP.");
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      fileInput.value = "";
      previewFile(null);
      toast("حجم الصورة أكبر من 3 ميجابايت.");
      return;
    }

    previewFile(file);
  });

  $("removeImage").addEventListener("click", () => {
    fileInput.value = "";
    previewFile(null);
  });

  async function uploadImage(file) {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || "");
        const comma = result.indexOf(",");
        if (comma < 0) return reject(new Error("تعذر قراءة الصورة."));
        resolve(result.slice(comma + 1));
      };
      reader.onerror = () => reject(new Error("تعذر قراءة الصورة."));
      reader.readAsDataURL(file);
    });

    const result = await api("/api/upload-image", {
      method: "POST",
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
        data: base64
      })
    });

    return result.url;
  }

  function renderProducts() {
    const list = $("adminProducts");

    if (!products.length) {
      list.innerHTML = `<div class="empty-state">
        <strong>لا توجد منتجات</strong>
        أضيفي أول عباية من النموذج أعلاه.
      </div>`;
      return;
    }

    list.innerHTML = products.map(product => `
      <div class="admin-product-row">
        <div>
          <strong>${escapeHTML(product.name)}</strong>
          <small>${escapeHTML(product.category)} · ${
            escapeHTML(product.price)
          } ر.ي · ${product.active ? "ظاهر" : "مخفي"}</small>
        </div>
        <div class="admin-actions">
          <button class="small-button" type="button"
                  data-edit="${escapeHTML(product.id)}">تعديل</button>
          <button class="small-button danger" type="button"
                  data-delete="${escapeHTML(product.id)}">حذف</button>
        </div>
      </div>
    `).join("");
  }

  async function loadProducts() {
    $("adminProducts").innerHTML =
      `<p class="loading-state">جارٍ تحميل المنتجات...</p>`;

    try {
      const result = await api("/api/admin-products");
      products = Array.isArray(result.products) ? result.products : [];
      renderProducts();
    } catch (error) {
      $("adminProducts").textContent = error.message;
    }
  }

  function resetForm() {
    productForm.reset();
    $("productId").value = "";
    $("productActive").checked = true;
    $("formTitle").textContent = "إضافة عباية جديدة";
    saveButton.textContent = "حفظ المنتج";
    $("formMessage").textContent = "";
    fileInput.value = "";
    previewFile(null);
  }

  function editProduct(id) {
    const product = products.find(item => String(item.id) === String(id));
    if (!product) return;

    $("productId").value = product.id;
    $("productName").value = product.name || "";
    $("productCategory").value = product.category || "";
    $("productPrice").value = product.price ?? "";
    $("productBadge").value = product.badge || "";
    $("productDescription").value = product.description || "";
    $("productActive").checked = product.active !== false;
    imageInput.value = product.image || "";
    fileInput.value = "";
    previewFile(null);

    $("formTitle").textContent = "تعديل المنتج";
    saveButton.textContent = "حفظ التعديلات";
    $("formMessage").textContent = "";
    productForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  $("adminProducts").addEventListener("click", async event => {
    const edit = event.target.closest("[data-edit]");
    const remove = event.target.closest("[data-delete]");

    if (edit) {
      editProduct(edit.dataset.edit);
      return;
    }

    if (remove) {
      const id = remove.dataset.delete;
      if (!confirm("هل تريد حذف هذا المنتج؟")) return;

      try {
        const result = await api(
          `/api/admin-products/${encodeURIComponent(id)}`,
          { method: "DELETE" }
        );
        products = Array.isArray(result.products)
          ? result.products
          : products.filter(p => String(p.id) !== String(id));
        renderProducts();
        toast("تم حذف المنتج.");
      } catch (error) {
        toast(error.message);
      }
    }
  });

  productForm.addEventListener("submit", async event => {
    event.preventDefault();
    $("formMessage").textContent = "";
    saveButton.disabled = true;

    try {
      const id = $("productId").value;
      let image = imageInput.value.trim();
      const file = fileInput.files[0];

      if (file) {
        saveButton.textContent = "جارٍ رفع الصورة...";
        image = await uploadImage(file);
      }

      const price = Number($("productPrice").value);
      if (!Number.isFinite(price) || price < 0) {
        throw new Error("أدخلي سعرًا صحيحًا.");
      }

      const product = {
        name: $("productName").value.trim(),
        category: $("productCategory").value.trim(),
        price,
        image,
        badge: $("productBadge").value.trim(),
        description: $("productDescription").value.trim(),
        active: $("productActive").checked
      };

      saveButton.textContent = "جارٍ حفظ المنتج...";

      const result = await api("/api/admin-products", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(id ? { ...product, id } : product)
      });

      products = result.products;
      renderProducts();
      resetForm();
      toast("تم حفظ المنتج بنجاح.");
    } catch (error) {
      $("formMessage").textContent = error.message;
    } finally {
      saveButton.disabled = false;
      if ($("productId").value) {
        saveButton.textContent = "حفظ التعديلات";
      } else {
        saveButton.textContent = "حفظ المنتج";
      }
    }
  });

  $("resetForm").addEventListener("click", resetForm);

  checkSession();
})();
