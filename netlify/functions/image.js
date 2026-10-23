
const { getStore, connectLambda } = require("@netlify/blobs");
exports.handler = async event => {
  connectLambda(event);
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: { Allow: "GET" },
      body: "Method not allowed"
    };
  }

  const id = event.queryStringParameters?.id || "";

  if (!/^img_[a-f0-9-]{36}$/i.test(id)) {
    return {
      statusCode: 400,
      headers: { "Cache-Control": "no-store" },
      body: "Invalid image ID"
    };
  }

  try {
    const store = getStore("khial-images");
    const item = await store.getWithMetadata(id, {
      type: "arrayBuffer",
      consistency: "strong"
    });

    if (!item || !item.data) {
      return {
        statusCode: 404,
        headers: { "Cache-Control": "no-store" },
        body: "Image not found"
      };
    }

    const type = item.metadata?.contentType;
    const allowed = ["image/jpeg", "image/png", "image/webp"];

    if (!allowed.includes(type)) {
      return {
        statusCode: 415,
        headers: { "Cache-Control": "no-store" },
        body: "Unsupported image"
      };
    }

    return {
      statusCode: 200,
      isBase64Encoded: true,
      headers: {
        "Content-Type": type,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=31536000, immutable"
      },
      body: Buffer.from(item.data).toString("base64")
    };
  } catch (error) {
    console.error("Image retrieval failed:", error);
    return {
      statusCode: 500,
      headers: { "Cache-Control": "no-store" },
      body: "Unable to load image"
    };
  }
};
