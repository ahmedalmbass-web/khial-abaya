const {
  connectLambda,
  response,
  methodNotAllowed,
  getStoreProducts
} = require("./lib");

exports.handler = async event => {
  connectLambda(event);
  
  if (event.httpMethod === "OPTIONS") {
    return response(204, {});
  }

  if (event.httpMethod !== "GET") {
    return methodNotAllowed(["GET", "OPTIONS"]);
  }

  try {
    const products = await getStoreProducts();
    const visibleProducts = products.filter(product => product.active !== false);

    return response(200, {
      products: visibleProducts,
      whatsappNumber: process.env.WHATSAPP_NUMBER || ""
    });
  } catch (error) {
    console.error("Public products error:", error);
    return response(500, { error: "تعذر تحميل المنتجات." });
  }
};
