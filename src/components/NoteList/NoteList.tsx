import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteNote } from "../../services/noteService";
import type { Note } from "../../types/note";
import css from "./NoteList.module.css";

export interface NoteListProps {
  notes: Note[];
}

export default function NoteList({ notes }: NoteListProps) {
  const queryClient = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: deleteNote,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes"] }),
  });

  if (notes.length === 0) return null;

  return (
    <>
      {deleteMutation.error && (
        <p role="alert">{deleteMutation.error.message}</p>
      )}
      <ul className={css.list}>
        {notes.map((note) => (
          <li className={css.listItem} key={note.id}>
            <h2 className={css.title}>{note.title}</h2>
            <p className={css.content}>{note.content}</p>
            <div className={css.footer}>
              <span className={css.tag}>{note.tag}</span>
              <button
                className={css.button}
                type="button"
                onClick={() => deleteMutation.mutate(note.id)}
                disabled={
                  deleteMutation.isPending &&
                  deleteMutation.variables === note.id
                }
                aria-label={`Delete note ${note.title}`}
              >
                {deleteMutation.isPending &&
                deleteMutation.variables === note.id
                  ? "Deleting…"
                  : "Delete"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
