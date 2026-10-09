/** Button.tsx 带 'use client'，从服务端拿它的 buttonVariants 会取到 client reference，运行期才抛错（next build 不报）。
 *  本文件无 React 依赖与指令，是共享模块；需要服务端调用的 cva 工厂都照这样与组件本体分离 */
import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-[transform,background-color,border-color,box-shadow,color] duration-200 ease-dec select-none disabled:cursor-not-allowed disabled:opacity-55 disabled:translate-y-0',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-[#f7f6f2] hover:bg-primary-dark hover:-translate-y-0.5 shadow-soft',
        light: 'bg-[#fffefa] text-primary hover:-translate-y-0.5 shadow-lift',
        outline: 'border border-line bg-transparent text-ink hover:border-primary hover:text-primary',
        ghost: 'bg-transparent text-muted hover:text-primary hover:bg-sage/60',
        danger: 'bg-danger text-[#fff7f2] hover:brightness-95',
        console: 'bg-bg-soft text-ink border border-line hover:border-primary/45 hover:bg-surface',
      },
      size: {
        sm: 'h-8 px-3 text-[12.5px]',
        md: 'h-11 px-5 text-[14px]',
        lg: 'h-[52px] px-7 text-[15px]',
        icon: 'h-9 w-9 p-0',
      },
      block: { true: 'w-full', false: '' },
    },
    defaultVariants: { variant: 'primary', size: 'md', block: false },
  },
);
