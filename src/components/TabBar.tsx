'use client';

interface TabBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  {
    id: 'chat',
    label: '聊天',
    // SF Symbol: message.fill / message
    icon: (active: boolean) => (
      <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 1.5}
          d={active
            ? "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            : "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          } />
      </svg>
    ),
  },
  {
    id: 'square',
    label: '广场',
    // SF Symbol: square.grid.2x2.fill / square.grid.2x2
    icon: (active: boolean) => (
      <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 1.5}
          d={active
            ? "M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
            : "M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
          } />
      </svg>
    ),
  },
  {
    id: 'me',
    label: '我',
    // SF Symbol: person.fill / person
    icon: (active: boolean) => (
      <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 1.5}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
];

/**
 * Apple HIG Compliant Tab Bar
 *
 * Design Decisions:
 * - 49px height following iOS Tab Bar specifications
 * - System Blue (#007AFF) for active state
 * - System Gray for inactive state
 * - 44×44pt minimum touch targets
 * - Filled icons for selected, outline for unselected
 * - 10px font size for labels (HIG specification)
 * - Safe area padding for notched devices
 */
export default function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <div
      className="bg-[var(--bg-primary)] border-t safe-area-bottom"
      style={{ borderColor: 'var(--separator)' }}
    >
      <div className="flex items-center justify-around h-[49px]">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-3 transition-colors duration-200"
              style={{
                color: isActive ? 'var(--system-green)' : 'var(--system-gray)'
              }}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="mb-0.5">
                {tab.icon(isActive)}
              </span>
              <span
                className="text-[10px]"
                style={{ fontWeight: isActive ? 500 : 400 }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
