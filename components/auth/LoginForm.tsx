'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { loginSchema, type LoginInput } from '@/lib/zod/auth.schema';
import { validateSoft } from '@/lib/zod/validate-shared';
import { resolveSafeRedirect } from '@/lib/auth/permissions';
import { tokenStorage } from '@/lib/auth/token-store';
import { ROUTES } from '@/constants/app';

import { Button } from '@/components/ui/Button';
import { Field, Input, PasswordField, Checkbox } from '@/components/ui';
import { Callout } from '@/components/ui/Callout';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useAuth();
  const toast = useToast();

  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [capsLock, setCapsLock] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ account?: string; password?: string }>({});
  const [shakeField, setShakeField] = useState<'account' | 'password' | null>(null);

  useEffect(() => {
    const remembered = tokenStorage.getRememberedAccount();
    if (remembered) setAccount(remembered);
  }, []);

  const handlePasswordKeyUp = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof event.getModifierState === 'function') {
      setCapsLock(event.getModifierState('CapsLock'));
    }
  };

  const handlePasswordBlur = () => setCapsLock(false);

  const validate = (): boolean => {
    const result = validateSoft(loginSchema, { account, password, remember });
    if (!result.ok) {
      const fieldErrors: { account?: string; password?: string } = {};
      for (const issue of result.issues) {
        if (issue.field === 'account' && !fieldErrors.account) fieldErrors.account = issue.message;
        if (issue.field === 'password' && !fieldErrors.password) fieldErrors.password = issue.message;
      }
      setErrors(fieldErrors);

      if (fieldErrors.account) {
        setShakeField('account');
        setTimeout(() => setShakeField(null), 420);
      } else if (fieldErrors.password) {
        setShakeField('password');
        setTimeout(() => setShakeField(null), 420);
      }
      return false;
    }
    setErrors({});
    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const input: LoginInput = { account, password, remember };
      await signIn(input);

      const redirect = searchParams.get('redirect');
      const target = resolveSafeRedirect(redirect, ROUTES.admin);
      toast.success('登录成功', '正在跳转…');
      setTimeout(() => {
        router.replace(target);
        router.refresh();
      }, 600);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '登录失败，请重试';
      toast.error('登录失败', message);

      if (error && typeof error === 'object' && 'issues' in error) {
        const issues = (error as { issues?: Array<{ field: string; message: string }> }).issues;
        if (issues) {
          const fieldErrors: { account?: string; password?: string } = {};
          for (const issue of issues) {
            if (issue.field === 'account' && !fieldErrors.account) fieldErrors.account = issue.message;
            if (issue.field === 'password' && !fieldErrors.password) fieldErrors.password = issue.message;
          }
          setErrors(fieldErrors);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate autoComplete="on" className="flex flex-col gap-4">
      <h1 className="mb-2.5 text-[clamp(26px,3vw,31px)] font-medium leading-[1.2] tracking-[-0.05em] text-ink">
        管理员登录
      </h1>
      <p className="mb-[26px] text-[12.5px] leading-[1.85] text-muted">
        登录控制台以管理密钥、配额与接口状态。普通接口调用无需登录。
      </p>

      <div className={shakeField === 'account' ? 'animate-shake' : ''}>
        <Field label="管理员账号" error={errors.account}>
          <Input
            type="text"
            placeholder="邮箱或用户名"
            autoComplete="username"
            inputMode="email"
            spellCheck={false}
            autoCapitalize="none"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            invalid={Boolean(errors.account)}
          />
        </Field>
      </div>

      <div className={shakeField === 'password' ? 'animate-shake' : ''}>
        <Field
          label="密码"
          error={errors.password}
          hint={capsLock ? '大写锁定（Caps Lock）已开启' : undefined}
        >
          <PasswordField
            placeholder="至少 8 位"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyUp={handlePasswordKeyUp}
            onBlur={handlePasswordBlur}
            invalid={Boolean(errors.password)}
          />
        </Field>
      </div>

      <div className="mt-0.5 mb-[22px] flex items-center justify-between gap-4">
        <Checkbox
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
          label="7 天内免登录"
        />
      </div>

      <Button type="submit" variant="primary" size="lg" block loading={submitting}>
        {submitting ? '正在验证…' : '登录'}
      </Button>

      <Callout tone="info" size="sm" className="mt-4">
        <p className="text-[11px] leading-[1.7]">
          <strong>演示账号：</strong>admin，口令见 <code className="font-mono">lib/server/mock/users.ts</code>（仅本地登录用）。
        </p>
      </Callout>
    </form>
  );
}
