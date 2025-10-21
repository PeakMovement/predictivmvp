import React from "react";

type ButtonProps = {
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  className?: string;
  /**
   * Optional visual hint. We don’t style variants yet, but we accept the prop
   * so pages using `variant="outline"` compile without errors.
   */
  variant?: "default" | "outline" | "ghost" | "link";
  type?: "button" | "submit" | "reset";
};

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  disabled,
  className = "",
  variant = "default",
  type = "button",
}) => {
  // You can branch on variant for styles later if you like.
  const base = "px-4 py-2 rounded-lg bg-[#22c55e] text-white hover:opacity-90 disabled:opacity-50 transition";
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${className}`}>
      {children}
    </button>
  );
};

export default Button;
