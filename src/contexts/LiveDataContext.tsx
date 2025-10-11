import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getHealthData, HealthDataRow } from "@/lib/healthDataStore";
import { checkAlertConditions } from "@/lib/alertConditions";

interface LiveDataContextType {
  csvData: HealthDataRow[];
  currentDayIndex: number;
  isSimulating: boolean;
  currentDayData: HealthDataRow | null;
  totalDays: number;
  startSimulation: () => void;
  pauseSimulation: () => void;
  resetSimulation: () => void;
  setDayIndex: (index: number) => void;
  refreshData: () => void;
}

const LiveDataContext = createContext<LiveDataContextType | undefined>(undefined);

export const LiveDataProvider = ({ children }: { children: ReactNode }) => {
  const [csvData, setCsvData] = useState<HealthDataRow[]>([]);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);

  // Load data from healthDataStore
  const refreshData = () => {
    const data = getHealthData();
    setCsvData(data);
    // Reset to last day when data changes, or 0 if no data
    if (data.length > 0) {
      setCurrentDayIndex(data.length - 1);
    } else {
      setCurrentDayIndex(0);
    }
  };

  // Initialize data on mount
  useEffect(() => {
    refreshData();
  }, []);

  const startSimulation = () => {
    setIsSimulating(true);
  };

  const pauseSimulation = () => {
    setIsSimulating(false);
  };

  const resetSimulation = () => {
    setIsSimulating(false);
    setCurrentDayIndex(csvData.length > 0 ? csvData.length - 1 : 0);
  };

  const setDayIndex = (index: number) => {
    if (index >= 0 && index < csvData.length) {
      setCurrentDayIndex(index);
      
      // Check alert conditions when day changes
      const dayData = csvData[index];
      if (dayData) {
        checkAlertConditions(dayData).catch(error => {
          console.error('Error checking alert conditions:', error);
        });
      }
    }
  };

  const currentDayData = csvData.length > 0 ? csvData[currentDayIndex] : null;

  const value: LiveDataContextType = {
    csvData,
    currentDayIndex,
    isSimulating,
    currentDayData,
    totalDays: csvData.length,
    startSimulation,
    pauseSimulation,
    resetSimulation,
    setDayIndex,
    refreshData,
  };

  return (
    <LiveDataContext.Provider value={value}>
      {children}
    </LiveDataContext.Provider>
  );
};

export const useLiveData = () => {
  const context = useContext(LiveDataContext);
  if (context === undefined) {
    throw new Error("useLiveData must be used within a LiveDataProvider");
  }
  return context;
};
