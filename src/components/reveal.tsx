import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { useInView } from "@/lib/use-in-view";

type Props = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  stagger?: boolean;
  children: ReactNode;
};

export function Reveal({
  as: Tag = "div",
  stagger = false,
  className = "",
  children,
  ...rest
}: Props) {
  const [ref, inView] = useInView<HTMLElement>();
  const base = stagger ? "reveal-stagger" : "reveal";
  const cls = `${base}${inView ? " in" : ""}${className ? " " + className : ""}`;
  // Cast required because the ref type narrows differently per tag.
  const Component = Tag as ElementType;
  return (
    <Component ref={ref} className={cls} {...rest}>
      {children}
    </Component>
  );
}
