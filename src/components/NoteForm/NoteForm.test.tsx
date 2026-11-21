import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createNote } from "../../services/noteService";
import NoteForm from "./NoteForm";

vi.mock("../../services/noteService", () => ({ createNote: vi.fn() }));

function renderNoteForm({ onCancel = vi.fn(), onCreated = vi.fn() } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <NoteForm onCancel={onCancel} onCreated={onCreated} />
    </QueryClientProvider>,
  );

  return { onCancel, onCreated };
}

describe("NoteForm", () => {
  beforeEach(() => {
    vi.mocked(createNote).mockResolvedValue({
      id: "note-1",
      title: "Course plan",
      content: "Review React Query.",
      createdAt: "2026-10-01T10:00:00.000Z",
      updatedAt: "2026-10-01T10:00:00.000Z",
      tag: "Todo",
    });
  });

  it("validates the title and content before submitting", async () => {
    const user = userEvent.setup();
    renderNoteForm();

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
    expect(createNote).not.toHaveBeenCalled();
  });

  it("rejects titles longer than 50 characters", async () => {
    const user = userEvent.setup();
    renderNoteForm();

    await user.type(screen.getByLabelText("Title"), "x".repeat(51));
    await user.click(screen.getByRole("button", { name: "Create note" }));

    expect(
      await screen.findByText("Title must contain no more than 50 characters"),
    ).toBeInTheDocument();
    expect(createNote).not.toHaveBeenCalled();
  });

  it("submits values from a valid form", async () => {
    const user = userEvent.setup();
    const { onCreated } = renderNoteForm();

    await user.type(screen.getByLabelText("Title"), "Course plan");
    await user.type(screen.getByLabelText("Content"), "Review React Query.");
    await user.selectOptions(screen.getByLabelText("Tag"), "Meeting");
    await user.click(screen.getByRole("button", { name: "Create note" }));

    await waitFor(() => {
      expect(createNote).toHaveBeenCalledWith(
        {
          title: "Course plan",
          content: "Review React Query.",
          tag: "Meeting",
        },
        expect.anything(),
      );
    });
    expect(onCreated).toHaveBeenCalledOnce();
  });

  it("keeps the entered values and re-enables the form after a failed request", async () => {
    const user = userEvent.setup();
    vi.mocked(createNote).mockRejectedValue(new Error("Request failed"));
    renderNoteForm();

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
    const { onCancel } = renderNoteForm();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
