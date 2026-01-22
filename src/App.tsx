import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./styles.css";

interface Note {
  id: string;
  title: string;
  content: string;
  timestamp: number;
}

function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Load notes on component mount
  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const loadedNotes = await invoke<Note[]>("load_notes");
      setNotes(loadedNotes.sort((a, b) => b.timestamp - a.timestamp));
    } catch (error) {
      console.error("Failed to load notes:", error);
      setMessage("Failed to load notes");
    }
  };

  const saveNote = async () => {
    if (!title.trim() || !content.trim()) {
      setMessage("Please enter both title and content");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      await invoke("save_note", {
        title: title.trim(),
        content: content.trim(),
      });

      setTitle("");
      setContent("");
      setMessage("Note saved successfully!");
      await loadNotes(); // Reload notes to show the new one
    } catch (error) {
      console.error("Failed to save note:", error);
      setMessage("Failed to save note");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  return (
    <main className="flex bg-slate-700 h-full w-full p-4">
      {/* Note Entry Panel */}
      <div className="w-1/2 pr-4">
        <div className="bg-slate-100 rounded-lg shadow-2xl p-6 h-full">
          <h2 className="text-xl font-bold mb-4 text-slate-800">Create Note</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter note title..."
              disabled={isLoading}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-64 resize-none"
              placeholder="Write your note here..."
              disabled={isLoading}
            />
          </div>

          <button
            onClick={saveNote}
            disabled={isLoading || !title.trim() || !content.trim()}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Saving..." : "Save Note"}
          </button>

          {message && (
            <div className={`mt-4 p-3 rounded-md text-sm ${
              message.includes("successfully") 
                ? "bg-green-100 text-green-700" 
                : "bg-red-100 text-red-700"
            }`}>
              {message}
            </div>
          )}
        </div>
      </div>

      {/* Notes List Panel */}
      <div className="w-1/2 pl-4">
        <div className="bg-slate-100 rounded-lg shadow-2xl p-6 h-full">
          <h2 className="text-xl font-bold mb-4 text-slate-800">Saved Notes ({notes.length})</h2>
          
          <div className="overflow-y-auto h-[calc(100%-3rem)]">
            {notes.length === 0 ? (
              <p className="text-slate-500 text-center mt-8">No notes yet. Create your first note!</p>
            ) : (
              <div className="space-y-4">
                {notes.map((note) => (
                  <div key={note.id} className="bg-white p-4 rounded-md shadow border">
                    <h3 className="font-semibold text-slate-800 mb-2">{note.title}</h3>
                    <p className="text-slate-600 text-sm mb-2 whitespace-pre-wrap">
                      {note.content.length > 150 
                        ? `${note.content.substring(0, 150)}...` 
                        : note.content
                      }
                    </p>
                    <p className="text-xs text-slate-400">{formatDate(note.timestamp)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default App;
