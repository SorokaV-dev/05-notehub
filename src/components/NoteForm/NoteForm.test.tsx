import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import NoteForm from "./NoteForm";

describe("NoteForm", () => {
  it("validates the title and content before submitting", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<NoteForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Create note" }));
    expect(await screen.findByText("Title is required")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Title"), "No");
    await user.type(screen.getByLabelText("Content"), "x".repeat(501));
    await user.click(screen.getByRole("button", { name: "Create note" }));

    expect(
      await screen.findByText("Title must contain at least 3 characters"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Content must contain no more than 500 characters"),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects titles longer than 50 characters", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<NoteForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText("Title"), "x".repeat(51));
    await user.click(screen.getByRole("button", { name: "Create note" }));

    expect(
      await screen.findByText("Title must contain no more than 50 characters"),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits values from a valid form", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<NoteForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText("Title"), "Course plan");
    await user.type(screen.getByLabelText("Content"), "Review React Query.");
    await user.selectOptions(screen.getByLabelText("Tag"), "Meeting");
    await user.click(screen.getByRole("button", { name: "Create note" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        title: "Course plan",
        content: "Review React Query.",
        tag: "Meeting",
      });
    });
  });

  it("keeps the entered values and re-enables the form after a failed request", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new Error("Request failed"));
    render(
      <NoteForm
        onSubmit={onSubmit}
        onCancel={vi.fn()}
        errorMessage="Request failed"
      />,
    );

    const title = screen.getByLabelText("Title");
    await user.type(title, "Course plan");
    await user.click(screen.getByRole("button", { name: "Create note" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Create note" })).toBeEnabled();
    });
    expect(title).toHaveValue("Course plan");
    expect(screen.getByRole("alert")).toHaveTextContent("Request failed");
  });

  it("calls onCancel from the Cancel button", async () => {
    const onCancel = vi.fn();
    render(<NoteForm onSubmit={vi.fn()} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
