import React, { useState } from 'react';

export default function NotesSection({ record, reviewer, reviewedAt, onNotesUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState(record?.notes || '');

  const handleSave = () => {
    onNotesUpdate(notes);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setNotes(record?.notes || '');
    setIsEditing(false);
  };

  return (
    <div className="mt-6 border-t pt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Notes</h3>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Edit Notes
          </button>
        )}
      </div>

      {reviewer && reviewedAt && (
        <p className="text-sm text-gray-600 mb-3">
          Last reviewed by <span className="font-medium">{reviewer.name}</span> on{' '}
          <span className="font-medium">{new Date(reviewedAt).toLocaleString()}</span>
        </p>
      )}

      {isEditing ? (
        <div className="space-y-3">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength="500"
            rows="4"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Add notes about this attendance record..."
          />
          <p className="text-xs text-gray-500">{notes.length}/500 characters</p>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Save Notes
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 p-4 rounded border border-gray-200">
          {notes ? (
            <p className="text-gray-800 whitespace-pre-wrap">{notes}</p>
          ) : (
            <p className="text-gray-500 italic">No notes added yet</p>
          )}
        </div>
      )}
    </div>
  );
}
