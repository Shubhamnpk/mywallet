import { NextResponse } from "next/server"

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UPSTREAM_ERROR"
  | "UPSTREAM_UNREACHABLE"
  | "INTERNAL_ERROR"

type ErrorResponseOptions = {
  status: number
  code: ApiErrorCode
  message: string
  requestId?: string
}

export function errorResponse(options: ErrorResponseOptions) {
  const { status, code, message, requestId } = options
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(requestId ? { requestId } : {}),
      },
    },
    { status }
  )
}

export function getRequestId(request: Request): string {
  const fromHeader = request.headers.get("x-request-id")
  if (fromHeader) return fromHeader
  return crypto.randomUUID()
}
