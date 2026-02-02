import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useDebounce } from "./hooks/debounce";
import "./styles.css";

interface Note {
  id: string;
  title: string;
  content: string;
  timestamp: number;
}

function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [originalNote, setOriginalNote] = useState({ title: "", content: "" });
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debouncedContent = useDebounce(selectedNote?.content, 800);

  useEffect(() => {
    loadNotes();
  }, []);

  const handleSelctedNote = (note: Note) => {
    setSelectedNote(note);
    setIsEditingTitle(false);
    setMessage("");
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  useEffect(() => {
    if (selectedNote) {
      setOriginalNote({
        title: selectedNote.title,
        content: selectedNote.content,
      });
    }
  }, [selectedNote?.id]);

  const handleUpdate = async () => {
    setMessage("");
    setIsSaving(true);
    try {
      await invoke("update_note", {
        id: selectedNote?.id,
        content: selectedNote?.content,
        title: selectedNote?.title || "Untitled",
      });
      await loadNotes();
    } catch (error) {
      console.error("Failed to update note:", error);
      setMessage("Failed to update note");
    } finally {
      setMessage("Note updated automatically!");
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const isDirty =
      debouncedContent !== originalNote.content ||
      selectedNote?.title !== originalNote.title;
    if (isDirty) {
      handleUpdate();
    }
  }, [debouncedContent, selectedNote?.title, originalNote]);

  const loadNotes = async () => {
    try {
      const loadedNotes = await invoke<Note[]>("load_notes");
      setNotes(loadedNotes);
    } catch (error) {
      console.error("Failed to load notes:", error);
      setMessage("Failed to load notes");
    }
  };

  const createNote = async () => {
    setIsLoading(true);
    setMessage("");
    try {
      await invoke("create_note", {
        title: "Untitled",
        content: "",
      });
      setMessage("Note created!");
      await loadNotes();
    } catch (error) {
      console.error("Failed to create note:", error);
      setMessage("Failed to create note");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const handleDelete = async (id: string) => {
    setMessage("");
    try {
      await invoke("delete_note", { id });
      setMessage("Note deleted!");
      setSelectedNote(null);
      await loadNotes();
    } catch (error) {
      console.error("Failed to delete note:", error);
      setMessage("Failed to delete note");
    }
  };

  return (
    <main className="flex bg-slate-900 h-full w-full">
      <div className="w-1/4 px-2 pt-4">
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-slate-100">Notes</h2>
            <button
              onClick={createNote}
              className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-900 disabled:bg-slate-400 disabled:cursor-not-allowed"
              disabled={isLoading}
              title="Create new note"
            >
              +
            </button>
          </div>
          <div className="overflow-y-auto flex-1">
            {notes.length === 0 ? (
              <p className="text-slate-100 text-center mt-8">No notes yet.</p>
            ) : (
              <ul>
                {notes.map((note) => (
                  <li
                    key={note.id}
                    className={`p-3 mb-2 rounded cursor-pointer border ${selectedNote?.id === note.id
                      ? "bg-slate-700 border-slate-700"
                      : "bg-slate-800 border-slate-800 hover:border-slate-700 hover:bg-slate-700"
                      }`}
                    onClick={() => handleSelctedNote(note)}
                  >
                    <div className="font-semibold text-slate-100">
                      {note.title}
                    </div>
                    <div className="text-xs text-slate-100">
                      {formatDate(note.timestamp)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
      {/* Right panel: Markdown editor */}
      <div className="w-3/4">
        <div className="bg-slate-900 px-2 pt-2 h-full flex flex-col">
          {selectedNote ? (
            <>
              <div className="p-1">
                {isEditingTitle ? (
                  <input
                    className="text-xl font-bold mb-2 text-slate-100 bg-transparent border-none focus:outline-none"
                    value={selectedNote.title}
                    autoFocus
                    onChange={(e) =>
                      setSelectedNote({
                        ...selectedNote,
                        title: e.target.value,
                      })
                    }
                    onBlur={() => setIsEditingTitle(false)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setIsEditingTitle(false);
                    }}
                  />
                ) : (
                  <h2
                    className="text-xl font-bold mb-2 text-slate-100 cursor-pointer"
                    onClick={() => setIsEditingTitle(true)}
                  >
                    {selectedNote.title}
                  </h2>
                )}
                <div className="text-xs text-slate-100 mb-4">
                  {formatDate(selectedNote.timestamp)}
                </div>
              </div>
              <textarea
                ref={textareaRef}
                value={selectedNote.content}
                onChange={(e) => setSelectedNote({ ...selectedNote, content: e.target.value })}
                className="w-full p-1 h-[calc(100vh-8rem)] resize-none font-mono text-slate-100"
                placeholder="Edit your note in Markdown..."
              />
              <div className="flex items-center gap-4 justify-end mt-4 p-4">
                <button
                  className="py-1 px-2 rounded bg-red-700 hover:bg-red-500 hover:cursor-pointer text-slate-100"
                  onClick={() => handleDelete(selectedNote?.id)}
                >
                  Delete
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <span className="text-2xl mb-2">📝</span>
              <span>Select a note to view and edit</span>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default App;
