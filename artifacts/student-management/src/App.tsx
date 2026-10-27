import { type ReactNode, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import {
  useCreateStudent, useDeleteStudent, useGetDashboardSummary,
  useGetStudent, useListStudents, useUpdateStudent,
  getGetDashboardSummaryQueryKey, getGetStudentQueryKey, getListStudentsQueryKey,
} from '@workspace/api-client-react';
import type { Student, StudentInput, StudentUpdate, StudentStatus } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { ArrowDownUp, ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, GraduationCap, LayoutDashboard, LoaderCircle, Plus, Search, SlidersHorizontal, Users, X } from 'lucide-react';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();
const statusOptions: StudentStatus[] = ['Active', 'Inactive', 'Graduated'];

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const title = location === '/' ? 'Overview' : location.startsWith('/students/') ? 'Student record' : 'Student directory';
  return <div className="min-h-[100dvh] bg-background text-foreground md:flex">
    <aside className="flex w-full flex-col bg-sidebar text-sidebar-foreground md:fixed md:inset-y-0 md:w-[246px]">
      <Link href="/" className="flex items-center gap-3 border-b border-sidebar-border px-6 py-5" data-testid="link-home">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground"><BookOpen size={21}/></span>
        <span><span className="block font-serif text-[17px] font-extrabold tracking-tight">Cedar Registry</span><span className="mt-0.5 block text-[10px] uppercase tracking-[.19em] text-sidebar-foreground/55">Student records</span></span>
      </Link>
      <div className="px-4 pt-6">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[.18em] text-sidebar-foreground/45">Workspace</p>
        <nav className="space-y-1">
          <Link href="/" data-testid="link-nav-overview" className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${location === '/' ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'}`}>
            <LayoutDashboard size={17} strokeWidth={1.8}/> Overview {location === '/' && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent"/>}
          </Link>
          <Link href="/students" data-testid="link-nav-students" className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${location.startsWith('/students') ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'}`}>
            <Users size={17} strokeWidth={1.8}/> Students {location.startsWith('/students') && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent"/>}
          </Link>
        </nav>
      </div>
      <div className="mt-auto hidden px-5 pb-5 md:block">
        <div className="rounded-xl border border-sidebar-border bg-white/[.035] p-4">
          <div className="mb-3 flex items-center gap-2 text-sidebar-primary"><GraduationCap size={17}/><span className="text-[11px] font-semibold uppercase tracking-[.12em]">Registrar desk</span></div>
          <p className="text-xs leading-relaxed text-sidebar-foreground/60">Keep every student record clear, current, and ready when it matters.</p>
          <div className="mt-4 flex items-center gap-2 border-t border-sidebar-border pt-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-sidebar-primary/20 text-[10px] font-bold text-sidebar-primary">RD</span><span className="text-xs font-medium">Records team</span><span className="ml-auto h-2 w-2 rounded-full bg-emerald-400"/></div>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-sidebar-border px-5 py-3 text-[10px] text-sidebar-foreground/45 md:hidden">
        <span>Registrar workspace</span><span>CEDAR • REGISTRY</span>
      </div>
    </aside>
    <div className="min-w-0 flex-1 md:ml-[246px]">
      <header className="sticky top-0 z-20 flex h-[62px] items-center justify-between border-b border-border/80 bg-background/95 px-5 backdrop-blur md:px-9">
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><span className="hidden sm:inline">Registrar</span><ChevronRight size={14} className="hidden sm:block"/><span className="font-semibold text-foreground">{title}</span></div>
        <div className="flex items-center gap-3"><span className="hidden text-xs text-muted-foreground sm:inline">Records are up to date</span><span className="h-2 w-2 rounded-full bg-emerald-600"/><span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-[11px] font-bold text-primary">RD</span></div>
      </header>
      <main className="page-enter mx-auto max-w-[1440px] px-4 py-6 md:px-9 md:py-8">{children}</main>
    </div>
  </div>;
}

function PageHeading({ eyebrow, title, text, children }: { eyebrow: string; title: string; text: string; children?: ReactNode }) {
  return <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div><p className="mb-2 text-[10px] font-bold uppercase tracking-[.2em] text-primary/65">{eyebrow}</p><h1 className="font-serif text-[28px] font-extrabold leading-tight tracking-[-.035em] text-foreground md:text-[34px]">{title}</h1><p className="mt-2 text-sm text-muted-foreground">{text}</p></div>
    {children}
  </div>;
}

function LoadingBlock({ rows = 3 }: { rows?: number }) {
  return <div className="space-y-3" aria-label="Loading records" data-testid="loading-state">{Array.from({ length: rows }, (_, i) => <div key={i} className="flex items-center gap-4 rounded-xl border border-border/60 bg-card px-5 py-4"><Skeleton className="h-9 w-9 rounded-full skeleton-shimmer"/><div className="flex-1 space-y-2"><Skeleton className="h-3 w-1/3 skeleton-shimmer"/><Skeleton className="h-2.5 w-1/2 skeleton-shimmer"/></div><Skeleton className="h-5 w-16 skeleton-shimmer"/></div>)}</div>;
}

function ErrorState({ onRetry, text = 'We could not load this information right now.' }: { onRetry: () => void; text?: string }) {
  return <div className="rounded-xl border border-dashed border-destructive/35 bg-destructive/[.035] px-6 py-10 text-center" data-testid="status-error">
    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive"><X size={18}/></div><p className="text-sm font-semibold">Something needs another try</p><p className="mt-1 text-xs text-muted-foreground">{text}</p><Button variant="outline" size="sm" className="mt-4" onClick={onRetry} data-testid="button-retry">Try again</Button>
  </div>;
}

function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-border bg-card/70 px-6 py-12 text-center" data-testid="status-empty"><div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary"><Users size={19}/></div><p className="text-sm font-semibold">{title}</p><p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">{text}</p>{action && <div className="mt-4">{action}</div>}</div>;
}

function initials(student: Pick<Student, 'firstName' | 'lastName'>) {
  return `${student.firstName?.[0] ?? ''}${student.lastName?.[0] ?? ''}`.toUpperCase();
}
const avatarTints = ['bg-[#e6eee8] text-[#32614e]', 'bg-[#f2e8d1] text-[#805f21]', 'bg-[#e7e9f1] text-[#485373]', 'bg-[#f1e3df] text-[#92564d]'];
function AvatarMark({ student, index = 0 }: { student: Pick<Student, 'firstName' | 'lastName'>; index?: number }) {
  return <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${avatarTints[index % avatarTints.length]}`} aria-hidden="true">{initials(student)}</span>;
}

function StatusBadge({ status }: { status: StudentStatus }) {
  const styles = status === 'Active' ? 'border-emerald-700/15 bg-emerald-700/[.08] text-emerald-800' : status === 'Graduated' ? 'border-primary/15 bg-primary/[.08] text-primary' : 'border-amber-700/15 bg-amber-700/[.08] text-amber-800';
  return <Badge variant="outline" className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${styles}`} data-testid={`status-student-${status.toLowerCase()}`}><span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${status === 'Active' ? 'bg-emerald-700' : status === 'Graduated' ? 'bg-primary' : 'bg-amber-700'}`}/>{status}</Badge>;
}

function dateLabel(date: string) {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date.slice(0, 10)}T00:00:00Z`));
}
function StudentLink({ student, index = 0 }: { student: Student; index?: number }) {
  return <Link href={`/students/${student.id}`} className="group flex min-w-0 items-center gap-3" data-testid={`link-student-${student.id}`}><AvatarMark student={student} index={index}/><span className="min-w-0"><span className="block truncate text-sm font-semibold text-foreground group-hover:text-primary">{student.firstName} {student.lastName}</span><span className="mt-0.5 block truncate font-mono text-[10px] text-muted-foreground">{student.studentId}</span></span></Link>;
}

function StudentFormDialog({ open, onOpenChange, student }: { open: boolean; onOpenChange: (open: boolean) => void; student?: Student }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const creating = !student;
  const createMutation = useCreateStudent();
  const updateMutation = useUpdateStudent();
  const form = useForm<StudentInput>({
    defaultValues: {
      firstName: student?.firstName ?? '', lastName: student?.lastName ?? '', email: student?.email ?? '',
      phone: student?.phone ?? '', program: student?.program ?? '', year: student?.year ?? 1,
      enrollmentDate: student?.enrollmentDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      status: student?.status ?? 'Active',
    },
  });
  const saving = createMutation.isPending || updateMutation.isPending;
  const invalidate = async (id?: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }),
      ...(id ? [queryClient.invalidateQueries({ queryKey: getGetStudentQueryKey(id) })] : []),
    ]);
  };
  const submit = (values: StudentInput) => {
    const payload: StudentInput = { ...values, phone: values.phone?.trim() || null, year: Number(values.year) };
    if (student) {
      const update: StudentUpdate = payload;
      updateMutation.mutate({ id: student.id, data: update }, {
        onSuccess: async () => { await invalidate(student.id); toast({ title: 'Student record updated' }); onOpenChange(false); },
        onError: () => toast({ title: 'Could not update record', description: 'Please try again in a moment.', variant: 'destructive' }),
      });
    } else {
      createMutation.mutate({ data: payload }, {
        onSuccess: async () => { await invalidate(); toast({ title: 'Student added to the directory' }); onOpenChange(false); form.reset(); },
        onError: () => toast({ title: 'Could not create record', description: 'Check the details and try again.', variant: 'destructive' }),
      });
    }
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-[610px]">
      <DialogHeader><p className="text-[10px] font-bold uppercase tracking-[.18em] text-primary/65">{creating ? 'New student record' : `Editing ${student?.studentId}`}</p><DialogTitle className="font-serif text-2xl font-extrabold">{creating ? 'Add a student' : 'Update student details'}</DialogTitle><DialogDescription>Enter the official details as they should appear in the student register.</DialogDescription></DialogHeader>
      <Form {...form}><form onSubmit={form.handleSubmit(submit)} className="mt-2 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {(['firstName', 'lastName', 'email', 'phone', 'program'] as const).map((name) => <FormField key={name} control={form.control} name={name} rules={{ required: name !== 'phone' ? 'This field is required' : false, ...(name === 'email' ? { pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' } } : {}) }} render={({ field }) => <FormItem className={name === 'email' || name === 'program' ? 'sm:col-span-2' : ''}><FormLabel>{name === 'firstName' ? 'First name' : name === 'lastName' ? 'Last name' : name === 'email' ? 'Email address' : name === 'phone' ? 'Phone (optional)' : 'Program'}</FormLabel><FormControl><Input {...field} value={field.value ?? ''} placeholder={name === 'email' ? 'student@cedar.edu' : name === 'phone' ? '+1 (555) 000-0000' : name === 'program' ? 'e.g. Environmental Studies' : ''} data-testid={`input-${name}`}/></FormControl><FormMessage/></FormItem>}/>)}
          <FormField control={form.control} name="year" rules={{ required: 'Choose a year', min: { value: 1, message: 'Year must be 1–8' }, max: { value: 8, message: 'Year must be 1–8' } }} render={({ field }) => <FormItem><FormLabel>Year of study</FormLabel><Select value={String(field.value)} onValueChange={(value) => field.onChange(Number(value))}><FormControl><SelectTrigger data-testid="select-year"><SelectValue placeholder="Select year"/></SelectTrigger></FormControl><SelectContent>{Array.from({ length: 8 }, (_, index) => <SelectItem key={index} value={String(index + 1)}>Year {index + 1}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>}/>
          <FormField control={form.control} name="enrollmentDate" rules={{ required: 'Enrollment date is required' }} render={({ field }) => <FormItem><FormLabel>Enrollment date</FormLabel><FormControl><Input type="date" {...field} data-testid="input-enrollment-date"/></FormControl><FormMessage/></FormItem>}/>
          <FormField control={form.control} name="status" render={({ field }) => <FormItem className="sm:col-span-2"><FormLabel>Enrollment status</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger data-testid="select-status"><SelectValue/></SelectTrigger></FormControl><SelectContent>{statusOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></FormItem>}/>
        </div>
        <div className="flex justify-end gap-2 border-t border-border pt-4"><Button type="button" variant="ghost" onClick={() => onOpenChange(false)} data-testid="button-cancel-student">Cancel</Button><Button type="submit" disabled={saving} data-testid="button-save-student">{saving && <LoaderCircle size={15} className="mr-2 animate-spin"/>}{creating ? 'Add student' : 'Save changes'}</Button></div>
      </form></Form>
    </DialogContent>
  </Dialog>;
}

function DeleteStudentDialog({ student, open, onOpenChange, onDeleted }: { student: Student | null; open: boolean; onOpenChange: (open: boolean) => void; onDeleted?: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const mutation = useDeleteStudent();
  const handleDelete = () => {
    if (!student) return;
    mutation.mutate({ id: student.id }, {
      onSuccess: async () => {
        await Promise.all([queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() }), queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }), queryClient.removeQueries({ queryKey: getGetStudentQueryKey(student.id) })]);
        toast({ title: 'Student record deleted' }); onOpenChange(false); onDeleted?.();
      },
      onError: () => toast({ title: 'Could not delete record', description: 'Please try again.', variant: 'destructive' }),
    });
  };
  return <AlertDialog open={open} onOpenChange={onOpenChange}><AlertDialogContent>
    <AlertDialogHeader><AlertDialogTitle className="font-serif text-xl">Delete this student record?</AlertDialogTitle><AlertDialogDescription>This will permanently remove <strong>{student?.firstName} {student?.lastName}</strong> ({student?.studentId}) from the directory. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
    <AlertDialogFooter><AlertDialogCancel data-testid="button-cancel-delete">Keep record</AlertDialogCancel><AlertDialogAction onClick={(event) => { event.preventDefault(); handleDelete(); }} disabled={mutation.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid="button-confirm-delete">{mutation.isPending ? 'Deleting…' : 'Delete record'}</AlertDialogAction></AlertDialogFooter>
  </AlertDialogContent></AlertDialog>;
}

function MetricCard({ label, value, note, tone, icon }: { label: string; value: number; note: string; tone: string; icon: ReactNode }) {
  return <Card className="overflow-hidden border-card-border bg-card shadow-sm shadow-primary/[.025]"><CardContent className="relative p-5 md:p-5"><div className={`absolute right-0 top-0 h-20 w-20 rounded-bl-[70px] opacity-[.08] ${tone}`}/><div className="flex items-start justify-between"><span className="text-[11px] font-semibold uppercase tracking-[.11em] text-muted-foreground">{label}</span><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tone} text-white`}>{icon}</span></div><div className="mt-4 flex items-baseline gap-2"><span className="font-serif text-[34px] font-extrabold tracking-[-.045em]" data-testid={`metric-${label.toLowerCase().replaceAll(' ', '-')}`}>{value.toLocaleString()}</span></div><p className="mt-1 text-[11px] text-muted-foreground">{note}</p></CardContent></Card>;
}

function Dashboard() {
  const { data, isLoading, isError, refetch } = useGetDashboardSummary();
  const [formOpen, setFormOpen] = useState(false);
  return <div>
    <PageHeading eyebrow="Registrar workspace" title="Student overview" text="A clear view of your student records and enrollment health.">
      <Button onClick={() => setFormOpen(true)} className="h-10 shadow-sm" data-testid="button-add-student"><Plus size={16} className="mr-2"/>Add student</Button>
    </PageHeading>
    {isLoading ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[135px] rounded-xl skeleton-shimmer"/>)}<div className="xl:col-span-4"><LoadingBlock rows={3}/></div></div> : isError || !data ? <ErrorState onRetry={() => refetch()}/> : <>
      <div className="mb-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total students" value={data.totalStudents} note="All records in the register" tone="bg-primary" icon={<Users size={16}/>}/>
        <MetricCard label="Active" value={data.activeStudents} note={data.totalStudents ? `${((data.activeStudents / data.totalStudents) * 100).toFixed(1)}% of enrolled students` : 'No active enrollment yet'} tone="bg-[#4d806b]" icon={<Check size={16}/>}/>
        <MetricCard label="Inactive" value={data.inactiveStudents} note="Records needing attention" tone="bg-[#bd9143]" icon={<SlidersHorizontal size={16}/>}/>
        <MetricCard label="Graduated" value={data.graduatedStudents} note="Completed their program" tone="bg-[#77829d]" icon={<GraduationCap size={16}/>}/>
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(310px,.85fr)]">
        <Card className="border-card-border bg-card shadow-sm shadow-primary/[.025]">
          <div className="flex items-center justify-between border-b border-border/80 px-5 py-4"><div><h2 className="font-serif text-[17px] font-bold">Recently added</h2><p className="mt-0.5 text-xs text-muted-foreground">The latest records entered into the register</p></div><Link href="/students" className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline" data-testid="link-view-directory">View directory <ArrowRight size={14}/></Link></div>
          {data.recentStudents.length ? <div className="divide-y divide-border/70">{data.recentStudents.slice(0, 6).map((student, index) => <div key={student.id} className="grid grid-cols-[minmax(0,1.35fr)_minmax(130px,1fr)_auto] items-center gap-3 px-5 py-3.5"><StudentLink student={student} index={index}/><span className="hidden truncate text-xs text-muted-foreground sm:block">{student.program}</span><StatusBadge status={student.status}/></div>)}</div> : <div className="p-5"><EmptyState title="No students added yet" text="Your newest student records will appear here as they are added." action={<Button size="sm" onClick={() => setFormOpen(true)} data-testid="button-empty-add"><Plus size={14} className="mr-1"/>Add first student</Button>}/></div>}
        </Card>
        <Card className="border-card-border bg-card shadow-sm shadow-primary/[.025]">
          <div className="border-b border-border/80 px-5 py-4"><h2 className="font-serif text-[17px] font-bold">Enrollment by program</h2><p className="mt-0.5 text-xs text-muted-foreground">Student distribution across programs</p></div>
          {data.byProgram.length ? <div className="space-y-5 px-5 py-5">{data.byProgram.slice(0, 7).map((item, index) => {
            const max = Math.max(...data.byProgram.map((entry) => entry.count), 1);
            const colors = ['bg-primary', 'bg-[#c69a50]', 'bg-[#59816e]', 'bg-[#77829d]', 'bg-[#b86d5e]', 'bg-[#5392a0]', 'bg-[#9a835f]'];
            return <div key={item.program} data-testid={`program-row-${index}`}><div className="mb-2 flex items-center justify-between gap-3"><span className="truncate text-xs font-medium">{item.program}</span><span className="font-mono text-[11px] text-muted-foreground">{item.count}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-secondary"><div className={`h-full rounded-full ${colors[index % colors.length]} transition-[width] duration-500`} style={{ width: `${Math.max((item.count / max) * 100, 3)}%` }}/></div></div>;
          })}</div> : <div className="p-5"><EmptyState title="No program data yet" text="Program distribution will appear once student records are added."/></div>}
          <div className="mx-5 mb-5 rounded-lg bg-secondary/65 px-4 py-3"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-muted-foreground">Enrollment health</p><div className="mt-2 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-700"/><span className="text-xs font-semibold">{data.totalStudents ? `${((data.activeStudents / data.totalStudents) * 100).toFixed(1)}% active` : 'No enrollment data'}</span><span className="ml-auto text-[10px] text-muted-foreground">Active student share</span></div></div>
        </Card>
      </div>
    </>}
    <StudentFormDialog open={formOpen} onOpenChange={setFormOpen}/>
  </div>;
}

function StudentDirectory() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [program, setProgram] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [deleteStudent, setDeleteStudent] = useState<Student | null>(null);
  const params = useMemo(() => ({ ...(search.trim() ? { q: search.trim() } : {}), ...(status !== 'all' ? { status: status as StudentStatus } : {}), ...(program !== 'all' ? { program } : {}) }), [search, status, program]);
  const { data: students, isLoading, isError, refetch } = useListStudents(params);
  const programs = useMemo(() => [...new Set((students ?? []).map((student) => student.program))].sort((a, b) => a.localeCompare(b)), [students]);
  const clearFilters = () => { setSearch(''); setStatus('all'); setProgram('all'); };
  return <div>
    <PageHeading eyebrow="Student records" title="Student directory" text="Search, review, and maintain the official student register.">
      <Button onClick={() => setFormOpen(true)} className="h-10" data-testid="button-add-student"><Plus size={16} className="mr-2"/>Add student</Button>
    </PageHeading>
    <Card className="mb-5 border-card-border bg-card shadow-sm shadow-primary/[.025]">
      <div className="grid gap-3 p-4 md:grid-cols-[minmax(220px,1fr)_190px_220px_auto] md:items-center">
        <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/><Input value={search} onChange={(event) => setSearch(event.target.value)} className="h-10 pl-9" placeholder="Search name, ID, or email" aria-label="Search students" data-testid="input-search-students"/></div>
        <Select value={status} onValueChange={setStatus}><SelectTrigger className="h-10" data-testid="select-filter-status"><SelectValue placeholder="All statuses"/></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{statusOptions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
        <Select value={program} onValueChange={setProgram}><SelectTrigger className="h-10" data-testid="select-filter-program"><SelectValue placeholder="All programs"/></SelectTrigger><SelectContent><SelectItem value="all">All programs</SelectItem>{programs.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
        <Button variant="ghost" className="h-10 text-muted-foreground" onClick={clearFilters} data-testid="button-clear-filters"><X size={14} className="mr-1.5"/>Clear</Button>
      </div>
    </Card>
    <Card className="overflow-hidden border-card-border bg-card shadow-sm shadow-primary/[.025]">
      <div className="flex items-center justify-between border-b border-border/80 px-5 py-3.5"><div><span className="text-sm font-semibold">All students</span><span className="ml-2 rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px] text-muted-foreground" data-testid="text-student-count">{students?.length ?? 0}</span></div><span className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><ArrowDownUp size={12}/> Recently updated</span></div>
      {isLoading ? <div className="p-4"><LoadingBlock rows={5}/></div> : isError ? <div className="p-5"><ErrorState onRetry={() => refetch()} text="The student directory is temporarily unavailable."/></div> : students?.length ? <div className="overflow-x-auto">
        <table className="w-full min-w-[770px] text-left">
          <thead><tr className="bg-secondary/45 text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground"><th className="px-5 py-3">Student</th><th className="px-4 py-3">Program / year</th><th className="px-4 py-3">Enrollment date</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
          <tbody className="divide-y divide-border/70">{students.map((student, index) => <DirectoryRow key={student.id} student={student} index={index} onDelete={setDeleteStudent}/>)}</tbody>
        </table>
      </div> : <div className="p-5"><EmptyState title={search || status !== 'all' || program !== 'all' ? 'No matching students' : 'Your directory is ready'} text={search || status !== 'all' || program !== 'all' ? 'Try adjusting the search terms or filters to find a student.' : 'Add the first student record to begin keeping your register up to date.'} action={search || status !== 'all' || program !== 'all' ? <Button variant="outline" size="sm" onClick={clearFilters} data-testid="button-empty-clear">Clear filters</Button> : <Button size="sm" onClick={() => setFormOpen(true)} data-testid="button-empty-add"><Plus size={14} className="mr-1"/>Add student</Button>}/></div>}
      {students?.length ? <div className="flex items-center justify-between border-t border-border/80 px-5 py-3"><span className="text-[11px] text-muted-foreground">Showing <strong className="text-foreground">{students.length}</strong> student{students.length === 1 ? '' : 's'}</span><span className="text-[10px] text-muted-foreground">Directory records</span></div> : null}
    </Card>
    <StudentFormDialog open={formOpen} onOpenChange={setFormOpen}/>
    <DeleteStudentDialog student={deleteStudent} open={!!deleteStudent} onOpenChange={(open) => !open && setDeleteStudent(null)}/>
  </div>;
}

function DirectoryRow({ student, index, onDelete }: { student: Student; index: number; onDelete: (student: Student) => void }) {
  const [editOpen, setEditOpen] = useState(false);
  return <>
    <tr className="group hover:bg-secondary/25" data-testid={`row-student-${student.id}`}>
      <td className="px-5 py-3.5"><StudentLink student={student} index={index}/><span className="mt-1.5 block pl-12 text-[11px] text-muted-foreground">{student.email}</span></td>
      <td className="px-4 py-3.5"><span className="block max-w-[230px] truncate text-xs font-medium">{student.program}</span><span className="mt-1 block text-[10px] text-muted-foreground">Year {student.year}</span></td>
      <td className="px-4 py-3.5 text-xs text-muted-foreground">{dateLabel(student.enrollmentDate)}</td>
      <td className="px-4 py-3.5"><StatusBadge status={student.status}/></td>
      <td className="px-4 py-3.5"><div className="flex justify-end gap-1"><Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs" onClick={() => setEditOpen(true)} data-testid={`button-edit-${student.id}`}>Edit</Button><Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs text-destructive hover:text-destructive" onClick={() => onDelete(student)} data-testid={`button-delete-${student.id}`}>Delete</Button><Link href={`/students/${student.id}`} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-primary" aria-label={`View ${student.firstName} ${student.lastName}`} data-testid={`link-view-${student.id}`}><ChevronRight size={16}/></Link></div></td>
    </tr>
    <StudentFormDialog open={editOpen} onOpenChange={setEditOpen} student={student}/>
  </>;
}

function StudentDetail({ params }: { params: { id: string } }) {
  const id = params.id;
  const { data: student, isLoading, isError, refetch } = useGetStudent(id, { query: { queryKey: getGetStudentQueryKey(id) } });
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [, setLocation] = useLocation();
  if (isLoading) return <div><div className="mb-6"><Skeleton className="mb-4 h-4 w-32 skeleton-shimmer"/><Skeleton className="h-9 w-72 skeleton-shimmer"/></div><LoadingBlock rows={4}/></div>;
  if (isError || !student) return <ErrorState onRetry={() => refetch()} text="We could not find this student record."/>;
  return <div>
    <Link href="/students" className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-primary" data-testid="link-back-directory"><ArrowLeft size={15}/> Back to directory</Link>
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4"><AvatarMark student={student} index={1}/><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-primary/65">Student record · <span className="font-mono">{student.studentId}</span></p><h1 className="mt-1 font-serif text-[28px] font-extrabold tracking-[-.035em]">{student.firstName} {student.lastName}</h1><p className="mt-1 text-xs text-muted-foreground">{student.program} <span className="mx-1.5">/</span> Year {student.year}</p></div></div>
      <div className="flex gap-2"><Button variant="outline" onClick={() => setEditOpen(true)} data-testid="button-edit-student"><span className="mr-2">Edit record</span></Button><Button variant="outline" className="border-destructive/25 text-destructive hover:bg-destructive/5 hover:text-destructive" onClick={() => setDeleteOpen(true)} data-testid="button-delete-student">Delete</Button></div>
    </div>
    <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-5 py-4 shadow-sm shadow-primary/[.025]"><StatusBadge status={student.status}/><span className="h-4 border-l border-border"/><span className="text-xs text-muted-foreground">Enrolled {dateLabel(student.enrollmentDate)}</span><span className="ml-auto text-[10px] text-muted-foreground">Record added {dateLabel(student.createdAt)}</span></div>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,.75fr)]">
      <Card className="border-card-border bg-card shadow-sm shadow-primary/[.025]"><div className="border-b border-border/80 px-5 py-4"><h2 className="font-serif text-base font-bold">Personal details</h2><p className="mt-1 text-xs text-muted-foreground">Contact information associated with this record</p></div><div className="grid gap-x-8 gap-y-6 p-5 sm:grid-cols-2"><DetailField label="First name" value={student.firstName}/><DetailField label="Last name" value={student.lastName}/><DetailField label="Email address" value={student.email}/><DetailField label="Phone number" value={student.phone || 'Not provided'}/></div></Card>
      <Card className="border-card-border bg-card shadow-sm shadow-primary/[.025]"><div className="border-b border-border/80 px-5 py-4"><h2 className="font-serif text-base font-bold">Enrollment details</h2><p className="mt-1 text-xs text-muted-foreground">Academic placement and record history</p></div><div className="space-y-5 p-5"><DetailField label="Student ID" value={student.studentId} mono/><DetailField label="Program" value={student.program}/><div className="grid grid-cols-2 gap-5"><DetailField label="Year of study" value={`Year ${student.year}`}/><DetailField label="Status" value={<StatusBadge status={student.status}/>}/></div><DetailField label="Enrollment date" value={dateLabel(student.enrollmentDate)}/></div></Card>
    </div>
    <StudentFormDialog open={editOpen} onOpenChange={setEditOpen} student={student}/>
    <DeleteStudentDialog student={student} open={deleteOpen} onOpenChange={setDeleteOpen} onDeleted={() => setLocation('/students')}/>
  </div>;
}

function DetailField({ label, value, mono = false }: { label: string; value: ReactNode; mono?: boolean }) {
  return <div><p className="mb-1.5 text-[10px] font-bold uppercase tracking-[.13em] text-muted-foreground">{label}</p><div className={`text-sm font-medium ${mono ? 'font-mono text-[12px]' : ''}`} data-testid={`field-${label.toLowerCase().replaceAll(' ', '-')}`}>{value}</div></div>;
}

function Router() {
  return <RoutedErrorBoundary><Shell><Switch>
    <Route path="/" component={Dashboard}/>
    <Route path="/students" component={StudentDirectory}/>
    <Route path="/students/:id">{(params) => <StudentDetail params={params}/>}</Route>
    <Route component={NotFound}/>
  </Switch></Shell></RoutedErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router/></WouterRouter><Toaster/></TooltipProvider></QueryClientProvider>;
}

export default App;
