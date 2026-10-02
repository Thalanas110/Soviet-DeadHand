import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SetupStage } from "@/components/deadhand/SetupStage";
import { PasswordForm } from "@/routes/_authenticated/setup";

describe("SetupStage", () => {
  it("shows required versus incomplete without exposing password values", () => {
    render(
      <SetupStage id="passwords" title="Access passwords" required complete={false} active>
        <input aria-label="Check-in password" type="password" value="secret" readOnly />
      </SetupStage>,
    );

    expect(screen.getByText(/Required/)).toBeInTheDocument();
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
  });

  it("marks a completed recommended stage", () => {
    render(
      <SetupStage id="wearable" title="Wearable" required={false} complete active={false}>
        <p>Optional device registration</p>
      </SetupStage>,
    );

    expect(screen.getByText(/Recommended/)).toBeInTheDocument();
    expect(screen.getByText(/Ready/)).toBeInTheDocument();
  });

  it("requires the current password when changing configured passwords", () => {
    render(<PasswordForm busy={false} configured onSubmit={() => undefined} />);

    expect(screen.getByLabelText("Current password")).toBeRequired();
  });
});
