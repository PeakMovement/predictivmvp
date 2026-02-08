import { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export interface DocumentSearchFilters {
  query?: string;
  documentType?: 'all' | 'nutrition' | 'medical' | 'training';
  processingStatus?: 'all' | 'pending' | 'processing' | 'completed' | 'failed';
  dateFrom?: Date;
  dateTo?: Date;
}

interface DocumentSearchFiltersProps {
  filters: DocumentSearchFilters;
  onFiltersChange: (filters: DocumentSearchFilters) => void;
  onClearFilters: () => void;
}

export function DocumentSearchFilters({
  filters,
  onFiltersChange,
  onClearFilters,
}: DocumentSearchFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleQueryChange = (query: string) => {
    onFiltersChange({ ...filters, query });
  };

  const handleTypeChange = (documentType: string) => {
    onFiltersChange({
      ...filters,
      documentType: documentType as DocumentSearchFilters['documentType']
    });
  };

  const handleStatusChange = (processingStatus: string) => {
    onFiltersChange({
      ...filters,
      processingStatus: processingStatus as DocumentSearchFilters['processingStatus']
    });
  };

  const handleDateFromChange = (date: Date | undefined) => {
    onFiltersChange({ ...filters, dateFrom: date });
  };

  const handleDateToChange = (date: Date | undefined) => {
    onFiltersChange({ ...filters, dateTo: date });
  };

  const activeFilterCount = [
    filters.documentType && filters.documentType !== 'all',
    filters.processingStatus && filters.processingStatus !== 'all',
    filters.dateFrom,
    filters.dateTo,
  ].filter(Boolean).length;

  const hasActiveFilters = filters.query || activeFilterCount > 0;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents by name, tags, or content..."
            value={filters.query || ''}
            onChange={(e) => handleQueryChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Popover open={showAdvanced} onOpenChange={setShowAdvanced}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="relative">
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <Badge
                  variant="default"
                  className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Advanced Filters</h4>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onClearFilters();
                      setShowAdvanced(false);
                    }}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear All
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label>Document Type</Label>
                <Select
                  value={filters.documentType || 'all'}
                  onValueChange={handleTypeChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="nutrition">Nutrition Plans</SelectItem>
                    <SelectItem value="medical">Medical Records</SelectItem>
                    <SelectItem value="training">Training Programs</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Processing Status</Label>
                <Select
                  value={filters.processingStatus || 'all'}
                  onValueChange={handleStatusChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date Range</Label>
                <div className="space-y-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        {filters.dateFrom ? format(filters.dateFrom, 'PPP') : 'From date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.dateFrom}
                        onSelect={handleDateFromChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        {filters.dateTo ? format(filters.dateTo, 'PPP') : 'To date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.dateTo}
                        onSelect={handleDateToChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClearFilters}
            title="Clear all filters"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.query && (
            <Badge variant="secondary" className="gap-1">
              Search: "{filters.query}"
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleQueryChange('')}
              />
            </Badge>
          )}
          {filters.documentType && filters.documentType !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Type: {filters.documentType}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleTypeChange('all')}
              />
            </Badge>
          )}
          {filters.processingStatus && filters.processingStatus !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Status: {filters.processingStatus}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleStatusChange('all')}
              />
            </Badge>
          )}
          {filters.dateFrom && (
            <Badge variant="secondary" className="gap-1">
              From: {format(filters.dateFrom, 'MMM d, yyyy')}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleDateFromChange(undefined)}
              />
            </Badge>
          )}
          {filters.dateTo && (
            <Badge variant="secondary" className="gap-1">
              To: {format(filters.dateTo, 'MMM d, yyyy')}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleDateToChange(undefined)}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
