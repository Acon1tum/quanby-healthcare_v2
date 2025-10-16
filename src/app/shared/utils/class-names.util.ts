/**
 * Utility function to concatenate class names, similar to clsx or classnames
 * @param classes - Class names to concatenate
 * @returns Concatenated class string
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
