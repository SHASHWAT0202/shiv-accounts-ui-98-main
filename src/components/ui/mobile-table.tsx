import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";

interface TableRow {
  [key: string]: unknown;
}

interface TableColumn {
  key: string;
  label: string;
  render?: (value: unknown, row: TableRow) => React.ReactNode;
  mobile?: boolean; // Show on mobile
  priority?: 'high' | 'medium' | 'low'; // Display priority
}

interface MobileTableProps {
  data: TableRow[];
  columns: TableColumn[];
  onRowClick?: (row: TableRow) => void;
  expandable?: boolean;
  loading?: boolean;
  emptyMessage?: string;
}

export const MobileTable: React.FC<MobileTableProps> = ({
  data,
  columns,
  onRowClick,
  expandable = false,
  loading = false,
  emptyMessage = "No data available",
}) => {
  const [expandedRows, setExpandedRows] = React.useState<Set<number>>(new Set());
  
  const toggleRowExpansion = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  // Separate columns by priority for mobile display
  const highPriorityColumns = columns.filter(col => 
    col.priority === 'high' || (col.mobile !== false && col.priority !== 'low')
  );
  
  const lowPriorityColumns = columns.filter(col => 
    col.priority === 'low' || col.mobile === false
  );

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {data.map((row, index) => {
        const isExpanded = expandedRows.has(index);
        
        return (
          <Card 
            key={index}
            className={cn(
              "transition-all duration-200",
              onRowClick && "cursor-pointer hover:shadow-md",
              isExpanded && "shadow-md"
            )}
            onClick={() => onRowClick?.(row)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  {/* High priority columns - always visible */}
                  <div className="space-y-1">
                    {highPriorityColumns.slice(0, 2).map((column) => {
                      const value = row[column.key];
                      const displayValue = column.render ? column.render(value, row) : value;
                      
                      return (
                        <div key={column.key} className="flex items-center justify-between">
                          <span className="text-sm font-medium text-muted-foreground">
                            {column.label}:
                          </span>
                          <span className="text-sm font-semibold truncate ml-2">
                            {displayValue as React.ReactNode}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* Expand/collapse button */}
                {(expandable || lowPriorityColumns.length > 0) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2 h-8 w-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleRowExpansion(index);
                    }}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            
            {/* Expanded content */}
            {isExpanded && (
              <CardContent className="pt-0">
                <div className="border-t border-gray-100 pt-3 space-y-2">
                  {/* Remaining high priority columns */}
                  {highPriorityColumns.slice(2).map((column) => {
                    const value = row[column.key];
                    const displayValue = column.render ? column.render(value, row) : value;
                    
                    return (
                      <div key={column.key} className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {column.label}:
                        </span>
                        <span className="text-sm font-medium">
                          {displayValue as React.ReactNode}
                        </span>
                      </div>
                    );
                  })}
                  
                  {/* Low priority columns */}
                  {lowPriorityColumns.map((column) => {
                    const value = row[column.key];
                    const displayValue = column.render ? column.render(value, row) : value;
                    
                    return (
                      <div key={column.key} className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {column.label}:
                        </span>
                        <span className="text-sm">
                          {displayValue as React.ReactNode}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
};

interface ListItem {
  id: string | number;
  title: string;
  subtitle?: string;
  meta?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}

// Alternative list view for very simple data
interface MobileListProps {
  items: ListItem[];
  onItemClick?: (item: ListItem) => void;
  loading?: boolean;
}

export const MobileList: React.FC<MobileListProps> = ({
  items,
  onItemClick,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-3 p-3 animate-pulse">
            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-1">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            "flex items-center space-x-3 p-3 rounded-lg transition-colors",
            onItemClick && "cursor-pointer hover:bg-accent active:bg-accent/80 touch-manipulation"
          )}
          onClick={() => onItemClick?.(item)}
        >
          {/* Icon */}
          {item.icon && (
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-primary/10">
              {item.icon}
            </div>
          )}
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium truncate">{item.title}</h4>
              {item.badge && (
                <div className="flex-shrink-0 ml-2">
                  {item.badge}
                </div>
              )}
            </div>
            
            {item.subtitle && (
              <p className="text-sm text-muted-foreground truncate">
                {item.subtitle}
              </p>
            )}
            
            {item.meta && (
              <p className="text-xs text-muted-foreground mt-1">
                {item.meta}
              </p>
            )}
          </div>
          
          {/* Actions */}
          {item.actions && (
            <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              {item.actions}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};