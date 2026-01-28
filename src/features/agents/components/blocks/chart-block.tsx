'use client';

import { ChartBlock } from '@/features/agents/lib/schemas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  Cell
} from 'recharts';

interface ChartBlockProps {
  block: ChartBlock;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export function ChartBlockComponent({ block }: ChartBlockProps) {
  const renderChart = () => {
    const commonProps = {
      data: block.data,
      margin: { top: 10, right: 30, left: 0, bottom: 0 },
    };

    switch (block.chartType) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey={block.xAxisKey} />
            <YAxis />
            <Tooltip
              contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
              itemStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Legend />
            {block.series.map((s, i) => (
              <Line
                key={s.dataKey}
                type="monotone"
                dataKey={s.dataKey}
                stroke={s.color || COLORS[i % COLORS.length]}
                name={s.name || s.dataKey}
              />
            ))}
          </LineChart>
        );
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey={block.xAxisKey} />
            <YAxis />
            <Tooltip
              contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
              itemStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Legend />
            {block.series.map((s, i) => (
              <Bar
                key={s.dataKey}
                dataKey={s.dataKey}
                fill={s.color || COLORS[i % COLORS.length]}
                name={s.name || s.dataKey}
                stackId={s.stackId}
              />
            ))}
          </BarChart>
        );
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey={block.xAxisKey} />
            <YAxis />
            <Tooltip
              contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
              itemStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Legend />
            {block.series.map((s, i) => (
              <Area
                key={s.dataKey}
                type="monotone"
                dataKey={s.dataKey}
                fill={s.color || COLORS[i % COLORS.length]}
                stroke={s.color || COLORS[i % COLORS.length]}
                name={s.name || s.dataKey}
                stackId={s.stackId}
              />
            ))}
          </AreaChart>
        );
      case 'composed':
        return (
          <ComposedChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey={block.xAxisKey} />
            <YAxis />
            <Tooltip
              contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
              itemStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Legend />
            {block.series.map((s, i) => {
              if (s.type === 'bar') {
                return (
                  <Bar
                    key={s.dataKey}
                    dataKey={s.dataKey}
                    fill={s.color || COLORS[i % COLORS.length]}
                    name={s.name || s.dataKey}
                    stackId={s.stackId}
                  />
                );
              }
              if (s.type === 'area') {
                return (
                  <Area
                    key={s.dataKey}
                    type="monotone"
                    dataKey={s.dataKey}
                    fill={s.color || COLORS[i % COLORS.length]}
                    stroke={s.color || COLORS[i % COLORS.length]}
                    name={s.name || s.dataKey}
                    stackId={s.stackId}
                  />
                );
              }
              return (
                <Line
                  key={s.dataKey}
                  type="monotone"
                  dataKey={s.dataKey}
                  stroke={s.color || COLORS[i % COLORS.length]}
                  name={s.name || s.dataKey}
                />
              );
            })}
          </ComposedChart>
        );
      case 'pie':
        return (
          <PieChart>
            <Tooltip
              contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
              itemStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Legend />
            {block.series.map((s, i) => (
              <Pie
                key={s.dataKey}
                data={block.data}
                dataKey={s.dataKey}
                nameKey={block.xAxisKey}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill={s.color || COLORS[i % COLORS.length]}
                label
              >
                {block.data.map((entry, index) => (
                  <Cell key={`cell-${index}-${entry.name || index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            ))}
          </PieChart>
        );
      default:
        return <div>Unsupported chart type</div>;
    }
  };

  return (
    <Card className="mb-6">
      {block.title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{block.title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
