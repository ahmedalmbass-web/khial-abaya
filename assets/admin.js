
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
  loadShowcase();
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
    $("productColors").value = Array.isArray(product.colors)
  ? product.colors.join("، ") : "";
$("productSizes").value = Array.isArray(product.sizes)
  ? product.sizes.join("، ") : "";
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
colors: $("productColors").value.split(/[,،\n]/)
  .map(value => value.trim()).filter(Boolean),
sizes: $("productSizes").value.split(/[,،\n]/)
  .map(value => value.trim()).filter(Boolean),
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

  
  // ===== KHIAL ADMIN SHOWCASE =====

  const showcaseForm = $("showcaseForm");
  const showcaseFile = $("showcaseImage");
  const showcaseList = $("adminShowcaseList");
  const showcaseMessage = $("showcaseMessage");
  const showcaseSaveButton = showcaseForm?.querySelector(
    'button[type="submit"]'
  );

  let showcaseImages = [];

  async function loadShowcase() {
    if (!showcaseList) return;

    showcaseList.textContent = "جارٍ تحميل صور المعرض...";

    try {
      const result = await api("/api/admin-showcase");
      showcaseImages = Array.isArray(result.images)
        ? result.images
        : [];

      renderShowcase();
    } catch (error) {
      showcaseList.textContent = error.message;
    }
  }

  function renderShowcase() {
    if (!showcaseList) return;

    const sorted = [...showcaseImages].sort(
      (a, b) => Number(a.order || 0) - Number(b.order || 0)
    );

    if (!sorted.length) {
      showcaseList.textContent = "لم تتم إضافة صور للمعرض بعد.";
      return;
    }

    showcaseList.innerHTML = sorted.map((item, index) => `
      <article class="admin-product-row admin-showcase-row">
        <img
          src="${escapeHTML(item.image)}"
          alt="${escapeHTML(item.title || "صورة المعرض")}"
          loading="lazy"
          style="width:80px;height:100px;object-fit:cover;border-radius:8px"
        >

        <div>
          <strong>${escapeHTML(item.title || "صورة بدون عنوان")}</strong>
          <small>
            ${item.active === false ? "مخفية" : "ظاهرة"} ·
            الترتيب: ${index + 1}
          </small>
          <small>${escapeHTML(item.description || "")}</small>

          <div class="admin-actions">
            <button class="small-button" type="button"
              data-showcase-up="${escapeHTML(item.id)}"
              ${index === 0 ? "disabled" : ""}>للأعلى ↑</button>

            <button class="small-button" type="button"
              data-showcase-down="${escapeHTML(item.id)}"
              ${index === sorted.length - 1 ? "disabled" : ""}>للأسفل ↓</button>

            <button class="small-button" type="button"
              data-showcase-toggle="${escapeHTML(item.id)}">
              ${item.active === false ? "إظهار" : "إخفاء"}
            </button>

            <button class="small-button danger" type="button"
              data-showcase-delete="${escapeHTML(item.id)}">حذف</button>
          </div>
        </div>
      </article>
    `).join("");
  }

  async function updateShowcaseItem(id, changes) {
    await api(`/api/admin-showcase?id=${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(changes)
    });

    await loadShowcase();
  }

  showcaseForm?.addEventListener("submit", async event => {
    event.preventDefault();

    if (showcaseMessage) showcaseMessage.textContent = "";

    const file = showcaseFile?.files?.[0];

    if (!file) {
      if (showcaseMessage) {
        showcaseMessage.textContent = "اختاري صورة أولًا.";
      }
      return;
    }

    const allowed = ["image/jpeg", "image/png", "image/webp"];

    if (!allowed.includes(file.type)) {
      if (showcaseMessage) {
        showcaseMessage.textContent = "اختاري صورة JPG أو PNG أو WebP.";
      }
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      if (showcaseMessage) {
        showcaseMessage.textContent = "حجم الصورة يجب ألا يتجاوز 3 ميجابايت.";
      }
      return;
    }

    if (showcaseSaveButton) showcaseSaveButton.disabled = true;

    try {
      if (showcaseMessage) {
        showcaseMessage.textContent = "جارٍ رفع الصورة...";
      }

      const image = await uploadImage(file);

      await api("/api/admin-showcase", {
        method: "POST",
        body: JSON.stringify({
          image,
          title: $("showcaseTitle")?.value.trim() || "",
          description: $("showcaseDescription")?.value.trim() || "",
          active: true
        })
      });

      showcaseForm.reset();

      if (showcaseMessage) {
        showcaseMessage.textContent = "تمت إضافة الصورة إلى المعرض.";
      }

      await loadShowcase();
    } catch (error) {
      if (showcaseMessage) {
        showcaseMessage.textContent = error.message;
      }
    } finally {
      if (showcaseSaveButton) showcaseSaveButton.disabled = false;
    }
  });

  showcaseList?.addEventListener("click", async event => {
    const button = event.target.closest("button");
    if (!button) return;

    const id =
      button.dataset.showcaseUp ||
      button.dataset.showcaseDown ||
      button.dataset.showcaseToggle ||
      button.dataset.showcaseDelete;

    if (!id) return;

    const sorted = [...showcaseImages].sort(
      (a, b) => Number(a.order || 0) - Number(b.order || 0)
    );

    const index = sorted.findIndex(item => String(item.id) === String(id));
    if (index < 0) return;

    button.disabled = true;

    try {
      if (button.dataset.showcaseDelete) {
        if (!confirm("هل تريد حذف الصورة من المعرض؟")) return;

        await api(`/api/admin-showcase?id=${encodeURIComponent(id)}`, {
          method: "DELETE"
        });

        toast("تم حذف الصورة من المعرض.");
        await loadShowcase();
        return;
      }

      if (button.dataset.showcaseToggle) {
        const item = sorted[index];

        await updateShowcaseItem(id, {
          active: item.active === false
        });

        toast("تم تحديث ظهور الصورة.");
        return;
      }

      
      const otherIndex = button.dataset.showcaseUp
        ? index - 1
        : index + 1;

      if (otherIndex < 0 || otherIndex >= sorted.length) return;

      const current = sorted[index];
      const other = sorted[otherIndex];

      await api(
        `/api/admin-showcase?id=${encodeURIComponent(current.id)}`,
        {
          method: "PUT",
          body: JSON.stringify({
            swapWith: other.id
          })
        }
      );

      await loadShowcase();

    } catch (error) {
      toast(error.message);
    } finally {
      button.disabled = false;
    }
  });


  checkSession();
})();
