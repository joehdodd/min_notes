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
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debouncedContent = useDebounce(editContent, 800);

  useEffect(() => {
    loadNotes();
  }, []);

  const handleUpdate = async () => {
    setMessage("");
    setIsSaving(true);
    try {
      await invoke("update_note", {
        id: selectedNoteId,
        content: editContent,
        title: notes.find((n) => n.id === selectedNoteId)?.title || "Untitled",
      });
      await loadNotes();
    } catch (error) {
      console.error("Failed to update note:", error);
      setMessage("Failed to update note");
    } finally {
      setMessage("Note updated automatically!");
      setIsSaving(false);
    }
  }

  useEffect(() => {
    console.log("Debounced content:", debouncedContent, editContent);
    if (debouncedContent !== editContent) {
      handleUpdate();
    }
  }, [debouncedContent]);

  useEffect(() => {
    if (selectedNoteId) {
      const note = notes.find((n) => n.id === selectedNoteId);
      setEditContent(note ? note.content : "");
    } else {
      setEditContent("");
    }
  }, [selectedNoteId, notes]);

  const loadNotes = async () => {
    try {
      const loadedNotes = await invoke<Note[]>("load_notes");
      setNotes(loadedNotes.sort((a, b) => b.timestamp - a.timestamp));
    } catch (error) {
      console.error("Failed to load notes:", error);
      setMessage("Failed to load notes");
    }
  };

  const createNote = async () => {
    setIsLoading(true);
    setMessage("");
    try {
      await invoke("save_note", {
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

  const selectedNote = notes.find((n) => n.id === selectedNoteId);

  return (
    <main className="flex bg-slate-700 h-full w-full">
      <div className="w-1/4 px-2 pt-4">
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-slate-100">Notes</h2>
            <button
              onClick={createNote}
              className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed"
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
                    className={`p-3 mb-2 rounded cursor-pointer border ${selectedNoteId === note.id
                      ? "bg-slate-500 border-slate-500"
                      : "bg-slate-600 border-slate-600 hover:border-slate-800 hover:bg-slate-800"
                      }`}
                    onClick={() => setSelectedNoteId(note.id)}
                  >
                    <div className="font-semibold text-slate-100">{note.title}</div>
                    <div className="text-xs text-slate-100">{formatDate(note.timestamp)}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
      {/* Right panel: Markdown editor */}
      <div className="w-3/4">
        <div className="bg-slate-700 px-2 pt-2 h-full flex flex-col">
          {selectedNote ? (
            <>
              <div className="p-1">
                <h2 className="text-xl font-bold mb-2 text-slate-100">{selectedNote.title}</h2>
                <div className="text-xs text-slate-100 mb-4">{formatDate(selectedNote.timestamp)}</div>
              </div>
              <textarea
                ref={textareaRef}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full p-1 h-[calc(100vh-8rem)] resize-none font-mono text-slate-100"
                placeholder="Edit your note in Markdown..."
              />
              <div className="flex justify-end mt-4">
                <span className="text-slate-100 text-sm">
                  {isSaving ? "Saving..." : message}
                </span>
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
