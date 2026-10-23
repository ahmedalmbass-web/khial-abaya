
const crypto = require("node:crypto");
const { getStore, connectLambda } = require("@netlify/blobs");
const {
  response,
  requireAdmin,
  parseBody
} = require("./lib");

const SHOWCASE_STORE = "khial-showcase";
const SHOWCASE_KEY = "showcase";

function validImagePath(value) {
  return (
    typeof value === "string" &&
    /^\/api\/image\?id=img_[a-f0-9-]{36}$/.test(value)
  );
}

function cleanText(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

async function readImages(store) {
  const saved = await store.get(SHOWCASE_KEY, {
    type: "json"
  });

  return Array.isArray(saved) ? saved : [];
}

async function saveImages(store, images) {
  await store.set(SHOWCASE_KEY, JSON.stringify(images));
}

exports.handler = async event => {
  connectLambda(event);

  const authError = requireAdmin(event);
  if (authError) return authError;

  const method = event.httpMethod;

  if (!["GET", "POST", "PUT", "DELETE"].includes(method)) {
    return response(405, {
      success: false,
      error: "Method not allowed"
    });
  }

  try {
    const store = getStore(SHOWCASE_STORE);
    const images = await readImages(store);

    if (method === "GET") {
      return response(200, {
        success: true,
        images: images.sort(
          (a, b) => Number(a.order || 0) - Number(b.order || 0)
        )
      });
    }

    if (method === "POST") {
      const body = parseBody(event);

      if (!validImagePath(body.image)) {
        return response(400, {
          success: false,
          error: "يرجى رفع صورة صحيحة أولًا."
        });
      }

      const item = {
        id: crypto.randomUUID(),
        image: body.image,
        title: cleanText(body.title, 100),
        description: cleanText(body.description, 250),
        active: body.active !== false,
        order: images.length,
        createdAt: new Date().toISOString()
      };

      images.push(item);
      await saveImages(store, images);

      return response(201, {
        success: true,
        image: item
      });
    }

    const body = parseBody(event);
    const id = cleanText(
      event.queryStringParameters?.id || body.id,
      80
    );

    if (!id) {
      return response(400, {
        success: false,
        error: "معرّف الصورة مطلوب."
      });
    }

    const index = images.findIndex(item => item.id === id);

    if (index === -1) {
      return response(404, {
        success: false,
        error: "الصورة غير موجودة."
      });
    }

    
    if (method === "PUT") {
      const body = parseBody(event);
      const item = images[index];

      // تبديل ترتيب صورتين في عملية حفظ واحدة
            if (body.swapWith !== undefined) {
        const otherId = cleanText(body.swapWith, 80);
        const other = images.find(
          image => image.id === otherId
        );

        if (!other || other.id === item.id) {
          return response(400, {
            success: false,
            error: "الصورة المطلوبة للتبديل غير صحيحة."
          });
        }

        const currentOrder = Number(item.order);
        const otherOrder = Number(other.order);

        if (
          !Number.isInteger(currentOrder) ||
          !Number.isInteger(otherOrder) ||
          currentOrder < 0 ||
          otherOrder < 0 ||
          currentOrder === otherOrder
        ) {
          return response(400, {
            success: false,
            error: "تعذر تبديل ترتيب الصورتين."
          });
        }

        item.order = otherOrder;
        other.order = currentOrder;

        await saveImages(store, images);

        return response(200, {
          success: true,
          images: [item, other]
        });
            }

      if (body.title !== undefined) {
        item.title = cleanText(body.title, 100);
      }

      if (body.description !== undefined) {
        item.description = cleanText(body.description, 250);
      }

      if (body.active !== undefined) {
        if (typeof body.active !== "boolean") {
          return response(400, {
            success: false,
            error: "قيمة حالة الصورة غير صحيحة."
          });
        }
        item.active = body.active;
      }

      if (body.order !== undefined) {
        const order = Number(body.order);

        if (!Number.isInteger(order) || order < 0 || order > 10000) {
          return response(400, {
            success: false,
            error: "ترتيب الصورة غير صحيح."
          });
        }

        item.order = order;
      }

      if (body.image !== undefined) {
        if (!validImagePath(body.image)) {
          return response(400, {
            success: false,
            error: "مسار الصورة غير صحيح."
          });
        }
        item.image = body.image;
      }

      await saveImages(store, images);

      return response(200, {
        success: true,
        image: item
      });
    }


    if (method === "DELETE") {
      images.splice(index, 1);

      images
        .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
        .forEach((item, position) => {
          item.order = position;
        });

      await saveImages(store, images);

      return response(200, {
        success: true,
        message: "تم حذف الصورة من المعرض."
      });
    }
  } catch (error) {
    console.error("Admin showcase error:", error);

    return response(500, {
      success: false,
      error: "تعذرت معالجة طلب المعرض حاليًا."
    });
  }
};
