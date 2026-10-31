"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type TrendPoint = { date: string; [key: string]: string | number };
export type TrendSeries = { key: string; label: string; color: string };

// Line or bar trend with a text summary for screen readers, so the data is not only visual.
export function TrendChart({
  className,
  title,
  caption,
  summary,
  data,
  series,
  type = "line",
  yDomain,
  yTicks,
  yLabel,
  emptyText,
}: {
  className?: string;
  title: string;
  caption: string;
  summary: string;
  data: TrendPoint[];
  series: TrendSeries[];
  type?: "line" | "bar";
  yDomain?: [number, number] | ["auto", "auto"];
  yTicks?: number[];
  yLabel: string;
  emptyText: string;
}) {
  const primary = series[0];
  const Chart = type === "line" ? LineChart : BarChart;

  return (
    <Card className={className ?? "gap-4"}>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{caption}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.length === 0 ? (
          <p className="rounded-xl border border-dashed border-navy/25 p-6 text-center text-navy-soft">
            {emptyText}
          </p>
        ) : (
          <>
            <div
              role="img"
              aria-label={`${title}. ${summary}`}
              className="h-60 w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <Chart
                  data={data}
                  margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#17255422" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis
                    domain={yDomain}
                    ticks={yTicks}
                    tick={{ fontSize: 12 }}
                    width={44}
                    label={{
                      value: yLabel,
                      angle: -90,
                      position: "insideLeft",
                      fontSize: 12,
                      offset: 10,
                    }}
                  />
                  <Tooltip />
                  {type === "line"
                    ? series.map((s) => (
                        <Line
                          key={s.key}
                          type="monotone"
                          dataKey={s.key}
                          name={s.label}
                          stroke={s.color}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          isAnimationActive={false}
                        />
                      ))
                    : series.map((s) => (
                        <Bar
                          key={s.key}
                          dataKey={s.key}
                          name={s.label}
                          fill={s.color}
                          radius={[6, 6, 0, 0]}
                          isAnimationActive={false}
                        />
                      ))}
                </Chart>
              </ResponsiveContainer>
            </div>
            <p className="text-sm text-navy-soft">{summary}</p>
            <details className="text-sm">
              <summary className="cursor-pointer font-medium underline underline-offset-4">
                View the values as a list
              </summary>
              <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                {data.map((point) => (
                  <li key={point.date}>
                    {point.date}: {String(point[primary.key])}
                    {series.length > 1 && (
                      <span className="text-navy-soft">
                        {" "}
                        (
                        {series
                          .slice(1)
                          .map((s) => `${s.label} ${point[s.key]}`)
                          .join(", ")}
                        )
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          </>
        )}
      </CardContent>
    </Card>
  );
}
