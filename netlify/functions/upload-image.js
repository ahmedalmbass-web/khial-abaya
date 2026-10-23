
const crypto = require("node:crypto");
const { getStore } = require("@netlify/blobs");
const { response, requireAdmin, parseBody } = require("./lib");

const IMAGE_STORE = "khial-images";
const MAX_SIZE = 3 * 1024 * 1024;

function validImage(buffer, type) {
  if (type === "image/jpeg") {
    return buffer.length >= 3 &&
      buffer[0] === 0xff && buffer[1] === 0xd8 &&
      buffer[2] === 0xff;
  }

  if (type === "image/png") {
    return buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
      );
  }

  if (type === "image/webp") {
    return buffer.length >= 12 &&
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP";
  }

  return false;
}

exports.handler = async event => {
  const authError = requireAdmin(event);
  if (authError) return authError;

  if (event.httpMethod !== "POST") {
    return response(405, { error: "طريقة الطلب غير مسموحة." }, {
      Allow: "POST"
    });
  }

  const body = parseBody(event);
  if (!body || typeof body.data !== "string") {
    return response(400, { error: "بيانات الصورة غير صحيحة." });
  }

  if (body.data.length > 4_200_000) {
    return response(413, { error: "حجم الصورة أكبر من الحد المسموح." });
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(body.contentType)) {
    return response(400, { error: "نوع الصورة غير مدعوم." });
  }

  const base64Pattern =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

if (
  body.data.length === 0 ||
  body.data.length % 4 !== 0 ||
  !base64Pattern.test(body.data)
) {
  return response(400, { error: "ترميز الصورة غير صالح." });
}

const bytes = Buffer.from(body.data, "base64");

  if (
    bytes.length === 0 ||
    bytes.length > MAX_SIZE ||
    !validImage(bytes, body.contentType)
  ) {
    return response(400, {
      error: "الصورة غير صالحة أو أكبر من 3 ميجابايت."
    });
  }

  try {
    const id = `img_${crypto.randomUUID()}`;
    const store = getStore(IMAGE_STORE);
    const arrayBuffer = Uint8Array.from(bytes).buffer;

    await store.set(id, arrayBuffer, {
      metadata: { contentType: body.contentType },
      onlyIfNew: true
    });

    return response(201, {
      success: true,
      id,
      url: `/api/image?id=${encodeURIComponent(id)}`
    });
  } catch (error) {
    console.error("Image upload failed:", error);
    return response(500, {
      error: "تعذر حفظ الصورة. حاولي مرة أخرى."
    });
  }
};
