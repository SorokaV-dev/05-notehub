import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createNote, deleteNote, fetchNotes } from "../../services/noteService";
import type { Note } from "../../types/note";
import App from "./App";

vi.mock("../../services/noteService", () => ({
  createNote: vi.fn(),
  deleteNote: vi.fn(),
  fetchNotes: vi.fn(),
}));

const firstNote: Note = {
  id: "note-1",
  title: "Weekly plan",
  content: "Prepare the next sprint.",
  createdAt: "2026-10-01T10:00:00.000Z",
  updatedAt: "2026-10-01T10:00:00.000Z",
  tag: "Work",
};

function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );
}

describe("App", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_NOTEHUB_TOKEN", "test-token");
    vi.mocked(fetchNotes).mockResolvedValue({
      notes: [firstNote],
      totalPages: 2,
    });
    vi.mocked(createNote).mockResolvedValue({
      ...firstNote,
      id: "note-2",
      title: "New note",
    });
    vi.mocked(deleteNote).mockResolvedValue(firstNote);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("loads the first page, shows notes and pagination", async () => {
    renderApp();

    expect(
      await screen.findByRole("heading", { name: "Weekly plan" }),
    ).toBeInTheDocument();
    expect(fetchNotes).toHaveBeenCalledWith({
      page: 1,
      perPage: 12,
      search: "",
    });
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  it("hides the list and pagination when no notes are returned", async () => {
    vi.mocked(fetchNotes).mockResolvedValueOnce({ notes: [], totalPages: 1 });
    renderApp();

    expect(await screen.findByText("No notes found.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("fetches another page when pagination changes", async () => {
    const user = userEvent.setup();
    renderApp();

    await screen.findByRole("heading", { name: "Weekly plan" });
    await user.click(screen.getByRole("button", { name: "Go to page 2" }));

    await waitFor(() => {
      expect(fetchNotes).toHaveBeenCalledWith({
        page: 2,
        perPage: 12,
        search: "",
      });
    });
  });

  it("debounces the search and starts results from page one", async () => {
    const user = userEvent.setup();
    renderApp();

    await screen.findByRole("heading", { name: "Weekly plan" });
    const searchInput = screen.getByRole("textbox", { name: "Search notes" });
    await user.click(screen.getByRole("button", { name: "Go to page 2" }));
    await waitFor(() => {
      expect(fetchNotes).toHaveBeenCalledWith({
        page: 2,
        perPage: 12,
        search: "",
      });
    });
    await user.type(searchInput, "budget");
    expect(fetchNotes).toHaveBeenCalledTimes(2);

    await waitFor(
      () => {
        expect(fetchNotes).toHaveBeenCalledWith({
          page: 1,
          perPage: 12,
          search: "budget",
        });
      },
      { timeout: 2000 },
    );
  });

  it("deletes a note and refreshes the collection", async () => {
    const user = userEvent.setup();
    renderApp();

    await screen.findByRole("heading", { name: "Weekly plan" });
    await user.click(
      screen.getByRole("button", { name: "Delete note Weekly plan" }),
    );

    await waitFor(() => expect(deleteNote).toHaveBeenCalledWith("note-1"));
    await waitFor(() => expect(fetchNotes).toHaveBeenCalledTimes(2));
  });

  it("moves back a page when deleting the last item reduces the page count", async () => {
    const user = userEvent.setup();
    const lastNote = { ...firstNote, id: "note-last", title: "Last note" };
    let lastNoteWasDeleted = false;
    vi.mocked(fetchNotes).mockImplementation(async ({ page }) => {
      if (page === 3) {
        return lastNoteWasDeleted
          ? { notes: [], totalPages: 2 }
          : { notes: [lastNote], totalPages: 3 };
      }
      if (page === 2) return { notes: [firstNote], totalPages: 2 };
      return { notes: [firstNote], totalPages: 3 };
    });
    vi.mocked(deleteNote).mockImplementation(async () => {
      lastNoteWasDeleted = true;
      return lastNote;
    });
    renderApp();

    await screen.findByRole("heading", { name: "Weekly plan" });
    await user.click(screen.getByRole("button", { name: "Go to page 3" }));
    await screen.findByRole("heading", { name: "Last note" });
    await user.click(
      screen.getByRole("button", { name: "Delete note Last note" }),
    );

    await waitFor(() => {
      expect(fetchNotes).toHaveBeenCalledWith({
        page: 2,
        perPage: 12,
        search: "",
      });
    });
  });

  it("creates a validated note and closes the modal after success", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: "Create note +" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Title"), "New note");
    await user.type(
      within(dialog).getByLabelText("Content"),
      "Read course notes.",
    );
    await user.selectOptions(within(dialog).getByLabelText("Tag"), "Personal");
    await user.click(
      within(dialog).getByRole("button", { name: "Create note" }),
    );

    await waitFor(() => {
      expect(createNote).toHaveBeenCalledWith({
        title: "New note",
        content: "Read course notes.",
        tag: "Personal",
      });
    });
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(fetchNotes).toHaveBeenCalledTimes(2);
  });

  it("shows an error when the server request fails", async () => {
    vi.mocked(fetchNotes).mockRejectedValueOnce(new Error("Request failed"));
    renderApp();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Request failed",
    );
  });

  it("does not request data without a personal token", async () => {
    vi.stubEnv("VITE_NOTEHUB_TOKEN", "");
    renderApp();

    expect(await screen.findByRole("status")).toHaveTextContent(
      "VITE_NOTEHUB_TOKEN",
    );
    expect(fetchNotes).not.toHaveBeenCalled();
  });

  it("closes the modal on Escape", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: "Create note +" }));
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
