---
title: "Building No-Code Excel-like Tables: Implementing Drag & Drop UI"
emoji: "🧩"
type: "tech"
topics: ["react", "typescript", "dndkit", "nextjs"]
published: false
platforms:
  qiita: false
  zenn: false
  devto: true
---

This article is Day 16 of the **[Solo SaaS Development - Design, Implementation, and Operations Advent Calendar 2025](https://adventar.org/calendars/12615)**.

Yesterday's article covered "Infinite Scroll Pitfalls." Today, I'll explain how to implement an Excel-like table UI with drag & drop column reordering.

## 🎯 Features to Implement

We're building a table where users can freely manipulate columns, like Notion or Airtable.

- Click cells to edit directly (inline editing)
- Drag & drop to reorder columns
- Reorder rows within the table
- Resize column widths

The goal was to make it intuitive enough for non-engineers. This article introduces the design decisions and implementation patterns to achieve these features.

## ⚙️ Library Selection

### Table Foundation: react-spreadsheet

There are several library options for table UI.

| Library | Characteristics |
|---------|----------------|
| AG Grid | Feature-rich, enterprise-scale, commercial license |
| TanStack Table | Headless, high flexibility, requires UI building |
| react-spreadsheet | Lightweight, Excel-like, easy customization |

I chose [react-spreadsheet](https://github.com/iddan/react-spreadsheet). The deciding factor was the **DataEditor/DataViewer pattern**. It allows defining separate components for cell "display" and "editing," making it easy to implement different UIs for each data type.

AG Grid is powerful but implementing custom cell editors was somewhat complex. TanStack Table offers high flexibility as a headless library, but requires building UI from scratch. react-spreadsheet hit the "just right" balance.

### Drag & Drop: dnd-kit

For drag & drop, I used [@dnd-kit](https://github.com/clauderic/dnd-kit).

react-beautiful-dnd is also well-known, but maintenance has stagnated. dnd-kit supports React 18's Concurrent Mode and has excellent TypeScript definitions. With built-in accessibility (keyboard navigation) support, I chose it with future expansion in mind.

## ✏️ Inline Editing Design

### Why Inline Editing?

The traditional "click edit button to open modal" UI works for editing one item at a time, but becomes frustrating when editing multiple cells consecutively. Being able to "click a cell and edit in place" like Excel greatly improves user efficiency.

### DataEditor/DataViewer Pattern

In react-spreadsheet, you assign "display" and "editing" components to each cell.

```tsx
// Display: State before clicking the cell
const TextViewer: DataViewerComponent<TextCell> = ({ cell }) => {
  return <span className="px-2">{cell?.value ?? ''}</span>;
};

// Editing: State after clicking the cell
const TextEditor: DataEditorComponent<TextCell> = ({ cell, onChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus and select all when entering edit mode
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <input
      ref={inputRef}
      type="text"
      value={cell?.value ?? ''}
      onChange={(e) => onChange({ ...cell, value: e.target.value })}
    />
  );
};
```

The advantage of this pattern is providing optimal UI for each data type. Text gets an input field, dates get a calendar picker, choices get a dropdown—each with an appropriate editor.

### Dropdown Considerations

When implementing dropdowns (select boxes), there's a common problem. The menu gets hidden by the table's `overflow: hidden`.

The solution is to render the menu directly on the body.

```tsx
<Select
  menuPortalTarget={document.body}
  styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
  // ...
/>
```

Specifying `menuPortalTarget={document.body}` moves the menu outside the table's DOM hierarchy, preventing it from being hidden by other elements.

## 🐧 Column Order Reordering

### Reordering in the Design Screen

Column order can be changed in the design screen (field designer). This uses dnd-kit.

The key implementation point is **preventing accidental operations**.

```tsx
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  })
);
```

Specifying `distance: 8` means dragging won't start until you move 8 pixels or more. Without this, dragging starts on a simple click, causing unintended reordering.

Another point is **limiting the drag handle**.

```tsx
<div ref={setNodeRef} style={style} {...attributes}>
  {/* listeners applied only to handle */}
  <button {...listeners} className="cursor-grab">
    <GripVertical />
  </button>
  <span>{item.name}</span>
  <button onClick={onEdit}>Edit</button>
</div>
```

By applying `listeners` only to the drag handle (grip icon), clicking the "Edit" button or other elements won't start dragging. Making the entire item draggable tends to conflict with other operations.

## 🐰 Table Row Reordering

### Optimistic UI Updates

Table rows can also be reordered by dragging. The key here is **optimistic UI updates**.

```tsx
const handleDrop = async (targetIndex: number) => {
  // 1. First, update the screen immediately (optimistic update)
  const reordered = [...localRows];
  const [dragged] = reordered.splice(draggedIndex, 1);
  reordered.splice(targetIndex, 0, dragged);
  setLocalRows(reordered);

  // 2. Then save to server
  await saveReorder(reordered);
};
```

The order changes on screen as soon as the drag completes, while server saving happens in the background. Users can move to the next operation without waiting.

### Unsaved State Warning

If users try to leave the page after reordering without saving, we show a warning.

```tsx
useEffect(() => {
  if (!hasUnsavedChanges) return;

  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    e.preventDefault();
    e.returnValue = 'Changes have not been saved';
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [hasUnsavedChanges]);
```

This prevents data loss even if users accidentally close the page.

## 🐙 Column Width Resizing

### Persisting with localStorage

I thought it would be more user-friendly if adjusted column widths persisted on the next visit. While saving to the server is an option, column widths are user preferences that change frequently, so I saved them to localStorage.

```tsx
const useColumnWidths = (tableId: string) => {
  const storageKey = `table_widths_${tableId}`;

  const [widths, setWidths] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : {};
  });

  // Update localStorage whenever widths change
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(widths));
  }, [widths, storageKey]);

  return { widths, setWidths };
};
```

By saving with different keys per table, settings don't mix up even when using multiple tables.

### Minimum Width Constraint

Setting a minimum width during resizing prevents the problem of columns becoming invisible when squished.

```tsx
const handleResize = (columnId: string, newWidth: number) => {
  const clampedWidth = Math.max(50, newWidth); // Minimum 50px
  setWidths(prev => ({ ...prev, [columnId]: clampedWidth }));
};
```

## ✅ Summary

Here are the key points for implementing an Excel-like table UI.

| Challenge | Solution |
|-----------|----------|
| Different editing UI per data type | DataEditor/DataViewer pattern |
| Dropdown gets hidden | menuPortalTarget={document.body} |
| Drag triggers on click | activationConstraint: { distance: 8 } |
| Drag conflicts with other buttons | Limit listeners to drag handle |
| Wait time during reordering | Optimistic UI updates |
| Leaving with unsaved changes | beforeunload warning |
| Column width persistence | localStorage |

For no-code tool UI, it's important that it not only "works" but is "usable without confusion." Preventing accidental operations, immediate feedback, state persistence—these details determine the user experience.

Tomorrow's article will cover "Implementing Semantic Search with pgvector + OpenAI Embeddings."

---

**Other Articles in This Series**

- Day 15: Infinite Scroll with Zustand and React 19: Async Pitfalls
- Day 17: Implementing "Search by Meaning": pgvector + OpenAI Embeddings Introduction
