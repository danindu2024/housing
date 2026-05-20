<?php
namespace App\Config;

class App {
    private static array $env = [];

    public static function loadEnv(string $path): void {
        if (file_exists($path)) {
            $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                if (strpos(trim($line), '#') === 0) continue;
                list($name, $value) = explode('=', $line, 2);
                self::$env[trim($name)] = trim($value);
            }
        }
    }

    public static function get(string $key, $default = null) {
        return self::$env[$key] ?? $_ENV[$key] ?? $_SERVER[$key] ?? $default;
    }
}
