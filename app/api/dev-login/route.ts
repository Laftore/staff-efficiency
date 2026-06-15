import { NextResponse } from "next/server";

const DEMO_NAMES: Record<string, string> = {
  OWNER: "Андрей Владимиров",
  SENIOR_ADMIN: "Светлана Петрова",
  ADMIN: "Алексей Морозов",
};

export async function POST(request: Request) {
  if (
    process.env.E2E_AUTH_MOCK !== "1" ||
    process.env.NODE_ENV === "production"
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const form = await request.formData();
  const role = String(form.get("role") ?? "OWNER");
  const branchId = form.get("branchId");

  const response = NextResponse.redirect(new URL("/", request.url));

  response.cookies.set("e2e-test-role", role, {
    path: "/",
    sameSite: "lax",
  });

  if (branchId && typeof branchId === "string") {
    response.cookies.set("e2e-test-branch-id", branchId, {
      path: "/",
      sameSite: "lax",
    });
  } else {
    response.cookies.delete("e2e-test-branch-id");
  }

  response.cookies.set("e2e-test-display-name", DEMO_NAMES[role] ?? "Демо-пользователь", {
    path: "/",
    sameSite: "lax",
  });

  return response;
}