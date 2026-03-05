import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export const CardSkeleton = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2 mt-2" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-32 w-full" />
    </CardContent>
  </Card>
);

export const MetricCardSkeleton = () => (
  <Card>
    <CardHeader className="pb-3">
      <Skeleton className="h-4 w-24" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-8 w-20 mb-2" />
      <Skeleton className="h-3 w-32" />
    </CardContent>
  </Card>
);

export const ChartSkeleton = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-4 w-56 mt-2" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-64 w-full" />
    </CardContent>
  </Card>
);

export const ListItemSkeleton = () => (
  <div className="flex items-center space-x-4 p-4">
    <Skeleton className="h-12 w-12 rounded-full" />
    <div className="space-y-2 flex-1">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  </div>
);

export const TableRowSkeleton = () => (
  <div className="flex items-center space-x-4 p-4 border-b">
    <Skeleton className="h-4 w-24" />
    <Skeleton className="h-4 w-32" />
    <Skeleton className="h-4 w-40 flex-1" />
    <Skeleton className="h-4 w-16" />
  </div>
);

export const DashboardSkeleton = () => (
  <div className="space-y-6 p-6">
    <div className="space-y-2">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCardSkeleton />
      <MetricCardSkeleton />
      <MetricCardSkeleton />
      <MetricCardSkeleton />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ChartSkeleton />
      <ChartSkeleton />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <CardSkeleton />
      <CardSkeleton />
    </div>
  </div>
);

export const HealthPageSkeleton = () => (
  <div className="space-y-6 p-6">
    <div className="space-y-2">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-80" />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <MetricCardSkeleton />
      <MetricCardSkeleton />
      <MetricCardSkeleton />
    </div>

    <ChartSkeleton />

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <ListItemSkeleton />
          <ListItemSkeleton />
          <ListItemSkeleton />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <ListItemSkeleton />
          <ListItemSkeleton />
          <ListItemSkeleton />
        </CardContent>
      </Card>
    </div>
  </div>
);

export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-40" />
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <TableRowSkeleton key={i} />
        ))}
      </div>
    </CardContent>
  </Card>
);

export const FormSkeleton = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-72 mt-2" />
    </CardHeader>
    <CardContent className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-24 w-full" />
      </div>
      <Skeleton className="h-10 w-32" />
    </CardContent>
  </Card>
);

export const ProfileSkeleton = () => (
  <div className="space-y-6 p-6">
    <div className="flex items-center space-x-4">
      <Skeleton className="h-24 w-24 rounded-full" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <FormSkeleton />
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <ListItemSkeleton />
          <ListItemSkeleton />
          <ListItemSkeleton />
          <ListItemSkeleton />
        </CardContent>
      </Card>
    </div>
  </div>
);

export const InsightsSkeleton = () => (
  <div className="space-y-4">
    {Array.from({ length: 3 }).map((_, i) => (
      <Card key={i}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-16" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-5/6" />
        </CardContent>
      </Card>
    ))}
  </div>
);

export const PageHeaderSkeleton = () => (
  <div className="space-y-2 mb-6">
    <Skeleton className="h-8 w-64" />
    <Skeleton className="h-4 w-96" />
  </div>
);

export const FullPageLoader = ({ message = "Loading..." }: { message?: string }) => (
  <div className="min-h-screen flex flex-col items-center justify-center p-4">
    <div className="space-y-4 text-center">
      <div className="relative w-16 h-16 mx-auto">
        <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
        <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
      </div>
      <p className="text-muted-foreground">{message}</p>
    </div>
  </div>
);
