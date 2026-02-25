interface SearchBarProps {
  onSearch: (query: string) => void;
}

export function SearchBar({ onSearch }: SearchBarProps) {
  return (
    <div className="search-bar">
      <input
        type="text"
        placeholder="🔍 Search songs by title or artist..."
        onChange={(e) => onSearch(e.target.value)}
        className="search-input"
      />
    </div>
  );
}
