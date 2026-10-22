const crypto = require("node:crypto");
const { getStore } = require("@netlify/blobs");

const STORE_NAME = "khial-products";
const PRODUCTS_KEY = "products";

const DEMO_PRODUCTS = [
  {
    id: "demo-101",
    name: "عباية كلاسيكية",
    category: "عبايات كلاسيكية",
    price: 0,
    image: "",
    badge: "عرض تجريبي",
    description: "تصميم تجريبي أنيق، يُستبدل ببيانات المنتج الحقيقية.",
    active: true
  },
  {
    id: "demo-102",
    name: "عباية بتفاصيل راقية",
    category: "عبايات عصرية",
    price: 0,
    image: "",
    badge: "عرض تجريبي",
    description: "نموذج تجريبي لعرض طريقة ظهور تفاصيل العباية.",
    active: true
  },
  {
    id: "demo-103",
    name: "عباية للمناسبات",
    category: "عبايات مناسبات",
    price: 0,
    image: "",
    badge: "عرض تجريبي",
    description: "مكان مخصص لصورة ووصف المنتج الفعلي.",
    active: true
  },
  {
    id: "demo-104",
    name: "عباية بتصميم هادئ",
    category: "عبايات عصرية",
    price: 0,
    image: "",
    badge: "عرض تجريبي",
    description: "مثال لتنسيق بطاقة المنتج داخل المتجر.",
    active: true
  }
];

function headers(extra = {}) {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    ...extra
  };
}

function response(statusCode, data, extraHeaders = {}) {
  return {
    statusCode,
    headers: headers(extraHeaders),
    body: JSON.stringify(data)
  };
}

function methodNotAllowed(allowed) {
  return response(405, { error: "طريقة الطلب غير مسموحة." }, {
    Allow: allowed.join(", ")
  });
}

function parseBody(event) {
  try {
    return JSON.parse(event.body || "{}");
  } catch (_) {
    return null;
  }
}

function getCookie(event, name) {
  const cookieHeader = event.headers?.cookie || event.headers?.Cookie || "";
  const entry = cookieHeader.split(";").map(v => v.trim())
    .find(v => v.startsWith(name + "="));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : "";
}

function sign(value, secret) {
  return crypto.createHmac("sha256", secret)
    .update(value)
    .digest("base64url");
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function makeSessionCookie(event) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("إعداد SESSION_SECRET غير مكتمل.");
  }

  const payload = Buffer.from(JSON.stringify({
    issuedAt: Date.now()
  })).toString("base64url");

  const token = `${payload}.${sign(payload, secret)}`;
  const secure = process.env.NODE_ENV === "development"
    ? ""
    : "; Secure";

  return `khial_admin=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${secure}`;
}

function clearSessionCookie() {
  const secure = process.env.NODE_ENV === "development" ? "" : "; Secure";
  return `khial_admin=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}

function isAuthenticated(event) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) return false;

  const token = getCookie(event, "khial_admin");
  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [payload, signature] = parts;
  if (!safeEqual(sign(payload, secret), signature)) return false;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    const age = Date.now() - Number(data.issuedAt);
    return Number.isFinite(age) && age >= 0 && age <= 8 * 60 * 60 * 1000;
  } catch (_) {
    return false;
  }
}

function requireAdmin(event) {
  if (!isAuthenticated(event)) {
    return response(401, { error: "انتهت الجلسة. سجّلي الدخول مرة أخرى." });
  }
  return null;
}

function validText(value, max = 500) {
  return typeof value === "string" && value.trim().length > 0
    && value.trim().length <= max;
}

function validateProduct(data, partial = false) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return "بيانات المنتج غير صحيحة.";
  }

  if (!partial || data.name !== undefined) {
    if (!validText(data.name, 120)) return "اسم المنتج مطلوب وبحد أقصى 120 حرفًا.";
  }

  if (!partial || data.category !== undefined) {
    if (!validText(data.category, 80)) return "التصنيف مطلوب وبحد أقصى 80 حرفًا.";
  }

  if (!partial || data.price !== undefined) {
    const price = Number(data.price);
    if (!Number.isFinite(price) || price < 0 || price > 1e12) {
      return "السعر غير صحيح.";
    }
  }

  for (const field of ["description", "badge"]) {
    if (data[field] !== undefined
      && (typeof data[field] !== "string" || data[field].length > 1000)) {
      return `حقل ${field} طويل جدًا أو غير صحيح.`;
    }
  }

  
if (data.image !== undefined) {
  if (
    typeof data.image !== "string" ||
    data.image.length > 2000
  ) {
    return "رابط الصورة غير صحيح.";
  }

  if (data.image) {
    const isHttpsUrl = /^https:\/\/\S+$/i.test(data.image);

    const isInternalImage =
      /^\/api\/image\?id=img_[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i
        .test(data.image);

    if (!isHttpsUrl && !isInternalImage) {
      return "يجب أن يكون رابط الصورة HTTPS أو مسار صورة داخليًا صالحًا.";
    }
  }
}


  if (data.active !== undefined && typeof data.active !== "boolean") {
    return "حالة ظهور المنتج غير صحيحة.";
  }

  return null;
}


async function getStoreProducts() {
  const store = getStore(STORE_NAME);
  const stored = await store.get(PRODUCTS_KEY, { type: "json" });

  if (Array.isArray(stored)) {
    const products = stored.filter(
      product => !String(product.id || "").startsWith("demo-")
    );

    if (products.length !== stored.length) {
      await store.setJSON(PRODUCTS_KEY, products);
    }

    return products;
  }

  await store.setJSON(PRODUCTS_KEY, []);
  return [];
}


async function saveStoreProducts(products) {
  const store = getStore(STORE_NAME);
  await store.setJSON(PRODUCTS_KEY, products);
}

module.exports = {
  response,
  methodNotAllowed,
  parseBody,
  makeSessionCookie,
  clearSessionCookie,
  isAuthenticated,
  requireAdmin,
  safeEqual,
  validateProduct,
  getStoreProducts,
  saveStoreProducts
};
