
const { getStore, connectLambda } = require("@netlify/blobs");
const { response } = require("./lib");

const SHOWCASE_STORE = "khial-showcase";
const SHOWCASE_KEY = "showcase";

exports.handler = async event => {
  connectLambda(event);

  if (event.httpMethod !== "GET") {
    return response(405, {
      success: false,
      error: "Method not allowed"
    });
  }

  try {
    const store = getStore(SHOWCASE_STORE);
    const saved = await store.get(SHOWCASE_KEY, {
      type: "json"
    });

    const images = Array.isArray(saved) ? saved : [];

    const visibleImages = images
      .filter(item => item && item.active !== false && item.image)
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

    return response(200, {
      success: true,
      images: visibleImages
    });
  } catch (error) {
    console.error("Showcase loading failed:", error);

    return response(500, {
      success: false,
      error: "تعذر تحميل معرض الصور حاليًا."
    });
  }
};
