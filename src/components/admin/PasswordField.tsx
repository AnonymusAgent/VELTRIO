"use client";
import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
export default function PasswordField({ name, label, placeholder = "Enter your password", isNew = false }: { name: string; label?: string; placeholder?: string; isNew?: boolean }) {
  const [show, setShow] = useState(false);
  const id = useId();
  return <div>{label && <label htmlFor={id} className="vh-label">{label}</label>}<div className="password-input-wrap"><input id={id} className="vh-field" name={name} type={show ? "text" : "password"} placeholder={placeholder} autoComplete={isNew ? "new-password" : "current-password"} required minLength={isNew ? 12 : undefined} maxLength={128} aria-label={label || placeholder} /><button type="button" aria-label={show ? "Hide password" : "Show password"} aria-pressed={show} onClick={() => setShow(!show)}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div>;
}
