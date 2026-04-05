/**
 * All loading states in Predictiv. use the hairline sweep.
 * No skeletons, no spinners, no pulsing shapes.
 */

const HairlineSweep = ({ width = "w-24" }: { width?: string }) => (
  <div className={`${width} h-px overflow-hidden`}>
    <div className="h-px w-full bg-coldBlue animate-hairline-sweep" />
  </div>
);

const LoadingContainer = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-col items-center justify-center py-16 gap-4">
    {children}
  </div>
);

export const CardSkeleton = () => (
  <LoadingContainer>
    <HairlineSweep />
  </LoadingContainer>
);

export const MetricCardSkeleton = () => (
  <div className="flex items-center justify-center py-8">
    <HairlineSweep width="w-16" />
  </div>
);

export const ChartSkeleton = () => (
  <LoadingContainer>
    <HairlineSweep width="w-32" />
  </LoadingContainer>
);

export const ListItemSkeleton = () => (
  <div className="flex items-center justify-center py-4">
    <HairlineSweep width="w-16" />
  </div>
);

export const TableRowSkeleton = () => (
  <div className="flex items-center justify-center py-3">
    <HairlineSweep width="w-20" />
  </div>
);

export const DashboardSkeleton = () => (
  <LoadingContainer>
    <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-muted-foreground/60">Loading dashboard</p>
    <HairlineSweep width="w-32" />
  </LoadingContainer>
);

export const HealthPageSkeleton = () => (
  <LoadingContainer>
    <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-muted-foreground/60">Loading health data</p>
    <HairlineSweep width="w-32" />
  </LoadingContainer>
);

export const TableSkeleton = ({ rows: _rows = 5 }: { rows?: number }) => (
  <LoadingContainer>
    <HairlineSweep width="w-24" />
  </LoadingContainer>
);

export const FormSkeleton = () => (
  <LoadingContainer>
    <HairlineSweep width="w-24" />
  </LoadingContainer>
);

export const ProfileSkeleton = () => (
  <LoadingContainer>
    <HairlineSweep width="w-24" />
  </LoadingContainer>
);

export const InsightsSkeleton = () => (
  <LoadingContainer>
    <HairlineSweep width="w-24" />
  </LoadingContainer>
);

export const PageHeaderSkeleton = () => (
  <div className="flex items-center justify-center py-4">
    <HairlineSweep width="w-20" />
  </div>
);

export const FullPageLoader = () => (
  <div className="min-h-screen flex flex-col items-center justify-center">
    <div className="w-32 h-px overflow-hidden">
      <div className="h-px w-full bg-coldBlue animate-hairline-sweep" />
    </div>
  </div>
);
