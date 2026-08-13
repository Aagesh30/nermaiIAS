import React from 'react';
import { cn } from '../../core/utils/cn';
import { EmptyState } from './EmptyState';
import { TableSkeleton } from './Skeleton';

export interface ColumnDef<T> {
  header: React.ReactNode;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  isLoading?: boolean;
  emptyState?: {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: {
      label: string;
      onClick: () => void;
      icon?: React.ReactNode;
    };
  };
  className?: string;
  onRowClick?: (item: T) => void;
}

export function DataTable<T>({
  columns,
  data,
  isLoading,
  emptyState,
  className,
  onRowClick,
}: DataTableProps<T>) {
  if (isLoading) {
    return <TableSkeleton rows={5} />;
  }

  if (!data || data.length === 0) {
    if (emptyState) {
      return (
        <EmptyState
          title={emptyState.title}
          description={emptyState.description}
          icon={emptyState.icon}
          action={emptyState.action}
          className="my-4"
        />
      );
    }
    return (
      <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-border text-textSecondary">
        No data available.
      </div>
    );
  }

  return (
    <div className={cn('w-full overflow-auto rounded-xl border border-border bg-surface', className)}>
      <table className="w-full caption-bottom text-sm">
        <thead className="bg-surfaceHighlight [&_tr]:border-b [&_tr]:border-border">
          <tr>
            {columns.map((col, idx) => (
              <th
                key={idx}
                className={cn(
                  'h-12 px-4 text-left align-middle font-semibold text-textSecondary',
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">
          {data.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              onClick={() => onRowClick && onRowClick(row)}
              className={cn(
                'border-b border-border transition-colors hover:bg-surfaceHighlight/50',
                onRowClick && 'cursor-pointer'
              )}
            >
              {columns.map((col, colIndex) => (
                <td key={colIndex} className={cn('p-4 align-middle', col.className)}>
                  {col.cell
                    ? col.cell(row)
                    : col.accessorKey
                    ? (row[col.accessorKey] as React.ReactNode)
                    : null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
