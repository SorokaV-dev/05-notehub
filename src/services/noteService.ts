import axios from "axios";
import type { AxiosResponse } from "axios";
import type { NewNote, Note } from "../types/note";

const API_URL = "https://notehub-public.goit.study/api";

export interface FetchNotesParams {
  page: number;
  perPage: number;
  search?: string;
}

export interface FetchNotesResponse {
  notes: Note[];
  totalPages: number;
}

function createApiClient() {
  const token = import.meta.env.VITE_NOTEHUB_TOKEN;

  if (!token) {
    throw new Error(
      "Add your personal VITE_NOTEHUB_TOKEN to the local .env file.",
    );
  }

  return axios.create({
    baseURL: API_URL,
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function fetchNotes(
  params: FetchNotesParams,
): Promise<FetchNotesResponse> {
  const response: AxiosResponse<FetchNotesResponse> =
    await createApiClient().get("/notes", {
      params: {
        page: params.page,
        perPage: params.perPage,
        ...(params.search?.trim() ? { search: params.search.trim() } : {}),
      },
    });

  return response.data;
}

export async function createNote(note: NewNote): Promise<Note> {
  const response: AxiosResponse<Note> = await createApiClient().post(
    "/notes",
    note,
  );

  return response.data;
}

export async function deleteNote(id: string): Promise<Note> {
  const response: AxiosResponse<Note> = await createApiClient().delete(
    `/notes/${id}`,
  );

  return response.data;
}
