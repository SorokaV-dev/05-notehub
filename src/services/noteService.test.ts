import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockGet, mockPost, mockDelete, mockCreate } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockDelete: vi.fn(),
  mockCreate: vi.fn(),
}));

vi.mock("axios", () => ({
  default: { create: mockCreate },
}));

import axios from "axios";
import { createNote, deleteNote, fetchNotes } from "./noteService";

const note = {
  id: "note-1",
  title: "Weekly plan",
  content: "Prepare the next sprint.",
  createdAt: "2026-10-01T10:00:00.000Z",
  updatedAt: "2026-10-01T10:00:00.000Z",
  tag: "Work" as const,
};

describe("noteService", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_NOTEHUB_TOKEN", "test-token");
    mockGet.mockResolvedValue({ data: { notes: [note], totalPages: 1 } });
    mockPost.mockResolvedValue({ data: note });
    mockDelete.mockResolvedValue({ data: note });
    mockCreate.mockReturnValue({
      get: mockGet,
      post: mockPost,
      delete: mockDelete,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("requests paginated notes with the search keyword and Bearer token", async () => {
    await expect(
      fetchNotes({ page: 2, perPage: 12, search: " weekly " }),
    ).resolves.toEqual({ notes: [note], totalPages: 1 });

    expect(axios.create).toHaveBeenCalledWith({
      baseURL: "https://notehub-public.goit.study/api",
      headers: { Authorization: "Bearer test-token" },
    });
    expect(mockGet).toHaveBeenCalledWith("/notes", {
      params: { page: 2, perPage: 12, search: "weekly" },
    });
  });

  it("creates a note and returns the server response", async () => {
    const newNote = { title: "Weekly plan", content: "", tag: "Work" as const };

    await expect(createNote(newNote)).resolves.toEqual(note);
    expect(mockPost).toHaveBeenCalledWith("/notes", newNote);
  });

  it("deletes a note by id and returns the server response", async () => {
    await expect(deleteNote("note-1")).resolves.toEqual(note);
    expect(mockDelete).toHaveBeenCalledWith("/notes/note-1");
  });

  it("does not send a request without the personal token", async () => {
    vi.stubEnv("VITE_NOTEHUB_TOKEN", "");

    await expect(fetchNotes({ page: 1, perPage: 12 })).rejects.toThrow(
      "Add your personal VITE_NOTEHUB_TOKEN",
    );
    expect(axios.create).not.toHaveBeenCalled();
  });
});
