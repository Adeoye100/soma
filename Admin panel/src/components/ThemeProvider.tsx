import { useEffect } from 'react';
import { useDashboardStore } from '@/store/dashboardStore';

const accentColorMap = {
  indigo: { primary: '245 100% 68%', accent: '245 100% 68%' },
  green: { primary: '142 71% 45%', accent: '142 71% 45%' },
  blue: { primary: '217 91% 60%', accent: '217 91% 60%' },
  amber: { primary: '38 92% 50%', accent: '38 92% 50%' },
  red: { primary: '0 84% 60%', accent: '0 84% 60%' },
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, accentColor } = useDashboardStore();

  useEffect(() => {
    const root = document.documentElement;
    
    // Apply theme
    if (theme === 'dark') {
      root.classList.remove('light');
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    
    // Apply accent color
    const colors = accentColorMap[accentColor];
    root.style.setProperty('--primary', colors.primary);
    root.style.setProperty('--accent', colors.accent);
    root.style.setProperty('--ring', colors.primary);
    root.style.setProperty('--sidebar-primary', colors.primary);
    root.style.setProperty('--sidebar-ring', colors.primary);
  }, [theme, accentColor]);

  return <>{children}</>;
}
