import { OAuth2Client } from 'google-auth-library';
import { env } from '../../config/env';
import { AppError } from '../../utils/app-error';

/**
 * Google OAuth client.
 * Lazily constructed so the module can be imported even when GOOGLE_CLIENT_ID
 * is not yet configured (the dev server still starts).
 */
let client: OAuth2Client | null = null;

function getClient(): OAuth2Client {
  if (!env.GOOGLE_CLIENT_ID) {
    throw new AppError(
      'Google OAuth chưa được cấu hình trên server (thiếu GOOGLE_CLIENT_ID)',
      500,
      'GOOGLE_OAUTH_NOT_CONFIGURED',
    );
  }
  if (!client) {
    client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
  }
  return client;
}

export interface GoogleProfile {
  googleId: string;
  email: string;
  emailVerified: boolean;
  fullName: string;
  avatarUrl: string | null;
}

/**
 * Verify a Google ID token from the client (Google Identity Services / gsi).
 *
 * The client obtains the token via `google.accounts.id.initialize` +
 * `google.accounts.id.prompt`, then POSTs the credential (a JWT) here.
 * We verify the signature against Google's public keys and extract claims.
 */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
  try {
    const ticket = await getClient().verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID!,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.sub || !payload.email) {
      throw new AppError(
        'Google ID token không hợp lệ (thiếu thông tin)',
        401,
        'INVALID_GOOGLE_TOKEN',
      );
    }

    return {
      googleId: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified ?? false,
      fullName: payload.name ?? payload.email.split('@')[0],
      avatarUrl: payload.picture ?? null,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      'Không thể xác minh Google ID token',
      401,
      'INVALID_GOOGLE_TOKEN',
    );
  }
}
