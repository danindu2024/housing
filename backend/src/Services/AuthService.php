<?php
namespace App\Services;

use App\Config\App;

class AuthService {
    private static ?string $secret = null;

    private static function getSecret(): string {
        if (self::$secret === null) {
            $secret = App::get('JWT_SECRET');
            if (empty($secret) || strlen($secret) < 32) {
                // Never fall back to a default — a missing/short secret is a misconfiguration
                throw new \RuntimeException(
                    'JWT_SECRET is not configured or is too short. ' .
                    'Set a secure random value (min 32 chars) in your .env file.'
                );
            }
            self::$secret = $secret;
        }
        return self::$secret;
    }

    // Base64URL encoding: replaces + with -, / with _, and strips = padding.
    // Required by the JWT specification (RFC 7519).
    private static function base64UrlEncode(string $data): string {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    // Base64URL decoding: reverses the URL-safe substitutions before decoding.
    private static function base64UrlDecode(string $data): string {
        return base64_decode(strtr($data, '-_', '+/'));
    }

    public static function generateToken(array $payload): string {
        $secret = self::getSecret();

        $header         = self::base64UrlEncode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
        $payload['iat'] = time();
        $payload['exp'] = time() + 86400; // Token valid for 24 hours
        $payloadEncoded = self::base64UrlEncode(json_encode($payload));

        $signature = hash_hmac('sha256', "$header.$payloadEncoded", $secret, true);
        $signatureEncoded = self::base64UrlEncode($signature);

        return "$header.$payloadEncoded.$signatureEncoded";
    }

    public static function verifyToken(string $token): ?array {
        $secret = self::getSecret();
        $parts  = explode('.', $token);

        if (count($parts) !== 3) {
            return null;
        }

        [$header, $payloadEncoded, $signatureEncoded] = $parts;

        // Recompute expected signature using Base64URL encoding
        $expectedSignature        = hash_hmac('sha256', "$header.$payloadEncoded", $secret, true);
        $expectedSignatureEncoded = self::base64UrlEncode($expectedSignature);

        // Constant-time comparison prevents timing attacks
        if (!hash_equals($expectedSignatureEncoded, $signatureEncoded)) {
            return null;
        }

        $payload = json_decode(self::base64UrlDecode($payloadEncoded), true);

        if (!$payload || !isset($payload['exp']) || $payload['exp'] < time()) {
            return null; // Token expired or malformed
        }

        return $payload;
    }
}
