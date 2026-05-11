"use client";

import type { FormEvent } from "react";
import { Button } from "@/components/atoms/Button";
import { TextInput } from "@/components/atoms/TextInput";

export function GuessInputGroup({
  value,
  onChange,
  onSubmit,
  onReveal,
  disabled,
  canReveal
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onReveal: () => void;
  disabled?: boolean;
  canReveal: boolean;
}) {
  return (
    <form className="min-h-40 w-[278px] space-y-3" onSubmit={onSubmit}>
      <TextInput
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="정답 입력"
        autoComplete="off"
        disabled={disabled}
      />
      <div className="grid grid-cols-2 gap-[14px]">
        <Button type="submit" disabled={disabled || !value.trim()}>제출</Button>
        <Button type="button" variant="secondary" onClick={onReveal} disabled={disabled || !canReveal}>
          다음 단서
        </Button>
      </div>
    </form>
  );
}
