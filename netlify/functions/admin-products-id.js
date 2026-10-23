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

  const id = event.queryStringParameters?.id;
  if (!id) {
    return response(400, { error: "معرّف المنتج مطلوب." });
  }

  try {
    const products = await getStoreProducts();
    const filtered = products.filter(product => product.id !== id);

    if (filtered.length === products.length) {
      return response(404, { error: "المنتج غير موجود." });
    }

    await saveStoreProducts(filtered);
    return response(200, { success: true, products: filtered });
  } catch (error) {
    console.error("Delete product error:", error);
    return response(500, { error: "تعذر حذف المنتج." });
  }
};
