import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { username, password } = await request.json();

  const validUsername = process.env.EMPLOYEE_USERNAME;
  const validPassword = process.env.EMPLOYEE_PASSWORD;

  if (username === validUsername && password === validPassword) {
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: false }, { status: 401 });
}
