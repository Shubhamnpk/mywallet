import { NextResponse } from "next/server"

export const runtime = "nodejs"

const DROPBOX_TOKEN_ENDPOINT = "https://api.dropboxapi.com/oauth2/token"

type AuthorizationCodeRequest = {
  grantType: "authorization_code"
  code: string
  redirectUri: string
  codeVerifier: string
}

type RefreshTokenRequest = {
  grantType: "refresh_token"
  refreshToken: string
}

type TokenRequestBody = AuthorizationCodeRequest | RefreshTokenRequest

function getDropboxClientId(): string {
  return process.env.DROPBOX_APP_KEY ?? process.env.NEXT_PUBLIC_DROPBOX_APP_KEY ?? ""
}

export async function POST(request: Request) {
  const clientId = getDropboxClientId()
  if (!clientId) {
    return NextResponse.json({ error: "Dropbox app key is not configured." }, { status: 500 })
  }

  const body = (await request.json().catch(() => null)) as TokenRequestBody | null
  if (!body?.grantType) {
    return NextResponse.json({ error: "Invalid Dropbox token request." }, { status: 400 })
  }

  const params = new URLSearchParams({
    client_id: clientId,
    grant_type: body.grantType,
  })

  if (body.grantType === "authorization_code") {
    if (!body.code || !body.redirectUri || !body.codeVerifier) {
      return NextResponse.json({ error: "Missing Dropbox authorization code parameters." }, { status: 400 })
    }

    params.set("code", body.code)
    params.set("redirect_uri", body.redirectUri)
    params.set("code_verifier", body.codeVerifier)
  } else if (body.grantType === "refresh_token") {
    if (!body.refreshToken) {
      return NextResponse.json({ error: "Missing Dropbox refresh token." }, { status: 400 })
    }

    params.set("refresh_token", body.refreshToken)
  } else {
    return NextResponse.json({ error: "Unsupported Dropbox grant type." }, { status: 400 })
  }

  const response = await fetch(DROPBOX_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
    cache: "no-store",
  })

  const text = await response.text().catch(() => "")
  if (!response.ok) {
    return new NextResponse(text || "Dropbox token request failed.", {
      status: response.status,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    })
  }

  return new NextResponse(text, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  })
}
