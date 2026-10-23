
const {
  connectLambda,
  response,
  methodNotAllowed,
  requireAdmin,
  getStoreProducts,
  saveStoreProducts
} = require("./lib");

exports.handler = async event => {
  connectLambda(event);

  const authError = requireAdmin(event);
  if (authError) return authError;

  if (event.httpMethod !== "DELETE") {
    return methodNotAllowed(["DELETE"]);
  }

  const params = event.queryStringParameters || {};
  let id = params.id || "";

  if (!id) {
    const match = (event.path || "").match(
      /\/api\/admin-products\/([^/]+)\/?$/
    );

    if (match) {
      try {
        id = decodeURIComponent(match[1]);
      } catch (_) {
        return response(400, { error: "معرّف المنتج غير صحيح." });
      }
    }
  }

  if (!id) {
    return response(400, { error: "معرّف المنتج مطلوب." });
  }

  try {
    const products = await getStoreProducts();
    const filtered = products.filter(
      product => String(product.id) !== String(id)
    );

    if (filtered.length === products.length) {
      return response(404, { error: "المنتج غير موجود." });
    }

    await saveStoreProducts(filtered);

    return response(200, {
      success: true,
      products: filtered
    });
  } catch (error) {
    console.error("Delete product error:", error);
    return response(500, { error: "تعذر حذف المنتج." });
  }
};
