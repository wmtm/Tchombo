import { CATEGORIES, type Category } from "@tchombo/shared";
import { useT } from "../lib/i18n";

const EMOJI: Record<Category, string> = {
  history: "🏛️",
  nature_environment: "🌿",
  culture_music: "🎵",
  geography: "🌍",
  mauritian_life: "🍛",
  sports_random: "🏆",
};

interface Props {
  selected: Category[];
  onToggle: (category: Category) => void;
  disabled?: boolean;
}

export function CategoryPicker({ selected, onToggle, disabled }: Props) {
  const t = useT();
  return (
    <div className="grid grid-cols-2 gap-2">
      {CATEGORIES.map((cat) => {
        const active = selected.includes(cat);
        return (
          <button
            key={cat}
            type="button"
            disabled={disabled}
            onClick={() => onToggle(cat)}
            className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-left transition-colors disabled:opacity-50 ${
              active ? "bg-leaf-soft text-leaf ring-1 ring-leaf/40" : "bg-white text-navy/50"
            }`}
          >
            <span className="text-lg leading-none">{EMOJI[cat]}</span>
            <span className="truncate">{t(`category.${cat}`)}</span>
          </button>
        );
      })}
    </div>
  );
}

export { EMOJI as CATEGORY_EMOJI };
