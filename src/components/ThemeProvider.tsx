import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "dark" | "light";
export type DesignTheme = "clinical" | "wellness" | "performance";

type ThemeProviderProps = {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  designTheme: DesignTheme;
  setDesignTheme: (design: DesignTheme) => void;
  planDesignTheme: DesignTheme;
  setPlanDesignTheme: (design: DesignTheme) => void;
};

const initialState: ThemeProviderState = {
  theme: "dark",
  setTheme: () => null,
  designTheme: "clinical",
  setDesignTheme: () => null,
  planDesignTheme: "clinical",
  setPlanDesignTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

const DESIGN_THEME_CLASSES: DesignTheme[] = ["clinical", "wellness", "performance"];
const DESIGN_STORAGE_KEY = "ui-design-theme";
const PLAN_DESIGN_STORAGE_KEY = "ui-plan-design-theme";

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  storageKey = "ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  );

  const [designTheme, setDesignThemeState] = useState<DesignTheme>(
    () => (localStorage.getItem(DESIGN_STORAGE_KEY) as DesignTheme) || "clinical"
  );

  const [planDesignTheme, setPlanDesignThemeState] = useState<DesignTheme>(
    () => (localStorage.getItem(PLAN_DESIGN_STORAGE_KEY) as DesignTheme) || "clinical"
  );

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme === "dark" ? "dark" : "light");

    const savedHue = localStorage.getItem("primary-hue");
    if (savedHue) {
      const hue = parseInt(savedHue);
      root.style.setProperty("--accent-hue", hue.toString());
      root.style.setProperty("--primary", `${hue} 70% 50%`);
      root.style.setProperty("--primary-foreground", "0 0% 100%");
    }
  }, [theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    DESIGN_THEME_CLASSES.forEach((cls) => root.classList.remove(`theme-${cls}`));
    root.classList.add(`theme-${designTheme}`);
  }, [designTheme]);

  const value: ThemeProviderState = {
    theme,
    setTheme: (t: Theme) => {
      localStorage.setItem(storageKey, t);
      setTheme(t);
    },
    designTheme,
    setDesignTheme: (d: DesignTheme) => {
      localStorage.setItem(DESIGN_STORAGE_KEY, d);
      setDesignThemeState(d);
    },
    planDesignTheme,
    setPlanDesignTheme: (d: DesignTheme) => {
      localStorage.setItem(PLAN_DESIGN_STORAGE_KEY, d);
      setPlanDesignThemeState(d);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");
  return context;
};
