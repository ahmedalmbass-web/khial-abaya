const {
  response,
  methodNotAllowed,
  parseBody,
  makeSessionCookie,
  clearSessionCookie,
  isAuthenticated,
  safeEqual
} = require("./lib");

exports.handler = async event => {
  if (event.httpMethod === "GET") {
    return response(200, {
      authenticated: isAuthenticated(event)
    });
  }

  if (event.httpMethod !== "POST") {
    return methodNotAllowed(["GET", "POST"]);
  }

  const body = parseBody(event);
  if (!body) {
    return response(400, { error: "البيانات المرسلة غير صحيحة." });
  }

  if (body.action === "logout") {
    return response(200, { success: true }, {
      "Set-Cookie": clearSessionCookie()
    });
  }

  if (body.action !== "login") {
    return response(400, { error: "العملية غير معروفة." });
  }

  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedPassword) {
    return response(500, { error: "لم تُضبط كلمة مرور لوحة الإدارة في Netlify." });
  }

  if (typeof body.password !== "string"
    || !safeEqual(body.password, expectedPassword)) {
    return response(401, { error: "كلمة المرور غير صحيحة." });
  }

  try {
    const cookie = makeSessionCookie(event);
    return response(200, { success: true }, {
      "Set-Cookie": cookie
    });
  } catch (error) {
    console.error("Admin session error:", error);
    return response(500, { error: "إعدادات الجلسة غير مكتملة في Netlify." });
  }
};
