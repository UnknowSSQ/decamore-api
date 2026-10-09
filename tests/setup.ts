/** 测试进程不加载 .env.local，这里补齐 loadEnv 的必填项，免得每个用例各自设 */
process.env.JWT_SECRET ??= 'test-only-secret-0123456789abcdef-ghijklmn';
process.env.RATE_LIMIT_PER_MIN ??= '120';

export {};
