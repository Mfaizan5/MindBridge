"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FormField, controlA11y } from "@/components/common/form-field";
import { Notice } from "@/components/common/notice";
import { PageHeader } from "@/components/common/page-header";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  resourceFormSchema,
  type ResourceFormValues,
} from "@/lib/schemas/admin";
import { useStore } from "@/lib/store";
import { RESOURCE_CATEGORIES, type Resource } from "@/lib/types";
import { formatDate } from "@/lib/validation";

// Wellness resource management (SCR-17). Every resource needs a source. Unpublished drafts are hidden from students.

const blank: ResourceFormValues = {
  title: "",
  category: "Stress",
  summary: "",
  body: "",
  source: "",
  readingMinutes: 3,
  published: false,
};

const fromResource = (r: Resource): ResourceFormValues => ({
  title: r.title,
  category: r.category,
  summary: r.summary,
  body: r.body.join("\n\n"),
  source: r.source,
  readingMinutes: r.readingMinutes,
  published: r.published,
});

export default function AdminResourcesPage() {
  const { data, actions } = useStore();
  const [editing, setEditing] = useState<Resource | "new" | null>(null);
  const [notice, setNotice] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  const form = useForm<ResourceFormValues>({
    resolver: zodResolver(resourceFormSchema),
    defaultValues: blank,
  });
  const { register, handleSubmit, reset, formState, control } = form;
  const errors = formState.errors;

  const open = (target: Resource | "new") => {
    setEditing(target);
    setNotice(null);
    reset(target === "new" ? blank : fromResource(target));
  };

  const save = handleSubmit((values) => {
    const body = values.body
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
    const result = actions.saveResource({
      id: editing && editing !== "new" ? editing.id : undefined,
      title: values.title,
      category: values.category,
      summary: values.summary,
      body,
      source: values.source,
      readingMinutes: values.readingMinutes,
      published: values.published,
    });
    if (result.ok) {
      setNotice({ tone: "success", text: "Resource saved." });
      setEditing(null);
    } else {
      setNotice({ tone: "error", text: result.error });
    }
  });

  return (
    <>
      <PageHeader
        title="Resources"
        description="Create and edit wellness resources. Each one needs a named source. Drafts stay hidden from students."
        action={
          <Button onClick={() => open("new")}>
            <Plus className="size-4" aria-hidden="true" />
            New resource
          </Button>
        }
      />

      {notice && (
        <div className="mb-6">
          <Notice tone={notice.tone === "error" ? "error" : "success"}>
            {notice.text}
          </Notice>
        </div>
      )}

      {editing && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>
              {editing === "new" ? "New resource" : "Edit resource"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={save}
              noValidate
              className="grid gap-5 sm:grid-cols-2"
            >
              <FormField
                id="title"
                label="Title"
                className="sm:col-span-2"
                error={errors.title?.message}
              >
                <Input
                  {...register("title")}
                  {...controlA11y("title", errors.title?.message)}
                />
              </FormField>
              <FormField
                id="category"
                label="Category"
                error={errors.category?.message}
              >
                <select
                  id="category"
                  className="min-h-11 rounded-xl border border-input bg-white px-3"
                  {...register("category")}
                >
                  {RESOURCE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField
                id="readingMinutes"
                label="Reading time (minutes)"
                error={errors.readingMinutes?.message}
              >
                <Input
                  type="number"
                  min={1}
                  max={60}
                  {...register("readingMinutes", { valueAsNumber: true })}
                  {...controlA11y(
                    "readingMinutes",
                    errors.readingMinutes?.message,
                  )}
                />
              </FormField>
              <FormField
                id="summary"
                label="Short summary"
                className="sm:col-span-2"
                error={errors.summary?.message}
              >
                <Textarea
                  rows={2}
                  {...register("summary")}
                  {...controlA11y("summary", errors.summary?.message)}
                />
              </FormField>
              <FormField
                id="body"
                label="Body"
                hint="Separate paragraphs with a blank line."
                className="sm:col-span-2"
                error={errors.body?.message}
              >
                <Textarea
                  rows={6}
                  {...register("body")}
                  {...controlA11y("body", errors.body?.message)}
                />
              </FormField>
              <FormField
                id="source"
                label="Source"
                hint="Who wrote or reviewed this? Required."
                className="sm:col-span-2"
                error={errors.source?.message}
              >
                <Input
                  {...register("source")}
                  {...controlA11y("source", errors.source?.message)}
                />
              </FormField>
              <div className="flex min-h-11 items-center gap-3 sm:col-span-2">
                <Controller
                  control={control}
                  name="published"
                  render={({ field }) => (
                    <Checkbox
                      id="published"
                      checked={field.value}
                      onCheckedChange={(checked) =>
                        field.onChange(checked === true)
                      }
                    />
                  )}
                />
                <Label htmlFor="published">Published to students</Label>
              </div>
              <div className="flex flex-wrap gap-3 sm:col-span-2">
                <Button type="submit" disabled={formState.isSubmitting}>
                  Save resource
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <ul className="space-y-3">
        {[...data.resources]
          .sort((a, b) => a.title.localeCompare(b.title))
          .map((resource) => (
            <li key={resource.id}>
              <Card>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
                  <div className="space-y-1">
                    <p className="font-semibold">{resource.title}</p>
                    <p className="text-sm text-navy-soft">
                      {resource.category} · {resource.source} · updated{" "}
                      {formatDate(resource.updatedAt.slice(0, 10))}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={resource.published ? "secondary" : "outline"}
                    >
                      {resource.published ? "Published" : "Draft"}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => open(resource)}
                    >
                      <Pencil className="size-4" aria-hidden="true" />
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
      </ul>
    </>
  );
}
