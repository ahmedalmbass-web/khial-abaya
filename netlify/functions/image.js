
const { getStore, connectLambda } = require("@netlify/blobs");

function response(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: {
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
      ...headers
    },
    body
  };
}

exports.handler = async event => {
  connectLambda(event);

  if (event.httpMethod !== "GET") {
    return response(405, "Method not allowed", {
      Allow: "GET"
    });
  }

  const id = event.queryStringParameters?.id || "";

  if (!/^img_[a-f0-9-]{36}$/i.test(id)) {
    return response(400, "Invalid image ID");
  }

  try {
    const store = getStore("khial-images");
    const item = await store.getWithMetadata(id, {
      type: "arrayBuffer"
    });

    if (!item || !item.data || item.data.byteLength === 0) {
      return response(404, "Image not found");
    }

    const type = item.metadata?.contentType;
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    if (!allowed.includes(type)) {
      return response(415, "Unsupported image");
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
    return response(500, "Unable to load image");
  }
};
