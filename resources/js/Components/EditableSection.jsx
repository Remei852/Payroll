import { useRef, useEffect } from 'react';

export default function EditableSection({ content, onChange, className = '', placeholder = '' }) {
    const editableRef = useRef(null);

    useEffect(() => {
        if (editableRef.current && editableRef.current.textContent !== content) {
            editableRef.current.textContent = content;
        }
    }, [content]);

    const handleInput = (e) => {
        onChange(e.currentTarget.textContent);
    };

    const handlePaste = (e) => {
        // Prevent pasting formatted text, only allow plain text
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        document.execCommand('insertText', false, text);
    };

    return (
        <div
            ref={editableRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onPaste={handlePaste}
            className={`editable-section focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 ${className}`}
            data-placeholder={placeholder}
            style={{ minHeight: '1em' }}
        >
            {content}
        </div>
    );
}
