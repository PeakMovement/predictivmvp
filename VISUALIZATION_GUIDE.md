# Data Visualization Enhancements Guide

This guide covers the new interactive visualization features added to the platform including interactive charts, sparklines, metrics dashboard, and goal tracking visualizations.

## Table of Contents

1. [Interactive Charts](#interactive-charts)
2. [Sparklines](#sparklines)
3. [Metrics Dashboard](#metrics-dashboard)
4. [Goal Progress Visualizations](#goal-progress-visualizations)
5. [Export & Sharing](#export--sharing)

---

## Interactive Charts

### Overview

The `InteractiveChart` component provides enhanced data visualization with:
- **Hover tooltips** with detailed data
- **Click interactions** for drill-down
- **Zoom and pan** controls for time series
- **Comparison overlays** to compare periods
- **Export as image** functionality

### Basic Usage

```tsx
import { InteractiveChart } from "@/components/charts/InteractiveChart";

const chartData = [
  { date: "Jan 1", hrv: 62, recovery: 78 },
  { date: "Jan 2", hrv: 65, recovery: 82 },
  // ...
];

<InteractiveChart
  title="Health Trends"
  data={chartData}
  series={[
    { dataKey: "hrv", name: "HRV (ms)", color: "#10b981", strokeWidth: 2 },
    { dataKey: "recovery", name: "Recovery Score", color: "#f59e0b", strokeWidth: 2 },
  ]}
  xAxisKey="date"
  type="line"
  height={300}
  enableZoom
  enableExport
  enableComparison
/>
```

### Features

#### Zoom Controls

- **Zoom In** button: Focus on specific time periods
- **Zoom Out** button: Expand view
- **Reset** button: Return to original view
- **Brush control**: Interactive selection at bottom of chart

#### Comparison Mode

Compare different time periods by providing `comparisonData`:

```tsx
<InteractiveChart
  data={currentWeekData}
  comparisonData={previousWeekData}
  enableComparison
  series={[...]}
/>
```

The comparison data appears as a dashed line overlay.

#### Export

Click the download icon to export the chart as a high-resolution PNG image.

#### Chart Types

- **Line**: Best for trends over time
- **Area**: Emphasizes magnitude of change
- **Bar**: Good for discrete comparisons

---

## Sparklines

### Overview

Sparklines are small, inline charts perfect for dashboards and metric cards. They show trends at a glance without taking up much space.

### Basic Usage

```tsx
import { Sparkline } from "@/components/charts/Sparkline";

const data = [
  { value: 60 },
  { value: 65 },
  { value: 62 },
  { value: 68 },
];

<Sparkline
  data={data}
  color="#3b82f6"
  height={40}
  type="line"
  showTrend
/>
```

### Metric Sparkline Card

Pre-built card component combining metrics with sparklines:

```tsx
import { MetricSparklineCard } from "@/components/charts/Sparkline";

<MetricSparklineCard
  label="Avg HRV"
  value="62"
  unit="ms"
  data={hrvData}
  color="#10b981"
  change={8.5}
  description="Last 30 days"
/>
```

### Features

- **Trend Indicator**: Shows percentage change with up/down arrows
- **Responsive**: Adapts to container width
- **Multiple Types**: Line or area charts
- **Color Coding**: Green for positive trends, red for negative

---

## Metrics Dashboard

### Overview

The Metrics Dashboard (`/metrics-dashboard`) provides a unified view of all health and training metrics in a customizable grid layout.

### Features

#### Filter by Category

- **All Metrics**: View everything
- **Sleep**: Sleep duration, efficiency, stages
- **Recovery**: HRV, resting heart rate, recovery score
- **Activity**: Steps, calories, active minutes
- **Training**: Training load, workout count

#### Time Range Selection

- Last 7 days
- Last 14 days
- Last 30 days
- Last 90 days

#### Sparkline Cards

Each metric displays:
- Current value
- Unit of measurement
- Trend line (sparkline)
- Percentage change from previous period
- Description/context

#### Interactive Charts

Below the metric cards, full-size interactive charts show:
- Multi-series health trends
- Sleep duration over time
- HRV trends
- All with zoom, pan, and export capabilities

#### Export Dashboard

Click the download icon in the header to export the entire dashboard as a high-resolution image.

### Access

Navigate to the Metrics Dashboard:
- URL: `/metrics-dashboard`
- Via navigation: Settings → Metrics Dashboard (coming soon)

---

## Goal Progress Visualizations

### Overview

New goal tracking visualizations make it easy to see progress, celebrate achievements, and stay motivated.

### Progress Ring

Circular progress indicator for goals:

```tsx
import { ProgressRing } from "@/components/goals/GoalProgress";

<ProgressRing
  progress={75}
  size="md"
  color="#3b82f6"
  showPercentage
/>
```

**Sizes**: `sm` (80px), `md` (120px), `lg` (160px)

### Goal Card

Complete goal visualization with progress ring, milestones, and status:

```tsx
import { GoalCard } from "@/components/goals/GoalProgress";

const goal = {
  id: "1",
  title: "Run 100 Miles",
  description: "Monthly running goal",
  target: 100,
  current: 75,
  unit: "miles",
  startDate: new Date("2026-02-01"),
  endDate: new Date("2026-02-28"),
  category: "Running",
  color: "#3b82f6",
  milestones: [
    { id: "1", title: "Quarter Way", value: 25, completed: true },
    { id: "2", title: "Halfway", value: 50, completed: true },
    { id: "3", title: "Three Quarters", value: 75, completed: true },
    { id: "4", title: "Complete!", value: 100, completed: false },
  ],
};

<GoalCard goal={goal} onComplete={(id) => console.log("Goal completed!", id)} />
```

**Features**:
- Progress ring with percentage
- Current vs target values
- Days remaining counter
- Milestone checklist
- Progress bar
- Completion celebration (confetti animation)

### Milestone Timeline

Horizontal timeline showing goal milestones:

```tsx
import { MilestoneTimeline } from "@/components/goals/GoalProgress";

<MilestoneTimeline goal={goal} />
```

**Features**:
- Visual progress line
- Milestone markers along timeline
- Checkmarks for completed milestones
- Start and end date labels
- Trophy icon at goal completion

### Goal History

Summary of completed goals and success rate:

```tsx
import { GoalHistory } from "@/components/goals/GoalProgress";

<GoalHistory goals={allGoals} />
```

**Displays**:
- Total goals count
- Completed goals count
- Success rate percentage
- Recent completions list

### Celebration Animations

When a goal reaches 100% completion:
- ✨ Confetti animation automatically triggers
- Green highlight on the goal card
- Trophy icon appears
- "Completed!" badge shown
- Optional callback (`onComplete`) fires

---

## Export & Sharing

### Export Chart as Image

**Interactive Charts**:
1. Click the download icon in chart header
2. Chart exports as PNG at 2x resolution
3. Filename: `chart-{title}-{timestamp}.png`

**Metrics Dashboard**:
1. Click download icon in dashboard header
2. Entire dashboard exports as single image
3. Includes all visible metrics and charts
4. Filename: `metrics-dashboard-{date}.png`

### Share Dashboard

To share your metrics dashboard:
1. Export dashboard as image
2. Share the PNG file via email, messaging, or social media
3. Or take a screenshot of specific sections

### Custom Screenshots

For custom exports:
1. Hide sections you don't want to share
2. Adjust time range and filters
3. Export the customized view

---

## Component API Reference

### InteractiveChart Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `ChartDataPoint[]` | required | Array of data points |
| `series` | `ChartSeries[]` | required | Series to display |
| `xAxisKey` | `string` | required | X-axis data key |
| `title` | `string` | - | Chart title |
| `type` | `"line" \| "area" \| "bar"` | `"line"` | Chart type |
| `height` | `number` | `300` | Height in pixels |
| `enableZoom` | `boolean` | `true` | Enable zoom controls |
| `enableExport` | `boolean` | `true` | Enable export button |
| `enableComparison` | `boolean` | `false` | Enable comparison mode |
| `comparisonData` | `ChartDataPoint[]` | - | Comparison data |
| `onDataPointClick` | `(data) => void` | - | Click handler |
| `xAxisFormatter` | `(value) => string` | - | Format X-axis labels |
| `yAxisFormatter` | `(value) => string` | - | Format Y-axis labels |

### Sparkline Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `SparklineDataPoint[]` | required | Array of values |
| `color` | `string` | `"#3b82f6"` | Line color |
| `height` | `number` | `40` | Height in pixels |
| `type` | `"line" \| "area"` | `"line"` | Chart type |
| `showTrend` | `boolean` | `false` | Show trend indicator |
| `strokeWidth` | `number` | `2` | Line width |

### ProgressRing Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `progress` | `number` | required | Progress 0-100 |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Ring size |
| `color` | `string` | `"#3b82f6"` | Ring color |
| `showPercentage` | `boolean` | `true` | Show percentage |
| `children` | `ReactNode` | - | Custom center content |

---

## Best Practices

### Chart Selection

- **Line charts**: Time series data, trends over time
- **Area charts**: Emphasize magnitude, cumulative values
- **Bar charts**: Discrete comparisons, categorical data

### Color Usage

- Use consistent colors across related metrics
- Green for positive/healthy indicators
- Red for negative/warning indicators
- Blue/purple for neutral metrics
- Avoid red-green only distinctions (accessibility)

### Sparklines

- Use in dashboard cards for quick insights
- Keep data points between 10-30 for readability
- Show trend percentage when relevant
- Pair with current value and unit

### Goals

- Set realistic milestones (4-6 per goal)
- Use descriptive milestone names
- Choose appropriate units
- Set time bounds (start/end dates)
- Celebrate completions!

### Performance

- Limit chart data to relevant time range
- Use sparklines for overview, detailed charts for analysis
- Export large dashboards in sections if needed
- Consider lazy loading for many charts

---

## Examples

### Health Dashboard

```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  <MetricSparklineCard
    label="HRV"
    value="62"
    unit="ms"
    data={hrvData}
    color="#10b981"
    change={8.5}
  />
  <MetricSparklineCard
    label="Sleep"
    value="7.2"
    unit="hours"
    data={sleepData}
    color="#8b5cf6"
    change={5.2}
  />
  <MetricSparklineCard
    label="Recovery"
    value="78"
    unit="/100"
    data={recoveryData}
    color="#f59e0b"
    change={4.7}
  />
</div>

<InteractiveChart
  title="Weekly Health Trends"
  data={weekData}
  series={[
    { dataKey: "hrv", name: "HRV", color: "#10b981" },
    { dataKey: "sleep", name: "Sleep", color: "#8b5cf6" },
  ]}
  xAxisKey="date"
  enableZoom
  enableExport
/>
```

### Training Goals

```tsx
<div className="space-y-6">
  <GoalCard
    goal={runningGoal}
    onComplete={(id) => {
      toast({ title: "Congratulations!", description: "You reached your goal!" });
    }}
  />

  <MilestoneTimeline goal={runningGoal} />

  <GoalHistory goals={completedGoals} />
</div>
```

---

## Troubleshooting

### Charts not displaying

- Check that data array is not empty
- Verify data structure matches expected format
- Ensure series dataKeys match data object keys

### Export not working

- Check browser console for errors
- Ensure html2canvas is loaded
- Try exporting smaller sections
- Check for CORS issues with images

### Animations not triggering

- Verify goal progress is >= 100
- Check that onComplete callback is provided
- Ensure canvas-confetti is loaded

### Performance issues

- Reduce number of data points
- Limit concurrent chart renders
- Use virtualization for long lists
- Consider pagination for large datasets

---

## Future Enhancements

Planned improvements:
- [ ] Custom dashboard layouts (drag & drop)
- [ ] More chart types (pie, radar, heatmap)
- [ ] Real-time data updates
- [ ] Advanced filtering and grouping
- [ ] Annotation support
- [ ] Collaborative sharing
- [ ] Mobile-optimized gestures
- [ ] Theme customization
- [ ] Data table views
- [ ] CSV export

---

## Support

For issues or questions:
- Check component documentation
- Review examples in codebase
- Test with sample data
- Check browser console for errors
