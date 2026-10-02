import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { PinPad } from "@/components/deadhand/PinPad";

it("accepts a mixed-character password without rendering a numeric keypad", () => {
  const onSubmit = vi.fn();
  render(<PinPad title="Authenticate" onSubmit={onSubmit} onCancel={vi.fn()} />);

  const input = screen.getByLabelText("Password");
  expect(input).toHaveAttribute("type", "password");
  expect(screen.queryByRole("button", { name: "1" })).not.toBeInTheDocument();

  fireEvent.change(input, { target: { value: "A7!alpha" } });
  fireEvent.click(screen.getByRole("button", { name: /confirm/i }));
  expect(onSubmit).toHaveBeenCalledWith("A7!alpha");
});
