import { useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createNote, deleteNote, fetchNotes } from "../../services/noteService";
import type { NewNote } from "../../types/note";
import Modal from "../Modal/Modal";
import NoteForm from "../NoteForm/NoteForm";
import NoteList from "../NoteList/NoteList";
import Pagination from "../Pagination/Pagination";
import SearchBox from "../SearchBox/SearchBox";
import css from "./App.module.css";

const PER_PAGE = 12;
function getErrorMessage(error: Error | null): string {
  return error?.message ?? "Something went wrong. Please try again.";
}

export default function App() {
  const hasToken = Boolean(import.meta.env.VITE_NOTEHUB_TOKEN);
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const updateSearch = useDebouncedCallback((value: string) => {
    setSearch(value.trim());
    setCurrentPage(1);
  }, 350);

  const notesQuery = useQuery({
    queryKey: ["notes", { currentPage, search }],
    queryFn: () => fetchNotes({ page: currentPage, perPage: PER_PAGE, search }),
    enabled: hasToken,
    placeholderData: (previousData) => previousData,
  });

  const createMutation = useMutation({
    mutationFn: (note: NewNote) => createNote(note),
    onSuccess: async () => {
      setCurrentPage(1);
      await queryClient.invalidateQueries({ queryKey: ["notes"] });
      setIsModalOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteNote(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes"] }),
  });

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    updateSearch(value);
  };

  const handleCreateNote = async (note: NewNote) => {
    await createMutation.mutateAsync(note);
  };

  const notes = notesQuery.data?.notes ?? [];
  const totalPages = notesQuery.data?.totalPages ?? 0;
  const requestError = notesQuery.error ?? deleteMutation.error;

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <main className={css.app}>
      <header className={css.toolbar}>
        <SearchBox value={searchInput} onChange={handleSearchChange} />
        {totalPages > 1 && (
          <Pagination
            currentPage={Math.min(currentPage, totalPages)}
            pageCount={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
        <button
          className={css.button}
          type="button"
          onClick={() => {
            createMutation.reset();
            setIsModalOpen(true);
          }}
        >
          Create note +
        </button>
      </header>

      {!hasToken ? (
        <p className={css.message} role="status">
          Add your personal <code>VITE_NOTEHUB_TOKEN</code> to the local .env
          file to load your notes.
        </p>
      ) : notesQuery.isPending ? (
        <p className={css.message} role="status" aria-live="polite">
          Loading notes…
        </p>
      ) : requestError ? (
        <p className={css.error} role="alert">
          {getErrorMessage(requestError)}
        </p>
      ) : notes.length > 0 ? (
        <NoteList
          notes={notes}
          onDelete={(id) => deleteMutation.mutate(id)}
          deletingId={
            deleteMutation.isPending ? deleteMutation.variables : null
          }
        />
      ) : (
        <p className={css.message} role="status">
          No notes found.
        </p>
      )}

      {isModalOpen && (
        <Modal onClose={() => setIsModalOpen(false)}>
          <NoteForm
            onSubmit={handleCreateNote}
            onCancel={() => setIsModalOpen(false)}
            isSaving={createMutation.isPending}
            errorMessage={createMutation.error?.message ?? null}
          />
        </Modal>
      )}
    </main>
  );
}
