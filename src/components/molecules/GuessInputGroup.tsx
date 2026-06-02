"use client";

import type { FormEvent } from "react";
import { Button } from "@/components/atoms/Button";
import { LoadingSpinner } from "@/components/atoms/LoadingSpinner";
import { TextInput } from "@/components/atoms/TextInput";

export function GuessInputGroup({
  value,
  onChange,
  onSubmit,
  onReveal,
  disabled,
  canReveal,
  pendingAction
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onReveal: () => void;
  disabled?: boolean;
  canReveal: boolean;
  pendingAction?: "submit" | "reveal" | null;
}) {
  return (
    <form className="min-h-40 w-full space-y-3" onSubmit={onSubmit}>
      <TextInput
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="정답 입력"
        autoComplete="off"
        disabled={disabled}
      />
      <div className="grid w-full grid-cols-2 gap-3">
        <Button type="submit" disabled={disabled || !value.trim()}>
          {pendingAction === "submit" ? <LoadingSpinner size="sm" label="제출 중" /> : null}
          <span>제출</span>
        </Button>
        <Button type="button" variant="secondary" onClick={onReveal} disabled={disabled || !canReveal}>
          {pendingAction === "reveal" ? <LoadingSpinner size="sm" label="다음 단서 여는 중" /> : null}
          <span>다음 단서</span>
        </Button>
      </div>
    </form>
  );
}
