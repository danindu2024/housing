<?php
namespace App\Services;

use App\Config\App;

class AuthService {
    private static ?string $secret = null;

    private static function getSecret(): string {
        if (self::$secret === null) {
            self::$secret = App::get('JWT_SECRET', 'change_this_to_a_long_random_string_in_production');
        }
        return self::$secret;
    }

    public static function generateToken(array $payload): string {
        $secret = self::getSecret();
        
        $header = base64_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
        
        $payload['iat'] = time();
        $payload['exp'] = time() + 86400; // Token valid for 24 hours
        $payloadEncoded = base64_encode(json_encode($payload));
        
        $signature = hash_hmac('sha256', "$header.$payloadEncoded", $secret, true);
        $signatureEncoded = base64_encode($signature);
        
        return "$header.$payloadEncoded.$signatureEncoded";
    }

    public static function verifyToken(string $token): ?array {
        $secret = self::getSecret();
        $parts = explode('.', $token);
        
        if (count($parts) !== 3) {
            return null;
        }
        
        [$header, $payloadEncoded, $signatureEncoded] = $parts;
        
        $expectedSignature = hash_hmac('sha256', "$header.$payloadEncoded", $secret, true);
        $expectedSignatureEncoded = base64_encode($expectedSignature);
        
        if (!hash_equals($expectedSignatureEncoded, $signatureEncoded)) {
            return null;
        }
        
        $payload = json_decode(base64_decode($payloadEncoded), true);
        
        if (!$payload || !isset($payload['exp']) || $payload['exp'] < time()) {
            return null; // Token expired or invalid
        }
        
        return $payload;
    }
}
