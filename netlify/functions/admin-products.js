const crypto = require("node:crypto");

const {
  response,
  methodNotAllowed,
  parseBody,
  requireAdmin,
  validateProduct,
  getStoreProducts,
  saveStoreProducts
} = require("./lib");

exports.handler = async event => {
  const authError = requireAdmin(event);
  if (authError) return authError;

  if (event.httpMethod === "GET") {
    try {
      return response(200, { products: await getStoreProducts() });
    } catch (error) {
      console.error("Admin product list error:", error);
      return response(500, { error: "تعذر تحميل قائمة المنتجات." });
    }
  }

  if (!["POST", "PUT"].includes(event.httpMethod)) {
    return methodNotAllowed(["GET", "POST", "PUT"]);
  }

  const body = parseBody(event);
  if (!body) {
    return response(400, { error: "البيانات المرسلة غير صحيحة." });
  }

  const partial = event.httpMethod === "PUT";
  const validationError = validateProduct(body, partial);
  if (validationError) return response(400, { error: validationError });

  try {
    let products = await getStoreProducts();

    if (event.httpMethod === "POST") {
      const product = {
        id: crypto.randomUUID(),
        name: body.name.trim(),
        category: body.category.trim(),
        price: Number(body.price),
        image: (body.image || "").trim(),
        badge: (body.badge || "").trim(),
        description: (body.description || "").trim(),
        colors: Array.isArray(body.colors) ? body.colors : [],
sizes: Array.isArray(body.sizes) ? body.sizes : [],
        active: body.active !== false
      };

      products.unshift(product);
    } else {
      if (typeof body.id !== "string" || !body.id.trim()) {
        return response(400, { error: "معرّف المنتج غير صحيح." });
      }

      const index = products.findIndex(item => item.id === body.id);
      if (index === -1) {
        return response(404, { error: "المنتج غير موجود." });
      }

      products[index] = {
        ...products[index],
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.category !== undefined ? { category: body.category.trim() } : {}),
        ...(body.price !== undefined ? { price: Number(body.price) } : {}),
        ...(body.image !== undefined ? { image: body.image.trim() } : {}),
        ...(body.badge !== undefined ? { badge: body.badge.trim() } : {}),
        ...(body.description !== undefined ? { description: body.description.trim() } : {}),
        ...(body.colors !== undefined ? { colors: body.colors } : {}),
...(body.sizes !== undefined ? { sizes: body.sizes } : {}),
        ...(body.active !== undefined ? { active: body.active } : {})
      };
    }

    await saveStoreProducts(products);
    return response(200, { success: true, products });
  } catch (error) {
    console.error("Save product error:", error);
    return response(500, { error: "تعذر حفظ المنتج. تحققي من إعدادات التخزين في Netlify." });
  }
};
