/**
 * Interactive Chart Component
 *
 * Wraps Recharts with enhanced interactivity features:
 * - Hover tooltips with detailed data
 * - Click to drill down
 * - Zoom and pan controls
 * - Export as image
 * - Comparison overlays
 *
 * @component
 */
import { useState, useRef, useCallback } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Download,
  Maximize2,
  Minimize2,
  RefreshCw,
  GitCompare,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import html2canvas from "html2canvas";
import { useToast } from "@/hooks/use-toast";

export type ChartType = "line" | "area" | "bar";

export interface ChartDataPoint {
  [key: string]: string | number | Date;
}

export interface ChartSeries {
  dataKey: string;
  name: string;
  color: string;
  strokeWidth?: number;
  fill?: string;
}

interface InteractiveChartProps {
  /** Chart data array */
  data: ChartDataPoint[];
  /** Series to display */
  series: ChartSeries[];
  /** X-axis data key */
  xAxisKey: string;
  /** Chart title */
  title?: string;
  /** Chart type */
  type?: ChartType;
  /** Height in pixels */
  height?: number;
  /** Enable zoom controls */
  enableZoom?: boolean;
  /** Enable export */
  enableExport?: boolean;
  /** Enable comparison mode */
  enableComparison?: boolean;
  /** Comparison data for overlay */
  comparisonData?: ChartDataPoint[];
  /** Custom tooltip renderer */
  customTooltip?: (props: any) => JSX.Element;
  /** Click handler for data points */
  onDataPointClick?: (data: ChartDataPoint) => void;
  /** Y-axis label */
  yAxisLabel?: string;
  /** X-axis formatter */
  xAxisFormatter?: (value: any) => string;
  /** Y-axis formatter */
  yAxisFormatter?: (value: any) => string;
}

export const InteractiveChart = ({
  data,
  series,
  xAxisKey,
  title,
  type = "line",
  height = 300,
  enableZoom = true,
  enableExport = true,
  enableComparison = false,
  comparisonData,
  customTooltip,
  onDataPointClick,
  yAxisLabel,
  xAxisFormatter,
  yAxisFormatter,
}: InteractiveChartProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [zoomDomain, setZoomDomain] = useState<[number, number] | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handleExportImage = useCallback(async () => {
    if (!chartRef.current) return;

    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
      });

      const link = document.createElement("a");
      link.download = `chart-${title || "export"}-${Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();

      toast({
        title: "Chart exported",
        description: "Chart has been saved as an image",
      });
    } catch (error) {
      console.error("Failed to export chart:", error);
      toast({
        title: "Export failed",
        description: "Could not export chart as image",
        variant: "destructive",
      });
    }
  }, [title, toast]);

  const handleZoomIn = useCallback(() => {
    if (!data.length) return;
    const currentStart = zoomDomain?.[0] ?? 0;
    const currentEnd = zoomDomain?.[1] ?? data.length - 1;
    const range = currentEnd - currentStart;
    const newRange = Math.max(5, Math.floor(range * 0.7));
    const center = Math.floor((currentStart + currentEnd) / 2);
    const newStart = Math.max(0, center - Math.floor(newRange / 2));
    const newEnd = Math.min(data.length - 1, newStart + newRange);
    setZoomDomain([newStart, newEnd]);
  }, [data, zoomDomain]);

  const handleZoomOut = useCallback(() => {
    if (!data.length) return;
    const currentStart = zoomDomain?.[0] ?? 0;
    const currentEnd = zoomDomain?.[1] ?? data.length - 1;
    const range = currentEnd - currentStart;
    const newRange = Math.min(data.length, Math.floor(range * 1.5));
    const center = Math.floor((currentStart + currentEnd) / 2);
    const newStart = Math.max(0, center - Math.floor(newRange / 2));
    const newEnd = Math.min(data.length - 1, newStart + newRange);
    setZoomDomain([newStart, newEnd]);
  }, [data, zoomDomain]);

  const handleResetZoom = useCallback(() => {
    setZoomDomain(null);
  }, []);

  const chartHeight = isExpanded ? 500 : height;

  const displayData = zoomDomain
    ? data.slice(zoomDomain[0], zoomDomain[1] + 1)
    : data;

  const combinedData = showComparison && comparisonData
    ? displayData.map((d, i) => ({
        ...d,
        ...Object.keys(comparisonData[i] || {}).reduce((acc, key) => {
          if (key !== xAxisKey) {
            acc[`${key}_comparison`] = comparisonData[i]?.[key];
          }
          return acc;
        }, {} as Record<string, any>),
      }))
    : displayData;

  const renderChart = () => {
    const commonProps = {
      data: combinedData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
      onClick: onDataPointClick ? (e: any) => onDataPointClick(e.activePayload?.[0]?.payload) : undefined,
    };

    const xAxis = (
      <XAxis
        dataKey={xAxisKey}
        tickFormatter={xAxisFormatter}
        tick={{ fontSize: 12 }}
      />
    );

    const yAxis = (
      <YAxis
        label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: "insideLeft" } : undefined}
        tickFormatter={yAxisFormatter}
        tick={{ fontSize: 12 }}
      />
    );

    const grid = <CartesianGrid strokeDasharray="3 3" opacity={0.3} />;
    const legend = <Legend />;
    const tooltip = customTooltip ? <Tooltip content={customTooltip} /> : <Tooltip />;

    switch (type) {
      case "area":
        return (
          <AreaChart {...commonProps}>
            {grid}
            {xAxis}
            {yAxis}
            {tooltip}
            {legend}
            {series.map((s) => (
              <Area
                key={s.dataKey}
                type="monotone"
                dataKey={s.dataKey}
                name={s.name}
                stroke={s.color}
                fill={s.fill || s.color}
                fillOpacity={0.3}
                strokeWidth={s.strokeWidth || 2}
              />
            ))}
            {showComparison && series.map((s) => (
              <Area
                key={`${s.dataKey}_comparison`}
                type="monotone"
                dataKey={`${s.dataKey}_comparison`}
                name={`${s.name} (Comparison)`}
                stroke={s.color}
                fill={s.fill || s.color}
                fillOpacity={0.1}
                strokeWidth={s.strokeWidth || 2}
                strokeDasharray="5 5"
              />
            ))}
            {enableZoom && <Brush dataKey={xAxisKey} height={30} stroke="#8884d8" />}
          </AreaChart>
        );

      case "bar":
        return (
          <BarChart {...commonProps}>
            {grid}
            {xAxis}
            {yAxis}
            {tooltip}
            {legend}
            {series.map((s) => (
              <Bar
                key={s.dataKey}
                dataKey={s.dataKey}
                name={s.name}
                fill={s.color}
              />
            ))}
            {showComparison && series.map((s) => (
              <Bar
                key={`${s.dataKey}_comparison`}
                dataKey={`${s.dataKey}_comparison`}
                name={`${s.name} (Comparison)`}
                fill={s.color}
                fillOpacity={0.5}
              />
            ))}
          </BarChart>
        );

      default:
        return (
          <LineChart {...commonProps}>
            {grid}
            {xAxis}
            {yAxis}
            {tooltip}
            {legend}
            {series.map((s) => (
              <Line
                key={s.dataKey}
                type="monotone"
                dataKey={s.dataKey}
                name={s.name}
                stroke={s.color}
                strokeWidth={s.strokeWidth || 2}
                dot={{ r: 3 }}
                activeDot={{ r: 6 }}
              />
            ))}
            {showComparison && series.map((s) => (
              <Line
                key={`${s.dataKey}_comparison`}
                type="monotone"
                dataKey={`${s.dataKey}_comparison`}
                name={`${s.name} (Comparison)`}
                stroke={s.color}
                strokeWidth={s.strokeWidth || 2}
                strokeDasharray="5 5"
                dot={{ r: 3 }}
                activeDot={{ r: 6 }}
              />
            ))}
            {enableZoom && <Brush dataKey={xAxisKey} height={30} stroke="#8884d8" />}
          </LineChart>
        );
    }
  };

  return (
    <Card ref={chartRef}>
      {title && (
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>{title}</CardTitle>
          <div className="flex items-center gap-2">
            {enableZoom && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomIn}
                  disabled={!data.length}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomOut}
                  disabled={!data.length}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetZoom}
                  disabled={!zoomDomain}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </>
            )}
            {enableComparison && comparisonData && (
              <Button
                variant={showComparison ? "default" : "ghost"}
                size="sm"
                onClick={() => setShowComparison(!showComparison)}
              >
                <GitCompare className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
            {enableExport && (
              <Button variant="ghost" size="sm" onClick={handleExportImage}>
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
      )}
      <CardContent>
        <ResponsiveContainer width="100%" height={chartHeight}>
          {renderChart()}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
